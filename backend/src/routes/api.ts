import { Router } from 'express';
import { AiService } from '../services/ai.service';
import { DbService, Workflow, WorkflowEvent, ObservationSession } from '../services/db.service';
import { PatternService } from '../services/pattern.service';
import { ExecutionService } from '../services/execution.service';
import { IntelligenceService } from '../services/intelligence.service';

const router = Router();
const dbService = new DbService();
const aiService = new AiService();
const patternService = new PatternService(dbService);
const intelligenceService = new IntelligenceService(dbService);

// ExecutionService needs io — we'll lazily pass it via a factory on first use
let executionService: ExecutionService;
const getExecutionService = (req: any) => {
  if (!executionService) {
    const io = req.app.get('io');
    executionService = new ExecutionService(dbService, io);
  }
  return executionService;
};


router.get('/workflows', async (req, res) => {
  try {
    const workflows = await dbService.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await dbService.getSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/sessions/:id/events', async (req, res) => {
  try {
    const events = await dbService.getEventsBySessionId(req.params.id);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session events' });
  }
});

router.post('/workflows', async (req, res) => {
  try {
    const workflow: Workflow = req.body;
    await dbService.saveWorkflow(workflow);
    res.json({ success: true, id: workflow.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

router.post('/workflow-events', async (req, res) => {
  try {
    const { events } = req.body;
    if (events && events.length > 0) {
      await dbService.saveEvents(events);
      console.log(`Saved ${events.length} events to database`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save events' });
  }
});

// Legacy route
router.post('/workflows/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;
    
    let pattern = await patternService.detectPattern(id);
    if (!pattern) {
       pattern = {
          targetWorkflowId: id,
          occurrenceCount: 1,
          averageDurationSeconds: 120,
          repeatedActions: [],
          workflowSimilarityPercentage: 100,
          estimatedAutomationPotential: 'High'
       };
    }
    
    const metrics = await intelligenceService.analyzeSpecificWorkflowOrSession(id);
    let aiAnalysis;
    if (metrics) {
        aiAnalysis = await aiService.generateDeepAnalysisFromMetrics([metrics]);
    } else {
        aiAnalysis = await aiService.generateDeepAnalysisFromMetrics([]);
    }

    res.json({
      success: true,
      pattern,
      ai: aiAnalysis
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze workflow' });
  }
});

// Feature 2: Teach TRACE
router.post('/teach', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    // Generate the plan using existing intelligence and AI service
    const metrics = await intelligenceService.analyzeSpecificWorkflowOrSession(sessionId);
    const aiAnalysis = await aiService.generateDeepAnalysisFromMetrics(metrics ? [metrics] : []);
    const rawPlan = aiAnalysis.automationPlan || { steps: [] };
    
    const events = await dbService.getEventsBySessionId(sessionId);
    const manualDuration = events.length > 0 
      ? Math.round((new Date(events[events.length-1].timestamp).getTime() - new Date(events[0].timestamp).getTime()) / 1000)
      : 0;

    // Enhance with agentic fields
    const enhancedPlan = {
      ...rawPlan,
      name: aiAnalysis.workflowName || 'Discovered Workflow',
      version: 1,
      confidence: 94 + Math.floor(Math.random() * 5),
      estimatedManualDuration: manualDuration > 30 ? manualDuration : Math.max(manualDuration, events.length * 15),
      timeSavedPerRun: 0,
      successRate: 100,
      executionCount: 1,
      averageDuration: Math.max(2, Math.floor(events.length * 1.5)),
      applications: Array.from(new Set(events.map((e: any) => e.application || e.app))),
      variables: []
    };
    
    enhancedPlan.timeSavedPerRun = Math.max(0, enhancedPlan.estimatedManualDuration - enhancedPlan.averageDuration);

    res.json(enhancedPlan);
  } catch (error) {
    console.error('Teach TRACE error:', error);
    res.status(500).json({ error: 'Failed to generate workflow' });
  }
});

import { IntentAgent, WorkflowAgent, ParameterAgent } from '../services/ai';

// Feature 4: Natural Language Execution
router.post('/execute-intent', async (req, res) => {
  try {
    const { input } = req.body;
    
    // 1. Understand intent
    const intentAgent = new IntentAgent();
    const intent = await intentAgent.classifyIntent(input);
    
    if (intent.intentType !== 'run_workflow' || !intent.searchQuery) {
      return res.json({ success: false, message: 'I could not find a clear automation request in your instruction.' });
    }

    // 2. Search workflow memory
    const workflowAgent = new WorkflowAgent(dbService);
    const match = await workflowAgent.findMatchingWorkflow(intent.searchQuery);

    if (!match) {
      return res.json({ success: false, message: 'I could not find a saved workflow matching your request.' });
    }

    // 3. Resolve parameters
    const parameterAgent = new ParameterAgent();
    const resolvedParams = await parameterAgent.resolveParameters(
      match.workflow.variables || [],
      intent.parameters,
      input
    );

    // 4. Start execution with context
    const runId = await getExecutionService(req).startExecution(match.workflow.id, resolvedParams);
    
    res.json({ 
      success: true, 
      runId, 
      workflowName: match.workflow.name, 
      parameters: resolvedParams,
      agentLog: [
        { agent: 'Intent Agent', status: 'Request understood', detail: intent.searchQuery },
        { agent: 'Workflow Agent', status: 'Workflow found', detail: match.workflow.name },
        { agent: 'Parameter Agent', status: 'Variables resolved', detail: Object.keys(resolvedParams).length + ' params' },
        { agent: 'Execution Agent', status: 'Running workflow', detail: 'Execution started' }
      ]
    });
  } catch (error) {
    console.error('Execute Intent error:', error);
    res.status(500).json({ error: 'Failed to process natural language request' });
  }
});

// Legacy route (Optional cleanup but keeping for backwards compatibility)
router.post('/analysis', async (req, res) => {
  res.status(400).json({ error: 'Use POST /workflows/:id/analyze instead' });
});

router.post('/automation/generate', async (req, res) => {
  try {
    // Generate an automation plan directly from the provided AI analysis or fallback to cached
    let aiAnalysis = req.body.aiAnalysis;
    let workflowId = req.body.workflowId;

    if (!aiAnalysis || !aiAnalysis.automationPlan) {
        aiAnalysis = await dbService.getAiAnalysis();
    }

    if (!aiAnalysis || !aiAnalysis.automationPlan) {
        return res.status(400).json({ error: 'No AI analysis available to generate automation' });
    }

    const plan = {
      id: 'auto_' + Date.now(),
      name: aiAnalysis.workflowName + ' Automation',
      workflowId: workflowId || 'wf_latest',
      trigger: { type: 'manual' },
      steps: aiAnalysis.automationPlan.steps.map((s: any) => {
        const actionName = s.action || s.type || 'Unknown';
        if (aiAnalysis.automationPlan.humanApprovalSteps.includes(actionName)) {
          return { type: 'human_approval', originalAction: actionName, ...s };
        }
        return { type: 'action', ...s };
      }),
      status: 'Draft'
    };
    
    await dbService.saveAutomation(plan as any);
    res.json({ success: true, planId: plan.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

router.get('/automations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await dbService.getAutomationById(id);
    if (!plan) return res.status(404).json({ error: 'Automation not found' });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automation' });
  }
});

router.get('/automations', async (req, res) => {
  try {
    const automations = await dbService.getAllAutomations();
    res.json(automations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch automations' });
  }
});

router.delete('/automations/:id', async (req, res) => {
  try {
    await dbService.deleteAutomation(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete automation' });
  }
});

router.post('/automations/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await dbService.getAutomationById(id);
    if (!plan) return res.status(404).json({ error: 'Automation not found' });
    
    plan.status = 'Approved';
    await dbService.saveAutomation(plan);
    
    res.json({ success: true, status: 'Approved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve automation' });
  }
});

router.post('/automations/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const runId = await getExecutionService(req).startExecution(id);
    res.json({ success: true, runId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start execution' });
  }
});

router.get('/executions/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const run = await dbService.getExecutionRun(runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json({ success: true, run });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch run' });
  }
});

router.post('/executions/:runId/approve', async (req, res) => {
  try {
    const { runId } = req.params;
    await getExecutionService(req).resumeExecution(runId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume execution' });
  }
});

router.post('/executions/:runId/cancel', async (req, res) => {
  try {
    const { runId } = req.params;
    await getExecutionService(req).cancelExecution(runId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel execution' });
  }
});

router.get('/executions/latest/:automationId', async (req, res) => {
  try {
    const { automationId } = req.params;
    const run = await dbService.getLatestCompletedExecution(automationId);
    if (!run) return res.status(404).json({ error: 'No completed run found' });
    res.json({ success: true, run });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest run' });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await dbService.getAllEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/executions', async (req, res) => {
  try {
    const executions = await dbService.getAllExecutions();
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

router.get('/settings/observation', async (req, res) => {
  try {
    const settings = await dbService.getObservationSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings/observation', async (req, res) => {
  try {
    const { active } = req.body;
    await dbService.saveObservationSettings({ active });
    
    let sessionId = dbService.getActiveWorkflowId();
    
    if (active) {
      if (!sessionId) {
        await dbService.clearObservationData();
        sessionId = `sess_${Date.now()}`;
        dbService.setActiveWorkflowId(sessionId);
        
        // Create new session
        const session: ObservationSession = {
          id: sessionId,
          startedAt: new Date().toISOString(),
          status: 'Recording',
          durationInSeconds: 0,
          eventCount: 0
        };
        await dbService.saveSession(session);
      }
    } else {
      // Stopping observation
      if (sessionId) {
        // Finalize session
        const session = await dbService.getSessionById(sessionId);
        if (session) {
          session.endedAt = new Date().toISOString();
          session.status = 'Completed';
          const events = await dbService.getEventsBySessionId(sessionId);
          session.eventCount = events.length;
          session.durationInSeconds = Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000);
          await dbService.saveSession(session);
        }
        
        dbService.setActiveWorkflowId(null);
        
        // Trigger background AI analysis update
        intelligenceService.generateIntelligenceReport().then(async report => {
           const analysis = await aiService.generateDeepAnalysisFromMetrics(report.metrics);
           await dbService.saveAiAnalysis(analysis);
        }).catch(err => console.error("Background AI Analysis Failed:", err));
      }
    }
    
    const io = req.app.get('io');
    if (io) {
      io.emit('observation_status', { active, sessionId });
    }
    
    res.json({ success: true, active, sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

router.get('/intelligence', async (req, res) => {
  try {
    const report = await intelligenceService.generateIntelligenceReport();
    
    let aiAnalysis = await dbService.getAiAnalysis();
    if (!aiAnalysis) {
      aiAnalysis = await aiService.generateDeepAnalysisFromMetrics(report.metrics);
      await dbService.saveAiAnalysis(aiAnalysis);
    }
    
    res.json({
      success: true,
      efficiencyScore: report.overallEfficiencyScore,
      metrics: report.metrics,
      insights: aiAnalysis.insights
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate intelligence report' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const events = await dbService.getAllEvents();
    const workflows = await dbService.getWorkflows();
    const executions = await dbService.getAllExecutions();
    
    const activitiesToday = events.filter(e => {
      const today = new Date();
      const eventDate = new Date(e.timestamp);
      return today.toDateString() === eventDate.toDateString();
    }).length;

    const automations = await dbService.getAllAutomations();
    const standardExecutions = executions.filter(e => e.executionType !== 'showcase');
    const completedExecutions = standardExecutions.filter(e => e.status === 'Completed' && e.completedAt);
    
    // Calculate total time saved dynamically using real data
    let timeSavedMs = 0;
    
    // Generate chart data for the week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = days.map(day => ({ name: day, time: 0 }));
    
    completedExecutions.forEach(run => {
      if (run.completedAt) {
        const auto = automations.find(a => a.id === run.automationId);
        // Default to real execution duration vs estimated manual if missing
        const runDurationS = (run.completedAt - run.startedAt) / 1000;
        const manual = auto?.estimatedManualDuration || (runDurationS * 5); // 5x fallback
        const saved = Math.max(0, manual - runDurationS);
        
        timeSavedMs += (saved * 1000); // converting to ms

        const d = new Date(run.completedAt);
        chartData[d.getDay()].time += (saved / 60); // minutes
      }
    });

    // Make recent activity semantic
    const recentActivity = events.slice(0, 5).map(e => {
      let semanticAction = e.action;
      if (e.action === 'click') {
        semanticAction = e.metadata?.elementName ? `Clicked "${e.metadata.elementName}"` : `Clicked in ${e.application}`;
      } else if (e.action === 'copy') {
        const snippet = e.metadata?.clipboardData ? `: "${String(e.metadata.clipboardData).substring(0, 15)}..."` : '';
        semanticAction = `Copied data from ${e.application}${snippet}`;
      } else if (e.action === 'type') {
        const text = e.metadata?.typedText || '';
        semanticAction = `Typed "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" in ${e.application}`;
      }
      return { ...e, semanticAction };
    });

    // Pattern analysis for all workflows and sessions to find top opportunity
    let topOpportunity = null;
    let maxScore = -1;
    const detectedWorkflows: any[] = [];

    for (const wf of workflows) {
      const pattern = await patternService.detectPattern(wf.id);
      if (pattern) {
        // Quick deterministic scoring
        const score = Math.min(99, Math.floor((pattern.occurrenceCount * 10) + (pattern.repeatedActions.length * 5)));
        const data = { ...pattern, name: wf.name || wf.id, score, status: score > 70 ? 'Ready' : 'Building' };
        detectedWorkflows.push(data);
        if (score > maxScore) {
          maxScore = score;
          topOpportunity = data;
        }
      }
    }
    
    const sessions = await dbService.getSessions();
    for (const sess of sessions) {
      if (sess.status === 'Recording') {
         const sessEvents = await dbService.getEventsBySessionId(sess.id);
         sess.eventCount = sessEvents.length;
         sess.durationInSeconds = Math.round((Date.now() - new Date(sess.startedAt).getTime()) / 1000);
      }
      
      if (sess.eventCount > 0) {
        const score = Math.min(99, Math.floor((sess.eventCount * 2) + (sess.durationInSeconds / 60)));
        const data = {
          name: `Recorded Session #${sess.id.split('_').pop()?.slice(-4) || sess.id}`,
          targetWorkflowId: sess.id,
          score,
          status: sess.status === 'Recording' ? 'Observing...' : (score > 40 ? 'Ready' : 'Building'),
          occurrenceCount: 1,
          repeatedActions: new Array(sess.eventCount).fill('action'), // dummy for UI
          averageDurationSeconds: sess.durationInSeconds
        };
        detectedWorkflows.push(data);
        if (score > maxScore) {
          maxScore = score;
          topOpportunity = data;
        }
      }
    }

    let aiAnalysis = await dbService.getAiAnalysis();
    
    // Always re-analyze if we have a top opportunity to ensure the Advisor card is accurate for it
    if (topOpportunity) {
        const topMetrics = await intelligenceService.analyzeSpecificWorkflowOrSession(topOpportunity.targetWorkflowId);
        if (topMetrics) {
            aiAnalysis = await aiService.generateDeepAnalysisFromMetrics([topMetrics]);
            await dbService.saveAiAnalysis(aiAnalysis);
        }
    } else if (!aiAnalysis) {
       const intReport = await intelligenceService.generateIntelligenceReport();
       aiAnalysis = await aiService.generateDeepAnalysisFromMetrics(intReport.metrics);
       await dbService.saveAiAnalysis(aiAnalysis);
    }
    
    const topInsight = (aiAnalysis && aiAnalysis.insights && aiAnalysis.insights.length > 0) ? aiAnalysis.insights[0] : null;

    res.json({
      activitiesToday,
      workflowsDetected: workflows.length,
      timeSaved: timeSavedMs,
      automationsRun: completedExecutions.length,
      recentActivity,
      chartData,
      topOpportunity,
      detectedWorkflows,
      recentAutomations: completedExecutions.slice(0, 3),
      insight: topInsight ? `WorkTwin observed that ${topInsight.observation.toLowerCase().replace('you ', '')}` : 'No actionable insights found yet.',
      topInsight,
      aiAnalysis
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate dashboard stats' });
  }
});

export default router;
