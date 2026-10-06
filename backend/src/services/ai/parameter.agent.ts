import { Type, Schema } from '@google/genai';
import { AiRouter } from './router';

export class ParameterAgent {
  private router = new AiRouter();

  async resolveParameters(
    requiredVariables: string[],
    extractedParameters: Record<string, string>,
    userInput: string
  ): Promise<Record<string, string>> {
    const resolved: Record<string, string> = { ...extractedParameters };

    // Deterministic system variables
    for (const v of requiredVariables) {
      if (v === 'current_week' || v === 'timeframe') {
         if (!resolved[v]) resolved[v] = 'This Week'; // default
      }
      if (v === 'today_date') {
         resolved[v] = new Date().toLocaleDateString();
      }
    }

    const missing = requiredVariables.filter(v => !resolved[v]);
    
    if (missing.length === 0 || !this.router.isAvailable()) {
      return resolved;
    }

    // Use AI to extract missing parameters from the raw user input if possible
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        resolved: { type: Type.OBJECT }
      },
      required: ['resolved']
    };

    const systemPrompt = `You are the TRACE Parameter Agent.
Extract the missing variables from the user's input.
Missing variables: ${missing.join(', ')}
Return a JSON object mapping the variable name to the extracted value. If you cannot find it, do not include it.`;

    const result = await this.router.generateJson<any>(
      'simple', 
      systemPrompt, 
      userInput, 
      schema
    );

    if (result && result.resolved) {
      for (const [k, v] of Object.entries(result.resolved)) {
        resolved[k] = v as string;
      }
    }

    return resolved;
  }
}
