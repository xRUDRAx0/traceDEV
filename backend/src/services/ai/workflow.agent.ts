import { Type, Schema } from '@google/genai';
import { AiRouter } from './router';
import { DbService, AutomationPlan } from '../db.service';

export interface WorkflowMatch {
  workflow: AutomationPlan;
  confidence: number;
}

export class WorkflowAgent {
  constructor(private dbService: DbService) {}

  async findMatchingWorkflow(searchQuery: string): Promise<WorkflowMatch | null> {
    const automations = await this.dbService.getAllAutomations();
    const approved = automations.filter(a => a.status === 'Approved');

    if (approved.length === 0) return null;

    // 1. Try deterministic exact/substring match first (Feature 13: Deterministic first)
    const lowerQuery = searchQuery.toLowerCase();
    for (const a of approved) {
      if (a.name.toLowerCase().includes(lowerQuery) || (a.intent && a.intent.toLowerCase().includes(lowerQuery))) {
        console.log(`[WORKFLOW AGENT] Deterministic match found: ${a.name}`);
        return { workflow: a, confidence: 0.95 };
      }
    }

    // 2. Fallback to AI semantic match if available
    const router = new AiRouter();
    if (!router.isAvailable()) return null;

    console.log(`[WORKFLOW AGENT] No deterministic match, falling back to AI semantic match`);
    
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        matchedId: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        reason: { type: Type.STRING }
      },
      required: ['matchedId', 'confidence', 'reason']
    };

    const systemPrompt = `You are the TRACE Workflow Agent. Find the best matching workflow for the user's search query.
Available workflows:
${approved.map(a => `- ID: ${a.id}, Name: ${a.name}, Intent: ${a.intent || 'N/A'}`).join('\n')}

If none match well, set matchedId to "none" and confidence to 0.`;

    const result = await router.generateJson<any>(
      'simple', 
      systemPrompt, 
      searchQuery, 
      schema
    );

    if (result && result.matchedId !== 'none' && result.confidence > 0.7) {
      const matched = approved.find(a => a.id === result.matchedId);
      if (matched) {
        return { workflow: matched, confidence: result.confidence };
      }
    }

    return null;
  }
}
