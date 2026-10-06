import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft, Loader2, Play, FileSpreadsheet, Mail, CheckCircle, RotateCw } from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';

export default function ShowcaseExecution() {
  const navigate = useNavigate();
  const [runId, setRunId] = useState<string | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [stats, setStats] = useState<any>(null);
  
  // To keep track of current right-side view
  const currentStepLabel = steps.filter(s => s.status !== 'QUEUED').pop()?.step || 'Initialize';

  const startShowcase = async () => {
    setSteps([]);
    setStatus('RUNNING');
    setStats(null);
    try {
      const res = await fetch(`${API_URL}/api/showcase/sales-report`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRunId(data.runId);
      }
    } catch (e) {
      console.error(e);
      setStatus('FAILED');
    }
  };

  useEffect(() => {
    startShowcase();
  }, []);

  useEffect(() => {
    if (!runId) return;
    const socket = io(SOCKET_URL);
    
    socket.on('showcase_update', (data: any) => {
      if (data.runId !== runId) return;
      setSteps(prev => {
        const existing = [...prev];
        const idx = existing.findIndex(s => s.step === data.step);
        if (idx >= 0) {
          existing[idx] = data;
        } else {
          existing.push(data);
        }
        return existing;
      });
    });

    socket.on('showcase_complete', (data: any) => {
      if (data.runId !== runId) return;
      setStatus(data.status);
      if (data.stats) setStats(data.stats);
    });

    return () => { socket.disconnect(); };
  }, [runId]);

  // Derived timeline view for the left
  const expectedSteps = ['Initialize', 'Read Data', 'Process Data', 'Generate Report', 'Verify', 'Delivery'];

  const getWhyReason = (step: string) => {
    switch(step) {
      case 'Process Data': return 'Because the saved workflow defines the reporting period as the current week.';
      case 'Generate Report': return 'Because the workflow requires the processed sales data to be delivered as a weekly management report.';
      case 'Delivery': return 'The verified report must be sent to configured stakeholders (sales.manager@demo).';
      default: return null;
    }
  };

  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 pt-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/showcase')} className="p-2 hover:bg-surface-secondary rounded-full text-text-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Weekly Sales Report Execution</h1>
          <p className="text-text-muted text-xs font-mono mt-1">SHOWCASE MODE • LOCALHOST</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={() => setShowHowItWorks(!showHowItWorks)} className="px-4 py-2 bg-surface hover:bg-surface-secondary border border-border rounded-lg text-sm font-bold text-text-primary transition-colors">
             How does TRACE do this?
          </button>
          {status === 'SUCCESS' && (
             <button onClick={startShowcase} className="px-4 py-2 bg-surface hover:bg-surface-secondary border border-border rounded-lg text-sm font-bold flex items-center gap-2">
               <RotateCw className="w-4 h-4" /> Run Again
             </button>
          )}
        </div>
      </div>

      {showHowItWorks && (
         <div className="bg-background border-2 border-accent/30 rounded-xl p-6 shadow-lg animate-in slide-in-from-top-4 mb-6 flex flex-col md:flex-row gap-8">
            <div className="flex-1">
               <h3 className="font-black text-text-primary mb-4 text-lg">Workflow Architecture</h3>
               <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg">USER INPUT</div>
                  <span>→</span>
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg">WORKFLOW MEMORY</div>
                  <span>→</span>
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg text-accent border-accent/50">INTENT & PLANNING</div>
                  <span>→</span>
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg">EXECUTION (Excel/Local)</div>
                  <span>→</span>
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg">VERIFICATION</div>
                  <span>→</span>
                  <div className="px-3 py-2 bg-surface border border-border rounded-lg">DELIVERY</div>
               </div>
            </div>
            <div className="w-64 border-l border-border pl-8">
               <h3 className="font-black text-text-primary mb-4 text-sm uppercase tracking-widest">Active Agents</h3>
               <ul className="space-y-2 text-sm font-medium text-text-secondary">
                 <li className="flex justify-between">Intent Agent <CheckCircle2 className="w-4 h-4 text-success" /></li>
                 <li className="flex justify-between">Workflow Agent <CheckCircle2 className="w-4 h-4 text-success" /></li>
                 <li className="flex justify-between">Parameter Agent <CheckCircle2 className="w-4 h-4 text-success" /></li>
                 <li className="flex justify-between">Execution Agent <CheckCircle2 className="w-4 h-4 text-success" /></li>
                 <li className="flex justify-between">Verification Agent <CheckCircle2 className="w-4 h-4 text-success" /></li>
               </ul>
            </div>
         </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Timeline */}
        <div className="w-full lg:w-[320px] shrink-0 bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col">
           <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6">Execution Steps</h3>
           
           <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-border flex-1">
              {expectedSteps.map((stepName, i) => {
                const stepData = steps.find(s => s.step === stepName);
                const sStatus = stepData?.status || 'QUEUED';
                const sDetail = stepData?.detail;
                const whyReason = getWhyReason(stepName);
                
                return (
                  <div key={i} className="relative flex gap-4 animate-in slide-in-from-left-2 fade-in">
                    <div className="w-8 flex justify-center shrink-0 relative z-10 pt-0.5">
                       {sStatus === 'COMPLETED' ? <CheckCircle2 className="w-6 h-6 text-success bg-surface rounded-full" /> :
                        sStatus === 'RUNNING' ? <Loader2 className="w-6 h-6 text-info animate-spin bg-surface rounded-full" /> :
                        sStatus === 'FAILED' ? <XCircle className="w-6 h-6 text-error bg-surface rounded-full" /> :
                        <div className="w-3 h-3 rounded-full bg-border mt-1.5 ring-4 ring-surface" />}
                    </div>
                    <div className="pt-0.5 pb-4 w-full">
                       <div className="flex justify-between items-start">
                         <p className={`text-sm font-bold ${sStatus === 'QUEUED' ? 'text-text-muted' : 'text-text-primary'}`}>{stepName}</p>
                         {whyReason && sStatus !== 'QUEUED' && (
                           <div className="group relative">
                             <span className="text-[10px] bg-surface-secondary text-text-muted px-2 py-0.5 rounded cursor-help font-bold border border-border group-hover:text-accent group-hover:border-accent transition-colors">Why?</span>
                             <div className="absolute right-0 top-6 w-48 bg-background border border-border p-3 rounded-lg shadow-xl text-xs text-text-secondary hidden group-hover:block z-50">
                               <p className="font-bold text-text-primary mb-1">Reasoning:</p>
                               {whyReason}
                             </div>
                           </div>
                         )}
                       </div>
                       {sDetail && <p className="text-xs text-text-secondary mt-1 pr-4">{sDetail}</p>}
                    </div>
                  </div>
                )
              })}
           </div>
        </div>

        {/* Right Side: Context Viewer */}
        <div className="flex-1 bg-surface border border-border rounded-xl shadow-sm min-h-[500px] overflow-hidden flex flex-col">
           <div className="border-b border-border p-4 bg-background/50 flex justify-between items-center">
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                 <FileSpreadsheet className="w-4 h-4" /> TRACE Vision Space
              </span>
              <span className="px-2 py-0.5 bg-warning/20 text-warning text-[10px] font-bold rounded uppercase">Isolated Local Execution</span>
           </div>
           
           <div className="p-8 flex-1 flex flex-col items-center justify-center bg-background/30 relative">
             
             {/* Content based on current execution step */}
             {status === 'SUCCESS' ? (
                <div className="text-center animate-in zoom-in duration-500 w-full max-w-md">
                   <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-success" />
                   </div>
                   <h2 className="text-3xl font-black text-text-primary mb-2">WORKFLOW COMPLETE</h2>
                   <p className="text-text-secondary mb-8">Weekly Sales Report delivered successfully.</p>
                   
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-4 bg-surface border border-border rounded-xl">
                         <p className="text-xs font-bold text-text-muted uppercase mb-1">Actions Automated</p>
                         <p className="text-xl font-bold text-text-primary">{stats?.actionsAutomated}</p>
                      </div>
                      <div className="p-4 bg-surface border border-border rounded-xl">
                         <p className="text-xs font-bold text-text-muted uppercase mb-1">Time Saved</p>
                         <p className="text-xl font-black text-accent">{stats?.timeSaved}</p>
                      </div>
                   </div>

                   <button onClick={() => navigate('/showcase/inbox')} className="w-full py-3 bg-[#232529] text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#1a1c1f] transition-all shadow-md">
                      <Mail className="w-4 h-4" /> View Local Inbox
                   </button>
                </div>
             ) : currentStepLabel === 'Initialize' || currentStepLabel === 'Read Data' ? (
                <div className="w-full h-full animate-in fade-in duration-500">
                   <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-success" /> Sales.xlsx (Raw Data)</h3>
                   <div className="w-full border border-border rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                         <thead className="bg-surface-secondary text-text-muted">
                           <tr><th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Region</th><th className="p-3">Revenue</th></tr>
                         </thead>
                         <tbody className="divide-y divide-border bg-surface text-text-secondary font-medium">
                           <tr><td className="p-3">2026-09-01</td><td className="p-3">Laptop</td><td className="p-3">North</td><td className="p-3">$5000</td></tr>
                           <tr><td className="p-3">2026-09-02</td><td className="p-3">Mouse</td><td className="p-3">South</td><td className="p-3">$500</td></tr>
                           <tr><td className="p-3 opacity-50">...</td><td className="p-3 opacity-50">...</td><td className="p-3 opacity-50">...</td><td className="p-3 opacity-50">...</td></tr>
                         </tbody>
                      </table>
                   </div>
                </div>
             ) : currentStepLabel === 'Process Data' ? (
                <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                   <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin mb-4"></div>
                   <h3 className="font-bold text-text-primary text-lg">TRACE is analyzing your sales data...</h3>
                   <p className="text-sm text-text-muted mt-2 max-w-[250px]">Filtering dates, grouping by region, and calculating totals.</p>
                </div>
             ) : currentStepLabel === 'Generate Report' || currentStepLabel === 'Verify' ? (
                <div className="w-full h-full animate-in fade-in duration-500">
                   <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-accent" /> Weekly_Sales_Report.xlsx (Generated)</h3>
                   <div className="w-full border border-border rounded-lg overflow-hidden text-sm">
                      <table className="w-full text-left">
                         <thead className="bg-surface-secondary text-text-muted">
                           <tr><th className="p-4">Metric</th><th className="p-4">Value</th></tr>
                         </thead>
                         <tbody className="divide-y divide-border bg-surface text-text-primary font-bold">
                           <tr><td className="p-4">Total Revenue</td><td className="p-4 text-success">$23,500</td></tr>
                           <tr><td className="p-4">Orders</td><td className="p-4">127</td></tr>
                           <tr><td className="p-4">Top Product</td><td className="p-4">Laptop</td></tr>
                           <tr><td className="p-4">Growth</td><td className="p-4 text-success">+18.4%</td></tr>
                         </tbody>
                      </table>
                   </div>
                   
                   {currentStepLabel === 'Verify' && (
                     <div className="mt-6 p-4 bg-success/10 border border-success/30 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <div>
                          <p className="text-xs font-bold text-success uppercase tracking-widest">Report Verified</p>
                          <p className="text-xs text-success/80">Totals match source data. Format is valid.</p>
                        </div>
                     </div>
                   )}
                </div>
             ) : currentStepLabel === 'Delivery' ? (
                <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-bottom-8">
                   <div className="bg-surface-secondary p-4 border-b border-border">
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">New Message</p>
                      <h3 className="font-bold text-text-primary">Weekly Sales Report • Current Week</h3>
                   </div>
                   <div className="p-5 space-y-4">
                      <div className="flex gap-4 items-center text-sm border-b border-border pb-3">
                         <span className="text-text-muted w-12">To:</span>
                         <span className="font-medium text-text-primary bg-background px-2 py-1 rounded">sales.manager@demo-company.local</span>
                      </div>
                      <div className="flex gap-4 items-center text-sm">
                         <span className="text-text-muted w-12">Attach:</span>
                         <span className="font-medium text-accent bg-accent/10 px-2 py-1 rounded flex items-center gap-2"><FileSpreadsheet className="w-3 h-3" /> Weekly_Sales_Report.xlsx</span>
                      </div>
                      <div className="mt-6 text-sm text-text-primary whitespace-pre-line font-medium leading-relaxed bg-background p-4 rounded-lg">
                        Hi,{"\n\n"}Please find attached the weekly sales report.{"\n\n"}Total Revenue: $23,500{"\n"}Orders: 127{"\n"}Top Product: Laptop{"\n"}Growth: +18.4%{"\n\n"}Regards,{"\n"}TRACE
                      </div>
                   </div>
                   <div className="p-4 bg-surface-secondary border-t border-border flex justify-end">
                      <button disabled className="px-6 py-2 bg-accent text-white rounded font-bold text-sm opacity-80 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </button>
                   </div>
                </div>
             ) : null}
             
           </div>
        </div>

      </div>
    </div>
  );
}
