import { Type, Schema } from '@google/genai';
import { AiRouter } from './router';

export interface IntentResult {
  intentType: 'run_workflow' | 'query' | 'unknown';
  searchQuery?: string;
  parameters: Record<string, string>;
  confidence: number;
}

export class IntentAgent {
  private router = new AiRouter();

  async classifyIntent(userInput: string): Promise<IntentResult> {
    if (!this.router.isAvailable()) {
      // Deterministic fallback
      return this.deterministicIntent(userInput);
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intentType: { type: Type.STRING },
        searchQuery: { type: Type.STRING },
        parameters: { type: Type.OBJECT }, // Not enforcing strict schema on inner fields, but gemini handles it.
        confidence: { type: Type.NUMBER }
      },
      required: ['intentType', 'confidence', 'parameters']
    };

    const systemPrompt = `You are the Intent Agent for TRACE. Analyze the user's natural language request.
Determine if they want to run a workflow (run_workflow), ask a question (query), or if it's unknown (unknown).
If run_workflow, extract a 'searchQuery' that represents the core action to match against saved workflows (e.g., "Run my weekly sales report" -> "weekly sales report").
Extract any dynamic values into 'parameters' (e.g., { "timeframe": "today" }).
Respond ONLY in JSON matching the schema.`;

    const result = await this.router.generateJson<any>(
      'simple', 
      systemPrompt, 
      userInput, 
      schema
    );

    if (result) {
      return {
        intentType: result.intentType as 'run_workflow' | 'query' | 'unknown',
        searchQuery: result.searchQuery,
        parameters: result.parameters || {},
        confidence: result.confidence || 0
      };
    }

    return this.deterministicIntent(userInput);
  }

  private deterministicIntent(input: string): IntentResult {
    const lower = input.toLowerCase();
    if (lower.includes('run') || lower.includes('open') || lower.includes('repeat') || lower.includes('do')) {
      // Naive extraction
      const query = lower.replace(/run|open|repeat|do|my|the|please/g, '').trim();
      return {
        intentType: 'run_workflow',
        searchQuery: query || input,
        parameters: {},
        confidence: 0.6
      };
    }
    return { intentType: 'unknown', parameters: {}, confidence: 0 };
  }
}
