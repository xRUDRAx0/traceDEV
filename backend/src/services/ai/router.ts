import { GoogleGenAI, Type, Schema } from '@google/genai';

export type TaskComplexity = 'simple' | 'reasoning' | 'vision';

export class AiRouter {
  private ai: GoogleGenAI | null = null;
  private hasValidKey: boolean = false;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
        this.hasValidKey = true;
      } catch (err) {
        console.error('Failed to initialize Google GenAI Router:', err);
      }
    }
  }

  isAvailable(): boolean {
    return this.hasValidKey;
  }

  private getModelName(complexity: TaskComplexity): string {
    switch (complexity) {
      case 'simple':
        return 'gemini-2.5-flash-8b'; // fast classification
      case 'vision':
        return 'gemini-2.5-pro'; // better for UI extraction and screenshots
      case 'reasoning':
        return 'gemini-2.5-pro'; // complex workflow generation
      default:
        return 'gemini-2.5-flash';
    }
  }

  async generateJson<T>(
    complexity: TaskComplexity, 
    systemPrompt: string, 
    userPrompt: string | object, 
    schema: Schema
  ): Promise<T | null> {
    if (!this.ai) {
      console.warn('AI Router: API key not available, falling back to deterministic');
      return null;
    }

    const model = this.getModelName(complexity);
    
    // Log routing decision (Feature 13 requirement)
    console.log(`[AI ROUTER] Routing task (Complexity: ${complexity}) to model: ${model}`);

    try {
      const contentStr = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
      
      const result = await this.ai.models.generateContent({
        model: model,
        contents: contentStr,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: complexity === 'reasoning' ? 0.7 : 0.1,
        }
      });

      const text = result.text;
      if (!text) return null;

      return JSON.parse(text) as T;
    } catch (error: any) {
      // Fallback logic (Feature 13 fallback requirement)
      console.error(`[AI ROUTER ERROR] Failed on model ${model}:`, error.message);
      
      // If we failed on a larger model, try fallback to flash
      if (model !== 'gemini-2.5-flash') {
        console.log(`[AI ROUTER] Falling back to gemini-2.5-flash...`);
        try {
          const contentStr = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
          const fbResult = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contentStr,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: schema,
              temperature: 0.1,
            }
          });
          if (fbResult.text) return JSON.parse(fbResult.text) as T;
        } catch(fbErr) {
          console.error(`[AI ROUTER FALLBACK ERROR]`, fbErr);
        }
      }
      return null;
    }
  }
}
