import * as admin from 'firebase-admin';

// Check if Firebase Admin is initialized, if not initialize it (only if service account is provided)
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
let useFirestore = false;

if (serviceAccountEnv) {
  try {
    let serviceAccount;
    try {
      // First try to parse it directly as a JSON string (useful for cloud env vars like Render)
      serviceAccount = JSON.parse(serviceAccountEnv);
    } catch (e) {
      // Fallback to treating it as a file path
      serviceAccount = require(serviceAccountEnv);
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized with Firestore.');
      useFirestore = true;
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin. Falling back to local memory store.', error);
  }
} else {
  console.log('No FIREBASE_SERVICE_ACCOUNT found in .env. Falling back to local memory store.');
}

// Interfaces
export interface AiAnalysisResult {
  workflowName: string;
  summary: string;
  whyAutomate: string;
  automationPotential: number;
  recommendedAction: string;
  estimatedTimeSaving: string;
  confidence: number;
  insights: any[];
  automationPlan: {
    steps: any[];
    humanApprovalSteps: string[];
    reasoning: string;
  };
}

export interface ObservationSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: 'Recording' | 'Completed';
  durationInSeconds: number;
  eventCount: number;
}

export interface Workflow {
  id: string;
  name: string;
  status: 'Recorded' | 'Analyzed' | 'Automated';
  createdAt: string;
  durationInSeconds: number;
  eventCount: number;
}

export interface WorkflowEvent {
  id: string;
  workflowId?: string; // Legacy/pattern association
  sessionId?: string; // Primary observation session association
  timestamp: string;
  application: 'Gmail' | 'Spreadsheet' | 'Report';
  action: string;
  target: string;
  metadata?: Record<string, any>;
}

export interface AutomationStep {
  type: string;
  originalAction?: string;
  action?: string;
  target?: string;
  value?: string;
  url?: string;
  key?: string;
}

export interface AutomationPlan {
  id: string;
  name: string;
  workflowId: string;
  trigger: { type: string };
  steps: AutomationStep[];
  status: 'Draft' | 'Approved';
  version: number;
  confidence: number;
  estimatedManualDuration: number; // in seconds
  timeSavedPerRun: number; // in seconds
  successRate: number;
  executionCount: number;
  averageDuration: number;
  applications: string[];
  variables: string[];
  intent?: string; // Natural language intent
  executionType?: 'standard' | 'showcase';
}

export interface StepResult {
  step: string;
  status: 'Pending' | 'Running' | 'WaitingForApproval' | 'Completed' | 'Failed' | 'Recovering' | 'Verifying' | 'Cancelled';
  originalAction?: string;
  recoveryReason?: string; // Feature 9: Why did TRACE do this?
}

export interface ExecutionRun {
  runId: string;
  automationId: string;
  status: 'Running' | 'WaitingForApproval' | 'WaitingForUser' | 'Completed' | 'Failed' | 'Recovering' | 'Verifying' | 'Cancelled';
  currentStepIndex: number;
  stepResults: StepResult[];
  context?: Record<string, any>;
  startedAt: number;
  completedAt?: number;
  timeSaved?: number; // feature 8, 10
  executionType?: 'standard' | 'showcase';
}

// Preload Demo Automation
const demoSalesAutomation: AutomationPlan = {
  id: 'auto_demo_sales',
  name: 'Weekly Sales Report',
  workflowId: 'wf_demo',
  trigger: { type: 'manual' },
  status: 'Approved',
  version: 3,
  confidence: 96,
  estimatedManualDuration: 272, // 4m 32s
  timeSavedPerRun: 260, // 4m 20s
  successRate: 98,
  executionCount: 14,
  averageDuration: 12,
  applications: ['Excel', 'Email'],
  variables: ['current_week'],
  intent: 'Run my weekly sales report',
  steps: [
    { type: 'receive_weekly_sales_email' },
    { type: 'download_sales_csv' },
    { type: 'open_spreadsheet' },
    { type: 'clean_invalid_rows' },
    { type: 'calculate_total_sales' },
    { type: 'calculate_average_order_value' },
    { type: 'update_management_report' },
    { type: 'generate_summary' },
    { type: 'human_approval', originalAction: 'send_summary' }
  ]
};

import fs from 'fs';
import path from 'path';

// Local In-Memory Fallback with JSON persistence
const DB_FILE = path.join(process.cwd(), 'local_db.json');

