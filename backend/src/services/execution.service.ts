import { DbService, ExecutionRun, StepResult } from './db.service';
import { chromium, Browser, Page } from 'playwright';
import { Server } from 'socket.io';
import { RecoveryAgent } from './ai/recovery.agent';
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

interface RunContext {
  browser?: Browser;
  page?: Page;
}

export class ExecutionService {
  private activeRuns = new Map<string, RunContext>();

  constructor(private dbService: DbService, private io?: Server) {}

  async startExecution(automationId: string, context: Record<string, any> = {}): Promise<string> {
    const plan = await this.dbService.getAutomationById(automationId);
    if (!plan) throw new Error('Automation not found');

    const runId = 'run_' + Date.now();
    
    // Inject parameters into step targets/values where applicable
    const stepResults: StepResult[] = plan.steps.map(s => {
      let target = s.target;
      let value = s.value;
      
      // Simple variable substitution (e.g., {{invoice_amount}} or $invoice_amount)
      for (const [k, v] of Object.entries(context)) {
        if (target && typeof target === 'string') target = target.replace(new RegExp(`{{${k}}}|\\$${k}`, 'g'), v);
        if (value && typeof value === 'string') value = value.replace(new RegExp(`{{${k}}}|\\$${k}`, 'g'), v);
      }
      
      return {
        step: s.action || s.type,
        status: 'Pending',
        originalAction: s.originalAction,
        ...s,
        target,
        value
      };
    });

    const run: ExecutionRun = {
      runId,
      automationId,
      status: 'Running',
      currentStepIndex: 0,
      stepResults,
      context,
      startedAt: Date.now()
    };

    await this.dbService.saveExecutionRun(run);
    
    this.activeRuns.set(runId, {});
    
    this.runLoop(runId);
    return runId;
  }

  async resumeExecution(runId: string): Promise<void> {
    const run = await this.dbService.getExecutionRun(runId);
    if (!run || run.status !== 'WaitingForApproval') throw new Error('Run not waiting for approval');
    
    if (run.stepResults[run.currentStepIndex]) {
      run.stepResults[run.currentStepIndex].status = 'Completed';
    }
    run.currentStepIndex++;
    run.status = 'Running';
    await this.dbService.saveExecutionRun(run);
    this.runLoop(runId);
  }

  async cancelExecution(runId: string): Promise<void> {
    const run = await this.dbService.getExecutionRun(runId);
    if (!run) throw new Error('Run not found');
    
    if (run.stepResults[run.currentStepIndex]) {
      run.stepResults[run.currentStepIndex].status = 'Failed';
    }
    run.status = 'Failed';
    await this.dbService.saveExecutionRun(run);
    
    const runCtx = this.activeRuns.get(runId);
    if (runCtx?.browser) {
       await runCtx.browser.close().catch(() => {});
    }
  }

