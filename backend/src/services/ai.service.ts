import { GoogleGenAI, Type, Schema } from '@google/genai';
import { BehavioralMetrics } from './intelligence.service';
import { AiAnalysisResult } from './db.service';
import { WorkflowEvent } from './db.service';

export interface Insight {
  id: string;
  title: string;
  category: 'Friction' | 'Automation' | 'Rework' | 'Data Transfer' | 'Context Switching' | string;
  severity: 'low' | 'medium' | 'high';
  observation: string;
  evidence: string;
  impact: string;
  recommendation: string;
  action: string;
  automationAvailable: boolean;
  rawEvidenceEvents?: WorkflowEvent[];
}

export class AiService {
  private ai: GoogleGenAI | null = null;
  private hasValidKey: boolean = false;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
        this.hasValidKey = true;
        console.log('Google GenAI initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize Google GenAI:', err);
      }
    } else {
      console.log('No GEMINI_API_KEY found. Falling back to deterministic AI service.');
    }
  }

  async generateDeepAnalysisFromMetrics(metricsList: BehavioralMetrics[]): Promise<AiAnalysisResult> {
    console.log(`Generating AI Analysis... (API Key Valid: ${this.hasValidKey})`);

    if (metricsList.length === 0) {
      return this.getEmptyFallback();
    }

    if (this.hasValidKey && this.ai) {
      try {
        return await this.callGemini(metricsList);
      } catch (error) {
        console.error('Gemini API call failed, falling back to deterministic:', error);
        return this.getDeterministicFallback(metricsList);
      }
    }

    return this.getDeterministicFallback(metricsList);
  }

  private async callGemini(metricsList: BehavioralMetrics[]): Promise<AiAnalysisResult> {
    const sanitizedMetrics = metricsList.map(m => ({
      workflowName: m.workflowName,
      totalEvents: m.totalEvents,
      durationMinutes: Math.round(m.durationSeconds / 60),
      repetitionCount: m.repetitionCount,
      applicationSwitches: m.applicationSwitches,
      copyPasteSequences: m.copyPasteSequences,
      reworkEvents: m.reworkEvents,
      applications: Array.from(new Set([
        ...m.evidence.contextSwitching.map(e => e.application),
        ...m.evidence.dataTransfer.map(e => e.application)
      ])),
      rawSequence: m.rawEvents?.map(e => ({
        app: e.application,
        action: e.action,
        target: e.target,
        title: e.metadata?.windowTitle,
        value: e.metadata?.typedText || e.metadata?.elementValue
      }))
    }));

    const systemPrompt = "You are WorkTwin's workflow intelligence engine. You analyze structured behavioral data collected from a permission-based desktop observation system. Your job is to identify meaningful workflow inefficiencies and convert raw observed user actions into an executable automation plan. You MUST: - use only supplied evidence - never invent metrics - extract deterministic semantic steps for browser automation (OPEN_BROWSER, NAVIGATE_URL, CLICK, TYPE, KEY_PRESS) - deduce URLs from window titles if necessary (e.g. 'Google Search' -> 'https://google.com') - preserve human approval for sensitive actions (emails, form submissions, deletions, financial actions) - return the required JSON structure. You MUST NOT: - claim to know something not present in the input - expose sensitive information - recommend automation solely because a task is repeated - automate sensitive actions without human approval. The input will be a JSON array of workflow metrics. Calculate the automation potential and generate insights.";

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        workflowName: { type: Type.STRING },
        summary: { type: Type.STRING },
        whyAutomate: { type: Type.STRING },
        automationPotential: { type: Type.INTEGER },
        recommendedAction: { type: Type.STRING },
        estimatedTimeSaving: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        insights: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              severity: { type: Type.STRING },
              observation: { type: Type.STRING },
              evidence: { type: Type.STRING },
              impact: { type: Type.STRING },
              recommendation: { type: Type.STRING },
              suggestedAction: { type: Type.STRING },
              automationAvailable: { type: Type.BOOLEAN }
            },
            required: ["title", "category", "severity", "observation", "evidence", "impact", "recommendation", "suggestedAction", "automationAvailable"]
          }
        },
        automationPlan: {
          type: Type.OBJECT,
          properties: {
            steps: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  target: { type: Type.STRING },
                  value: { type: Type.STRING },
                  url: { type: Type.STRING },
                  key: { type: Type.STRING }
                },
                required: ["action"]
              } 
            },
            humanApprovalSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING }
          },
          required: ["steps", "humanApprovalSteps", "reasoning"]
        }
      },
      required: ["workflowName", "summary", "whyAutomate", "automationPotential", "recommendedAction", "estimatedTimeSaving", "confidence", "insights", "automationPlan"]
    };

    const result = await this.ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify(sanitizedMetrics),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    const text = result.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    const parsed = JSON.parse(text) as AiAnalysisResult;
    
    // Attach deterministic raw evidence back to the AI insights
    if (parsed.insights && Array.isArray(parsed.insights)) {
      parsed.insights = parsed.insights.map((insight, idx) => {
        // Fallback to attaching all evidence from the top metric
        const targetMetric = metricsList[0];
        let evidence: any[] = [];
        if (targetMetric) {
           if (insight.category?.toLowerCase().includes('switch')) evidence = targetMetric.evidence.contextSwitching;
           else if (insight.category?.toLowerCase().includes('data') || insight.category?.toLowerCase().includes('transfer')) evidence = targetMetric.evidence.dataTransfer;
           else if (insight.category?.toLowerCase().includes('rework')) evidence = targetMetric.evidence.rework;
           else evidence = targetMetric.evidence.contextSwitching; // default fallback
        }
        
        return {
          ...insight,
          id: `ai_insight_${Date.now()}_${idx}`,
          rawEvidenceEvents: evidence
        };
      });
    }

    return parsed;
  }

  private getDeterministicFallback(metricsList: BehavioralMetrics[]): AiAnalysisResult {
    const highestSwitches = [...metricsList].sort((a, b) => b.applicationSwitches - a.applicationSwitches)[0];
    const highestCopyPaste = [...metricsList].sort((a, b) => b.copyPasteSequences - a.copyPasteSequences)[0];
    
    const targetWorkflow = highestCopyPaste || highestSwitches || metricsList[0];
    
    const insights = [];
    if (highestSwitches && highestSwitches.applicationSwitches > 3) {
      insights.push({
        title: 'Excessive Application Switching Detected',
        category: 'Context Switching',
        severity: highestSwitches.applicationSwitches > 10 ? 'high' : 'medium',
        observation: `You switched between applications ${highestSwitches.applicationSwitches} times during the "${highestSwitches.workflowName}" workflow.`,
        evidence: `Detected rapid transitions primarily between multiple apps.`,
        impact: `Context switching incurs a cognitive penalty and slows down task completion, adding approximately ${Math.round(highestSwitches.applicationSwitches * 1.5)} minutes of lost focus time.`,
        recommendation: `Consider using split-screen layouts or automating the data transfer to eliminate manual window toggling.`,
        suggestedAction: 'Optimize Workflow',
        automationAvailable: false,
        rawEvidenceEvents: highestSwitches.evidence.contextSwitching
      });
    }

    if (highestCopyPaste && highestCopyPaste.copyPasteSequences > 0) {
      insights.push({
        title: 'Manual Data Transfer Opportunity',
        category: 'Data Transfer',
        severity: highestCopyPaste.copyPasteSequences > 5 ? 'high' : 'medium',
        observation: `You manually copied and pasted data across applications ${highestCopyPaste.copyPasteSequences} times in "${highestCopyPaste.workflowName}".`,
        evidence: `Detected repeated clipboard copy actions immediately followed by application switches.`,
        impact: `Manual data entry is prone to human error and highly repetitive. Automating this could save approximately ${Math.round(highestCopyPaste.copyPasteSequences * 2.5)} minutes per session.`,
        recommendation: `WorkTwin can automatically map and transfer this data between these applications without manual copying.`,
        suggestedAction: 'Build Automation',
        automationAvailable: true,
        rawEvidenceEvents: highestCopyPaste.evidence.dataTransfer
      });
    }

    return {
      workflowName: targetWorkflow.workflowName,
      summary: `Deterministic fallback analysis identified key inefficiencies in ${targetWorkflow.workflowName}.`,
      whyAutomate: "Fallback deterministic analysis shows high repetition and context switching in this workflow.",
      automationPotential: targetWorkflow.automationPotential,
      recommendedAction: "Review deterministic insights and consider manual automation.",
      estimatedTimeSaving: "~15 min/run",
      confidence: 0.5,
      insights: insights.length > 0 ? insights : [{
        title: 'No significant friction detected',
        category: 'Friction',
        severity: 'low',
        observation: 'Workflow appears normal.',
        evidence: 'Metrics within standard bounds.',
        impact: 'N/A',
        recommendation: 'Continue monitoring.',
        suggestedAction: 'View Details',
        automationAvailable: false
      }],
      automationPlan: {
        steps: targetWorkflow.rawEvents && targetWorkflow.rawEvents.length > 0 
           ? [
               { action: 'OPEN_BROWSER', url: 'https://www.google.com' },
               ...targetWorkflow.rawEvents.map(e => ({
                 action: e.action === 'click' ? 'CLICK' : e.action === 'type' ? 'TYPE' : e.action === 'key_press' ? 'KEY_PRESS' : 'OPEN_BROWSER',
                 target: e.target || e.metadata?.elementName || undefined,
                 value: e.metadata?.typedText || e.metadata?.elementValue || undefined,
                 key: e.metadata?.key || undefined,
                 x: (e as any).x || e.metadata?.x,
                 y: (e as any).y || e.metadata?.y
               }))
             ]
           : [{ action: 'OPEN_BROWSER', url: 'https://www.google.com' }],
        humanApprovalSteps: [],
        reasoning: "Based on standard deterministic thresholds."
      }
    };
  }

  private getEmptyFallback(): AiAnalysisResult {
     return {
      workflowName: "Unknown",
      summary: "No data available for analysis.",
      whyAutomate: "N/A",
      automationPotential: 0,
      recommendedAction: "Record more sessions to gather data.",
      estimatedTimeSaving: "0 min",
      confidence: 0,
      insights: [],
      automationPlan: {
        steps: [],
        humanApprovalSteps: [],
        reasoning: "No data to automate."
      }
    };
  }
}
