import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { DbService, AutomationPlan } from './db.service';

export class ShowcaseService {
  private workspacePath: string;

  constructor(private dbService: DbService) {
    // Parent of backend folder
    this.workspacePath = path.join(process.cwd(), '..', 'TRACE Demo Workspace');
  }

  public async initializeShowcase(): Promise<void> {
    try {
      this.createWorkspaceFolders();
      await this.generateSampleData();
      await this.seedAutomations();
      console.log('⚡ TRACE Showcase initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize TRACE Showcase:', err);
    }
  }

  private createWorkspaceFolders() {
    const folders = [
      'Sales',
      'Reports',
      'Incoming Documents',
      'Accounts',
      'Support Inbox',
      'Demo Email'
    ];

    if (!fs.existsSync(this.workspacePath)) {
      fs.mkdirSync(this.workspacePath, { recursive: true });
    }

    for (const folder of folders) {
      const folderPath = path.join(this.workspacePath, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    }
  }

  private async generateSampleData() {
    // 1. Generate Sales_Data.xlsx
    const salesPath = path.join(this.workspacePath, 'Sales', 'Sales_Data.xlsx');
    if (!fs.existsSync(salesPath)) {
      const ws = xlsx.utils.json_to_sheet([
        { Date: '2023-10-01', Product: 'Pro License', Revenue: 1200, Region: 'NA' },
        { Date: '2023-10-02', Product: 'Starter Kit', Revenue: 400, Region: 'EMEA' },
        { Date: '2023-10-03', Product: 'Pro License', Revenue: 1200, Region: 'NA' },
        { Date: '2023-10-04', Product: 'Enterprise', Revenue: 5000, Region: 'APAC' },
      ]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sales');
      xlsx.writeFile(wb, salesPath);
    }

    // 2. Generate Invoice_1042.pdf
    const invoicePath = path.join(this.workspacePath, 'Incoming Documents', 'Invoice_1042.pdf');
    if (!fs.existsSync(invoicePath)) {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(invoicePath));
      doc.fontSize(20).text('INVOICE #1042', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Vendor: TechSupply Co.');
      doc.text('Date: 2023-10-15');
      doc.text('Total Amount: $4,500.00');
      doc.end();
    }

    // 3. Generate Accounts.xlsx
    const accountsPath = path.join(this.workspacePath, 'Accounts', 'Accounts.xlsx');
    if (!fs.existsSync(accountsPath)) {
      const ws = xlsx.utils.json_to_sheet([
        { Invoice_No: '1040', Vendor: 'OfficeMax', Amount: 150, Status: 'Paid' },
        { Invoice_No: '1041', Vendor: 'AWS', Amount: 2400, Status: 'Paid' }
      ]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Invoices');
      xlsx.writeFile(wb, accountsPath);
    }

    // 4. Generate Support Request
    const supportPath = path.join(this.workspacePath, 'Support Inbox', 'ticket_8991.txt');
    if (!fs.existsSync(supportPath)) {
      fs.writeFileSync(supportPath, 'Customer: Acme Corp\nIssue: The dashboard is showing a 500 internal server error when I try to export my weekly PDF report. Please help ASAP, this is blocking our Monday meeting.\nPriority: Undefined\nCategory: Undefined\nAssigned: Undefined');
    }
  }

  private async seedAutomations() {
    const automations: AutomationPlan[] = [
      {
        id: 'showcase_sales',
        name: 'Weekly Sales Report',
        workflowId: 'showcase',
        trigger: { type: 'manual' },
        status: 'Approved',
        executionType: 'showcase',
        version: 1,
        confidence: 99,
        estimatedManualDuration: 300,
        timeSavedPerRun: 295,
        successRate: 100,
        executionCount: 0,
        averageDuration: 5,
        applications: ['Microsoft Excel', 'Local Email'],
        variables: [],
        steps: [
          { type: 'action', action: 'OPEN_EXCEL', target: path.join(this.workspacePath, 'Sales', 'Sales_Data.xlsx') },
          { type: 'action', action: 'READ_EXCEL', target: 'Sales' },
          { type: 'action', action: 'PROCESS_SALES_DATA' },
          { type: 'action', action: 'WRITE_EXCEL', target: path.join(this.workspacePath, 'Reports', 'Weekly_Sales_Report.xlsx') },
          { type: 'action', action: 'VERIFY_REPORT' },
          { type: 'action', action: 'LOCAL_EMAIL', value: 'Weekly Sales Report attached.' }
        ]
      },
      {
        id: 'showcase_invoice',
        name: 'Invoice Processing',
        workflowId: 'showcase',
        trigger: { type: 'manual' },
        status: 'Approved',
        executionType: 'showcase',
        version: 1,
        confidence: 98,
        estimatedManualDuration: 180,
        timeSavedPerRun: 170,
        successRate: 100,
        executionCount: 0,
        averageDuration: 10,
        applications: ['PDF Reader', 'Microsoft Excel'],
        variables: [],
        steps: [
          { type: 'action', action: 'FIND_FILE', target: 'Invoice_1042.pdf', value: this.workspacePath },
          { type: 'action', action: 'READ_PDF' },
          { type: 'action', action: 'EXTRACT_INVOICE_DATA' },
          { type: 'action', action: 'OPEN_EXCEL', target: path.join(this.workspacePath, 'Accounts', 'Accounts.xlsx') },
          { type: 'action', action: 'UPDATE_EXCEL', value: 'Invoices' },
          { type: 'action', action: 'VERIFY_INVOICE' }
        ]
      },
      {
        id: 'showcase_support',
        name: 'Support Request',
        workflowId: 'showcase',
        trigger: { type: 'manual' },
        status: 'Approved',
        executionType: 'showcase',
        version: 1,
        confidence: 95,
        estimatedManualDuration: 120,
        timeSavedPerRun: 115,
        successRate: 100,
        executionCount: 0,
        averageDuration: 5,
        applications: ['Support System'],
        variables: [],
        steps: [
          { type: 'action', action: 'READ_TICKET', target: path.join(this.workspacePath, 'Support Inbox', 'ticket_8991.txt') },
          { type: 'action', action: 'CLASSIFY_TICKET' },
          { type: 'action', action: 'UPDATE_TICKET' },
          { type: 'action', action: 'LOCAL_NOTIFICATION' }
        ]
      }
    ];

    for (const auto of automations) {
      const existing = await this.dbService.getAutomationById(auto.id);
      if (!existing) {
        await this.dbService.saveAutomation(auto as any); // using any for slight interface looseness
      } else {
        // Update it
        await this.dbService.saveAutomation(auto as any);
      }
    }
  }
}