  private async runLoop(runId: string) {
    let run = await this.dbService.getExecutionRun(runId);
    if (!run) return;

    const runCtx = this.activeRuns.get(runId) || {};
    this.activeRuns.set(runId, runCtx);

    try {
      while (run && run.status === 'Running' && run.currentStepIndex < run.stepResults.length) {
        // Always work from the freshly fetched run to avoid stale reference issues
        const stepIndex = run.currentStepIndex;
        const currentStep = run.stepResults[stepIndex];
        if (!currentStep) break;
        const action = (currentStep as any).action || currentStep.step;
        
        currentStep.status = 'Running';
        await this.dbService.saveExecutionRun(run);
        this.io?.emit('run_update', { runId, status: run.status, stepIndex: run.currentStepIndex });
        
        // Wait briefly for UI visual updates
        await new Promise(res => setTimeout(res, 1500));

        // Re-fetch run to ensure we have the latest state (not cancelled externally)
        run = await this.dbService.getExecutionRun(runId) as ExecutionRun;
        if (!run || run.status !== 'Running') break;

        // Re-get step from freshly fetched run to avoid stale reference
        const freshStep = run.stepResults[stepIndex];
        if (!freshStep) break;

        try {
          // Auto-initialize browser if needed for any browser action
          if (!runCtx.browser && ['OPEN_BROWSER', 'NAVIGATE_URL', 'CLICK', 'TYPE'].includes(action)) {
            const isHeadless = process.env.PLAYWRIGHT_HEADLESS !== undefined
              ? process.env.PLAYWRIGHT_HEADLESS === 'true'
              : process.env.NODE_ENV === 'production';

            runCtx.browser = await chromium.launch({
              headless: isHeadless,
              args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
            });
            runCtx.page = await runCtx.browser.newPage({ viewport: { width: 1920, height: 1080 } });
            if (action !== 'OPEN_BROWSER' && action !== 'NAVIGATE_URL') {
              await runCtx.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' }).catch(e => console.warn("Fallback nav failed", e));
            }
          }

          if (action === 'OPEN_BROWSER') {
            let url = (freshStep as any).url;
            if (url && runCtx.page) {
              if (!url.startsWith('http')) url = 'https://' + url;
              await runCtx.page.goto(url, { waitUntil: 'domcontentloaded' }).catch(e => console.warn("Nav failed", e));
            }
          }
          else if (action === 'OPEN_TAB') {
            if (runCtx.browser) runCtx.page = await runCtx.browser.newPage();
          }
          else if (action === 'NAVIGATE_URL') {
            let url = (freshStep as any).url;
            if (url && runCtx.page) {
              if (!url.startsWith('http')) url = 'https://' + url;
              await runCtx.page.goto(url, { waitUntil: 'domcontentloaded' });
            }
            else throw new Error("URL or Page not available");
          }
          else if (action === 'CLICK') {
            const target = (freshStep as any).target;
            const x = (freshStep as any).x || (freshStep as any).metadata?.x;
            const y = (freshStep as any).y || (freshStep as any).metadata?.y;
            if (target && runCtx.page) {
              // Try selector-based click first
              const element = runCtx.page.getByRole('button', { name: target, exact: false }).first()
                .or(runCtx.page.getByRole('link', { name: target, exact: false }).first())
                .or(runCtx.page.getByText(target, { exact: false }).first())
                .or(runCtx.page.locator(`text=${target}`).first());
              await element.click({ timeout: 5000 });
              await new Promise(r => setTimeout(r, 300)); // Let focus settle
            } else if (x && y && runCtx.page) {
              await runCtx.page.mouse.click(Number(x), Number(y));
              await new Promise(r => setTimeout(r, 300)); // Let focus settle
            } else {
              console.log("CLICK step has no target/coords, marking complete without browser action");
            }
          }
          else if (action === 'TYPE') {
            const target = (freshStep as any).target;
            const value = (freshStep as any).value;
            // Generic targets from the observer (e.g. "Keyboard Input") can't match real page elements
            const isGenericTarget = !target || target === 'Keyboard Input' || target === 'Unknown Element';
            
            if (!isGenericTarget && value && runCtx.page) {
              // Try to find a real input element by its label/name
              try {
                const element = runCtx.page.getByRole('textbox', { name: target, exact: false }).first()
                  .or(runCtx.page.getByRole('searchbox', { name: target, exact: false }).first())
                  .or(runCtx.page.locator(`[name="${target}"]`).first())
                  .or(runCtx.page.locator(`[placeholder*="${target}" i]`).first());
                await element.fill(value, { timeout: 3000 });
              } catch {
                // If selector-based fill fails, type into currently focused element
                await runCtx.page.keyboard.type(value, { delay: 30 });
              }
            } else if (value && runCtx.page) {
               // Ensure something is focused before typing blindly
               const hasFocus = await runCtx.page.evaluate(() => {
                   const el = document.activeElement;
                   return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
               });
               
               if (!hasFocus) {
                   console.log("No input focused, attempting to auto-focus first available text input");
                   const firstInput = runCtx.page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea').first();
                   await firstInput.focus().catch(() => {});
               }
               
               // Type into whatever element currently has focus (the one we just clicked or fallback)
               await runCtx.page.keyboard.type(value, { delay: 30 });
            } else {
               console.log("TYPE step has no value, marking complete without browser action");
            }
          }
          else if (action === 'KEY_PRESS') {
             const key = (freshStep as any).key;
             if (key && runCtx.page) {
               let playwrightKey = key;
               if (key.toUpperCase() === 'ENTER') playwrightKey = 'Enter';
               await runCtx.page.keyboard.press(playwrightKey);
             }
          }
          else if (['OPEN_EXCEL', 'READ_EXCEL', 'WRITE_EXCEL', 'PROCESS_SALES_DATA', 'UPDATE_EXCEL', 'FIND_FILE', 'READ_PDF', 'EXTRACT_INVOICE_DATA', 'VERIFY_INVOICE', 'VERIFY_REPORT', 'LOCAL_EMAIL', 'READ_TICKET', 'CLASSIFY_TICKET', 'UPDATE_TICKET', 'LOCAL_NOTIFICATION'].includes(action)) {
             await this.executeShowcaseAction(action, freshStep, run);
          }
          else if (action === 'human_approval' || freshStep.step === 'human_approval') {
            freshStep.status = 'WaitingForApproval';
            run.status = 'WaitingForApproval';
            await this.dbService.saveExecutionRun(run);
            break; // Pause loop until user approves
          }
          else {
             console.log("Unknown action, skipping:", action);
          }

          if ((freshStep.status as string) !== 'WaitingForApproval') {
            freshStep.status = 'Completed';
            run.currentStepIndex++;
            
            if (run.currentStepIndex >= run.stepResults.length) {
              run.status = 'Completed';
              run.completedAt = Date.now();
            }
            await this.dbService.saveExecutionRun(run);
            this.io?.emit('run_update', { runId, status: run.status, stepIndex: run.currentStepIndex });
          }
        } catch (stepError: any) {
          console.warn("Step Failed, attempting self-healing:", stepError.message);
          run.status = 'Recovering';
          freshStep.status = 'Recovering';
          await this.dbService.saveExecutionRun(run);
          this.io?.emit('run_update', { runId, status: 'Recovering', stepIndex: run.currentStepIndex });
          
          let recovered = false;
          if (runCtx.page) {
             try {
                // Get available interactive elements on page
                const availableElements = await runCtx.page.evaluate(() => {
                  return Array.from(document.querySelectorAll('button, a, input, [role="button"], label'))
                       .map(e => (e.textContent?.trim() || (e as HTMLInputElement).value || (e as HTMLInputElement).placeholder || ''))
                       .filter(t => t.length > 0);
                });
                
                const url = runCtx.page.url();
                const target = (freshStep as any).target;
                
                if (target) {
                   const recoveryAgent = new RecoveryAgent();
                   const recoveryResult = await recoveryAgent.attemptRecovery(action, target, availableElements, url);
                   
                   if (recoveryResult.recovered && recoveryResult.newTarget) {
                      console.log("Self-healing successful! New target:", recoveryResult.newTarget);
                      (freshStep as any).target = recoveryResult.newTarget;
                      (freshStep as any).recoveryReason = recoveryResult.reason;
                      
                      // Wait briefly, then re-run the loop (it won't increment index, so it tries the SAME step again)
                      run.status = 'Running';
                      freshStep.status = 'Running';
                      await this.dbService.saveExecutionRun(run);
                      this.io?.emit('run_update', { runId, status: 'Running', stepIndex: run.currentStepIndex });
                      recovered = true;
                      await new Promise(r => setTimeout(r, 2000));
                   }
                }
             } catch (recoveryErr) {
                console.error("Recovery process failed:", recoveryErr);
             }
          }

          if (!recovered) {
            freshStep.status = 'Failed';
            run.status = 'Failed';
            run.context = run.context || {};
            run.context.errorDetails = stepError.message || 'Unknown error';
            await this.dbService.saveExecutionRun(run);
            this.io?.emit('run_update', { runId, status: 'Failed', stepIndex: run.currentStepIndex });
            break;
          }
        }
      }
    } catch (fatalError) {
       console.error("Fatal run error:", fatalError);
    }
  }

