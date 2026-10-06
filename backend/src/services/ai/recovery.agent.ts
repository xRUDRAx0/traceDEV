import { Type, Schema } from '@google/genai';
import { AiRouter } from './router';

export interface RecoveryResult {
  recovered: boolean;
  newTarget?: string;
  confidence: number;
  reason: string; // Feature 9: Why did TRACE do this?
}

export class RecoveryAgent {
  private router = new AiRouter();

  async attemptRecovery(
    expectedAction: string,
    expectedTarget: string,
    availableElements: string[],
    pageUrl: string
  ): Promise<RecoveryResult> {
    
    // Deterministic rules first (Feature 6: deterministic prefered)
    const lowerTarget = expectedTarget.toLowerCase();
    for (const el of availableElements) {
      if (el.toLowerCase() === lowerTarget || el.toLowerCase().includes(lowerTarget)) {
         return {
           recovered: true,
           newTarget: el,
           confidence: 0.9,
           reason: `Matches the expected target name closely ("${el}").`
         };
      }
    }

    if (!this.router.isAvailable()) {
      return { recovered: false, confidence: 0, reason: 'AI Router unavailable and deterministic match failed.' };
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        recovered: { type: Type.BOOLEAN },
        newTarget: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        reason: { type: Type.STRING }
      },
      required: ['recovered', 'confidence', 'reason']
    };

    const systemPrompt = `You are the TRACE Recovery Agent. A workflow execution step failed because the expected UI element could not be found.
You must find the closest matching element from the provided list of available elements on the page.
If a suitable replacement is found, set recovered=true, newTarget to the exact string of the new element, and explain why.
If no safe replacement exists, set recovered=false. Do not guess randomly. High confidence (>0.8) is required to proceed.`;

    const userPrompt = {
      expectedAction,
      expectedTarget,
      pageUrl,
      availableElementsList: availableElements.slice(0, 100) // cap to avoid token blowup
    };

    const result = await this.router.generateJson<any>(
      'reasoning', 
      systemPrompt, 
      userPrompt, 
      schema
    );

    if (result && result.recovered && result.confidence >= 0.8) {
      return {
        recovered: true,
        newTarget: result.newTarget,
        confidence: result.confidence,
        reason: result.reason
      };
    }

    return { 
      recovered: false, 
      confidence: result?.confidence || 0, 
      reason: result?.reason || 'Confidence too low to safely recover.' 
    };
  }
}