let memoryWorkflows: Workflow[] = [];
let memorySessions: ObservationSession[] = [];
let memoryEvents: WorkflowEvent[] = [];
let memoryAutomations: AutomationPlan[] = [demoSalesAutomation];
let memoryExecutions: ExecutionRun[] = [];
let observationSettings = { active: false };
let activeSessionId: string | null = null;
let cachedAiAnalysis: AiAnalysisResult | null = null;

// Load from disk
try {
  if (fs.existsSync(DB_FILE)) {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    memoryWorkflows = data.workflows || [];
    memorySessions = data.sessions || [];
    memoryEvents = data.events || [];
    memoryAutomations = data.automations || [demoSalesAutomation];
    memoryExecutions = data.executions || [];
    observationSettings = data.settings || { active: false };
    activeSessionId = data.activeSessionId || null;
    cachedAiAnalysis = data.cachedAiAnalysis || null;
  }
} catch (e) {
  console.error("Failed to load local DB", e);
}

// Save to disk helper
const saveLocalDB = () => {
  if (useFirestore) return;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      workflows: memoryWorkflows,
      sessions: memorySessions,
      events: memoryEvents,
      automations: memoryAutomations,
      executions: memoryExecutions,
      settings: observationSettings,
      activeSessionId,
      cachedAiAnalysis
    }, null, 2));
  } catch (e) {
    console.error("Failed to save local DB", e);
  }
};

export class DbService {
  async saveWorkflow(workflow: Workflow): Promise<void> {
    if (useFirestore) {
      await admin.firestore().collection('workflows').doc(workflow.id).set(workflow);
    } else {
      memoryWorkflows.push(workflow);
      saveLocalDB();
    }
  }

  getActiveWorkflowId() {
    return activeSessionId; // Keeping method name for compatibility with some files, but it returns sessionId
  }

  setActiveWorkflowId(id: string | null) {
    activeSessionId = id;
  }

  async saveSession(session: ObservationSession): Promise<void> {
    if (useFirestore) {
      await admin.firestore().collection('sessions').doc(session.id).set(session);
    } else {
      const idx = memorySessions.findIndex(s => s.id === session.id);
      if (idx >= 0) memorySessions[idx] = session;
      else memorySessions.push(session);
      saveLocalDB();
    }
  }

  async getSessionById(sessionId: string): Promise<ObservationSession | null> {
    if (useFirestore) {
      const doc = await admin.firestore().collection('sessions').doc(sessionId).get();
      return doc.exists ? (doc.data() as ObservationSession) : null;
    }
    return memorySessions.find(s => s.id === sessionId) || null;
  }

  async getSessions(): Promise<ObservationSession[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('sessions').orderBy('startedAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as ObservationSession);
    }
    return [...memorySessions].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getWorkflows(): Promise<Workflow[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('workflows').get();
      return snapshot.docs.map(doc => doc.data() as Workflow);
    }
    return [...memoryWorkflows];
  }

  async saveEvents(events: WorkflowEvent[]): Promise<void> {
    if (useFirestore) {
      const batch = admin.firestore().batch();
      events.forEach(event => {
        const ref = admin.firestore().collection('workflow_events').doc(event.id);
        batch.set(ref, event);
      });
      await batch.commit();
    } else {
      memoryEvents.push(...events);
      saveLocalDB();
    }
  }

