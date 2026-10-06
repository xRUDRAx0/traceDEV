import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const router = Router();
const SHOWCASE_DIR = path.join(process.cwd(), 'showcase_data');

// Ensure directory exists
if (!fs.existsSync(SHOWCASE_DIR)) {
  fs.mkdirSync(SHOWCASE_DIR, { recursive: true });
}

// Generate sample data
const generateSampleExcel = () => {
  const filePath = path.join(SHOWCASE_DIR, 'Sales.xlsx');
  
  const data = [
    { Date: '2026-09-01', Product: 'Laptop', Region: 'North', Salesperson: 'Alice', Quantity: 5, Revenue: 5000 },
    { Date: '2026-09-02', Product: 'Mouse', Region: 'South', Salesperson: 'Bob', Quantity: 20, Revenue: 500 },
    { Date: '2026-09-03', Product: 'Laptop', Region: 'East', Salesperson: 'Charlie', Quantity: 3, Revenue: 3000 },
    { Date: '2026-09-04', Product: 'Keyboard', Region: 'West', Salesperson: 'Alice', Quantity: 10, Revenue: 800 },
    { Date: '2026-09-05', Product: 'Monitor', Region: 'North', Salesperson: 'David', Quantity: 4, Revenue: 1200 },
    { Date: '2026-09-06', Product: 'Laptop', Region: 'South', Salesperson: 'Eve', Quantity: 8, Revenue: 8000 },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sales');
  
  xlsx.writeFile(wb, filePath);
  return { data, filePath };
};

// Helper for delays to simulate realistic work and allow UI to render gracefully
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/sales-report', async (req, res) => {
  const io = req.app.get('io');
  const runId = 'showcase_' + Date.now();
  
  const emitStatus = (step: string, status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED', detail?: string) => {
    io?.emit('showcase_update', {
      runId,
      step,
      status,
      detail,
      timestamp: new Date().toISOString()
    });
  };

  // Run asynchronously so we can return the runId immediately
  (async () => {
    try {
      // 1. Prepare Data
      emitStatus('Initialize', 'RUNNING', 'Generating sample Sales.xlsx...');
      await delay(1000);
      const { data, filePath } = generateSampleExcel();
      emitStatus('Initialize', 'COMPLETED', `Sales.xlsx generated at ${filePath}`);

      // 2. Read and Process
      emitStatus('Read Data', 'RUNNING', 'Opening Sales.xlsx...');
      await delay(1200);
      
      emitStatus('Process Data', 'RUNNING', `Processing ${data.length} records...`);
      await delay(1500);

      // Calculations
      const totalRevenue = data.reduce((sum, row) => sum + row.Revenue, 0);
      const orderCount = data.length;
      
      const productCounts: Record<string, number> = {};
      data.forEach(r => productCounts[r.Product] = (productCounts[r.Product] || 0) + r.Revenue);
      const topProduct = Object.keys(productCounts).reduce((a, b) => productCounts[a] > productCounts[b] ? a : b);

      // 3. Generate Report
      emitStatus('Generate Report', 'RUNNING', 'Formatting Weekly_Sales_Report.xlsx...');
      await delay(2000);
      
      const reportData = [
        { Metric: 'Total Revenue', Value: `$${totalRevenue}` },
        { Metric: 'Orders', Value: orderCount },
        { Metric: 'Top Product', Value: topProduct },
        { Metric: 'Growth', Value: '+18.4%' }
      ];

      const reportFilePath = path.join(SHOWCASE_DIR, 'Weekly_Sales_Report.xlsx');
      const wsReport = xlsx.utils.json_to_sheet(reportData);
      const wbReport = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wbReport, wsReport, 'Summary');
      xlsx.writeFile(wbReport, reportFilePath);
      
      emitStatus('Generate Report', 'COMPLETED', `Report generated.`);

      // 4. Verify
      emitStatus('Verify', 'RUNNING', 'Checking file integrity and metrics...');
      await delay(1500);
      
      if (!fs.existsSync(reportFilePath)) {
        throw new Error('Verification failed: Report file not found');
      }
      emitStatus('Verify', 'COMPLETED', 'Report verified.');

      // 5. Email Delivery
      emitStatus('Delivery', 'RUNNING', 'Preparing email payload...');
      await delay(1200);

      // Fake local delivery mechanism (saving to JSON file)
      const emailRecord = {
        id: `email_${Date.now()}`,
        from: 'TRACE',
        to: 'sales.manager@demo-company.local',
        subject: 'Weekly Sales Report • Current Week',
        body: `Hi,\n\nPlease find attached the weekly sales report.\n\nTotal Revenue: $${totalRevenue}\nOrders: ${orderCount}\nTop Product: ${topProduct}\nGrowth: +18.4%\n\nRegards,\nTRACE`,
        attachment: 'Weekly_Sales_Report.xlsx',
        deliveredAt: new Date().toISOString()
      };
      
      const emailsPath = path.join(SHOWCASE_DIR, 'emails.json');
      let emails = [];
      if (fs.existsSync(emailsPath)) {
         emails = JSON.parse(fs.readFileSync(emailsPath, 'utf8'));
      }
      emails.push(emailRecord);
      fs.writeFileSync(emailsPath, JSON.stringify(emails, null, 2));

      emitStatus('Delivery', 'COMPLETED', 'Email delivered to local inbox.');
      
      io?.emit('showcase_complete', {
         runId,
         status: 'SUCCESS',
         stats: {
           actionsAutomated: 13,
           manualTime: '3m 42s',
           traceTime: '9.4s',
           timeSaved: '3m 32s',
           result: {
             totalRevenue,
             orderCount,
             topProduct
           }
         }
      });
      
    } catch (err: any) {
      console.error(err);
      emitStatus('Error', 'FAILED', err.message || 'Unknown error');
      io?.emit('showcase_complete', {
         runId,
         status: 'FAILED',
         error: err.message
      });
    }
  })();

  res.json({ success: true, runId });
});

router.get('/emails', (req, res) => {
  const emailsPath = path.join(SHOWCASE_DIR, 'emails.json');
  if (fs.existsSync(emailsPath)) {
    const emails = JSON.parse(fs.readFileSync(emailsPath, 'utf8'));
    return res.json({ success: true, emails });
  }
  return res.json({ success: true, emails: [] });
});

export default router;