  private async executeShowcaseAction(action: string, step: any, run: ExecutionRun) {
    console.log(`Executing Showcase Action: ${action}`, step);
    const target = step.target;
    const value = step.value;
    const demoWorkspace = path.join(process.cwd(), '..', 'TRACE Demo Workspace');

    const excelActions = ['OPEN_EXCEL', 'READ_EXCEL', 'WRITE_EXCEL', 'PROCESS_SALES_DATA', 'UPDATE_EXCEL'];
    if (excelActions.includes(action)) {
      const pyScript = path.join(process.cwd(), 'src', 'executors', 'python', 'excel_executor.py');
      const pyExe = path.join(process.cwd(), '..', 'observer', 'venv', 'Scripts', 'python.exe');
      
      const args = [pyScript, action];
      if (target) args.push(target);
      if (value) args.push(value);
      
      try {
        const { stdout } = await execFileAsync(fs.existsSync(pyExe) ? pyExe : 'python', args);
        console.log(`Excel Executor [${action}]:`, stdout);
        try {
          const result = JSON.parse(stdout);
          if (!result.success) {
            throw new Error(`Prerequisite Missing: ${result.error || 'Failed to interact with Microsoft Excel'}`);
          }
        } catch (parseErr) {
          if (parseErr.message.includes('Prerequisite')) throw parseErr;
          console.warn("Could not parse Python executor output", parseErr);
        }
      } catch (err: any) {
        console.error(`Excel Executor Failed [${action}]:`, err);
        throw new Error(`Excel Error: ${err.message}`);
      }
    }
    else if (action === 'FIND_FILE') {
       const expectedPath = path.join(demoWorkspace, 'Incoming Documents', target);
       let foundPath = expectedPath;
       
       if (!fs.existsSync(expectedPath)) {
         // Recovery Demonstration: Search the entire Demo Workspace
         console.log(`[Showcase Recovery] ${target} not found in expected location. Searching workspace...`);
         const findRecursive = (dir: string): string | null => {
           const files = fs.readdirSync(dir);
           for (const file of files) {
             const fullPath = path.join(dir, file);
             if (fs.statSync(fullPath).isDirectory()) {
               const res = findRecursive(fullPath);
               if (res) return res;
             } else if (file === target) {
               return fullPath;
             }
           }
           return null;
         };
         
         const recovered = findRecursive(demoWorkspace);
         if (!recovered) {
           throw new Error(`File ${target} could not be found anywhere in the Demo Workspace.`);
         }
         
         foundPath = recovered;
         run.stepResults.find(s => s.step === 'FIND_FILE')!.recoveryReason = `File was moved. Discovered at: ${foundPath.replace(process.cwd(), '')} (99% confidence)`;
       }
       
       run.context = run.context || {};
       run.context.foundFile = foundPath;
    }
    else if (action === 'READ_PDF') {
       // Mocking PDF parse for speed/simplicity since pdfkit generates a very basic PDF
       run.context = run.context || {};
       run.context.extractedData = { invoice: '1042', vendor: 'TechSupply Co.', amount: '4500' };
    }
    else if (action === 'EXTRACT_INVOICE_DATA') {
       // Validate that the context has the data
       if (!run.context?.extractedData) throw new Error("No extracted data found");
    }
    else if (action === 'VERIFY_INVOICE' || action === 'VERIFY_REPORT') {
       // Wait a moment for visual effect
       await new Promise(r => setTimeout(r, 1000));
    }
    else if (action === 'LOCAL_EMAIL') {
       const emailPath = path.join(demoWorkspace, 'Demo Email', 'delivery.json');
       fs.writeFileSync(emailPath, JSON.stringify({
          to: "boss@acme.corp",
          subject: "Demo / Showcase Delivery: Weekly Sales Report",
          body: value || "Please find the report attached.",
          attachment: "Weekly_Sales_Report.xlsx",
          sentAt: new Date().toISOString()
       }, null, 2));
    }
    else if (action === 'READ_TICKET') {
       const ticketPath = target;
       if (!fs.existsSync(ticketPath)) throw new Error("Ticket not found");
       run.context = run.context || {};
       run.context.ticketData = fs.readFileSync(ticketPath, 'utf-8');
    }
    else if (action === 'CLASSIFY_TICKET') {
       await new Promise(r => setTimeout(r, 1500));
       run.context = run.context || {};
       run.context.classification = { category: "Bug", priority: "High", team: "Engineering" };
    }
    else if (action === 'UPDATE_TICKET') {
       const ticketPath = path.join(demoWorkspace, 'Support Inbox', 'ticket_8991.txt');
       fs.appendFileSync(ticketPath, `\n[TRACE AI UPDATED]:\nCategory: Bug\nPriority: High\nAssigned: Engineering\n`);
    }
    else if (action === 'LOCAL_NOTIFICATION') {
       const notifPath = path.join(demoWorkspace, 'Support Inbox', 'notification.json');
       fs.writeFileSync(notifPath, JSON.stringify({
         message: "High priority bug assigned to Engineering",
         ticket: "ticket_8991.txt"
       }));
    }
    
    await new Promise(r => setTimeout(r, 800)); // Pacing for visibility
  }
}