  async getEventsByWorkflowId(workflowId: string): Promise<WorkflowEvent[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('workflow_events')
        .where('workflowId', '==', workflowId)
        .get();
      return snapshot.docs.map(doc => doc.data() as WorkflowEvent);
    }
    return memoryEvents.filter(e => e.workflowId === workflowId);
  }

  async getEventsBySessionId(sessionId: string): Promise<WorkflowEvent[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('workflow_events')
        .where('sessionId', '==', sessionId)
        .orderBy('timestamp', 'asc')
        .get();
      return snapshot.docs.map(doc => doc.data() as WorkflowEvent);
    }
    return memoryEvents.filter(e => e.sessionId === sessionId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async saveAutomation(plan: AutomationPlan): Promise<void> {
    if (useFirestore) {
      await admin.firestore().collection('automations').doc(plan.id).set(plan);
    } else {
      const idx = memoryAutomations.findIndex(a => a.id === plan.id);
      if (idx >= 0) memoryAutomations[idx] = plan;
      else memoryAutomations.push(plan);
      saveLocalDB();
    }
  }

  async getAutomationById(planId: string): Promise<AutomationPlan | null> {
    if (useFirestore) {
      const doc = await admin.firestore().collection('automations').doc(planId).get();
      return doc.exists ? (doc.data() as AutomationPlan) : null;
    }
    return memoryAutomations.find(a => a.id === planId) || null;
  }

  async getAllAutomations(): Promise<AutomationPlan[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('automations').get();
      return snapshot.docs.map(doc => doc.data() as AutomationPlan);
    }
    return [...memoryAutomations];
  }

  async deleteAutomation(planId: string): Promise<void> {
    if (useFirestore) {
      const batch = admin.firestore().batch();
      batch.delete(admin.firestore().collection('automations').doc(planId));
      
      const execs = await admin.firestore().collection('executions').where('automationId', '==', planId).get();
      execs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
    } else {
      memoryAutomations = memoryAutomations.filter(a => a.id !== planId);
      memoryExecutions = memoryExecutions.filter(e => e.automationId !== planId);
      saveLocalDB();
    }
  }

  async clearObservationData(): Promise<void> {
    if (useFirestore) {
      const batch = admin.firestore().batch();
      
      const events = await admin.firestore().collection('events').get();
      events.forEach(doc => batch.delete(doc.ref));
      
      const sessions = await admin.firestore().collection('sessions').get();
      sessions.forEach(doc => batch.delete(doc.ref));
      
      const workflows = await admin.firestore().collection('workflows').get();
      workflows.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
    } else {
      memoryEvents = [];
      memorySessions = [];
      memoryWorkflows = [];
      cachedAiAnalysis = null;
      saveLocalDB();
    }
  }

  async saveExecutionRun(run: ExecutionRun): Promise<void> {
    if (useFirestore) {
      await admin.firestore().collection('executions').doc(run.runId).set(run);
    } else {
      const idx = memoryExecutions.findIndex(e => e.runId === run.runId);
      if (idx >= 0) memoryExecutions[idx] = run;
      else memoryExecutions.push(run);
      saveLocalDB();
    }
  }

  async getExecutionRun(runId: string): Promise<ExecutionRun | null> {
    if (useFirestore) {
      const doc = await admin.firestore().collection('executions').doc(runId).get();
      return doc.exists ? (doc.data() as ExecutionRun) : null;
    }
    return memoryExecutions.find(e => e.runId === runId) || null;
  }

  async getLatestCompletedExecution(automationId: string): Promise<ExecutionRun | null> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('executions')
        .where('automationId', '==', automationId)
        .where('status', '==', 'Completed')
        .orderBy('completedAt', 'desc')
        .limit(1)
        .get();
      return snapshot.docs.length ? (snapshot.docs[0].data() as ExecutionRun) : null;
    }
    const completed = memoryExecutions.filter(e => e.automationId === automationId && e.status === 'Completed');
    return completed.sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))[0] || null;
  }

  async getAllExecutions(): Promise<ExecutionRun[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('executions').orderBy('startedAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as ExecutionRun);
    }
    return memoryExecutions.sort((a, b) => Number(b.startedAt) - Number(a.startedAt));
  }

  async getAllEvents(): Promise<WorkflowEvent[]> {
    if (useFirestore) {
      const snapshot = await admin.firestore().collection('events').orderBy('timestamp', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as WorkflowEvent);
    }
    return memoryEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getObservationSettings(): Promise<{ active: boolean }> {
    if (useFirestore) {
      const doc = await admin.firestore().collection('settings').doc('observation').get();
      return doc.exists ? (doc.data() as { active: boolean }) : { active: true };
    }
    return observationSettings;
  }

  async saveObservationSettings(settings: { active: boolean }): Promise<void> {
    if (useFirestore) {
      await admin.firestore().collection('settings').doc('observation').set(settings);
      return;
    }
    observationSettings = settings;
    saveLocalDB();
  }

  async saveAiAnalysis(analysis: AiAnalysisResult): Promise<void> {
    cachedAiAnalysis = analysis;
    if (useFirestore) {
      await admin.firestore().collection('settings').doc('ai_analysis').set(analysis);
    }
    saveLocalDB();
  }

  async getAiAnalysis(): Promise<AiAnalysisResult | null> {
    if (useFirestore) {
      const doc = await admin.firestore().collection('settings').doc('ai_analysis').get();
      return doc.exists ? (doc.data() as AiAnalysisResult) : null;
    }
    return cachedAiAnalysis;
  }
}
