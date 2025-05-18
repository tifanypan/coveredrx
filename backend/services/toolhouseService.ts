// backend/src/services/toolhouseService.ts
import fetch from 'node-fetch';

export interface ToolhouseRAGRequest {
  medication_name: string;
  plan_id: string;
  patient_zip: string;
  pharmacy_zip: string;
}

export interface ToolhouseCoverageResponse {
  is_covered: boolean;
  tier: number | null;
  copay: number | null;
  prior_auth_required: boolean;
  prior_auth_details: string | null;
  quantity_limits: boolean;
  quantity_limit_details: string | null;
  step_therapy_required: boolean;
  step_therapy_alternatives: string[] | null;
  suggested_alternatives: Array<{
    name: string;
    tier: number;
    copay: number;
    prior_auth: boolean;
    reason: string;
  }> | null;
  pharmacy_notes: string | null;
  explanation: string;
}

export class ToolhouseService {
  private apiKey: string;
  private ragFolderName = 'formulary_database';

  constructor() {
    this.apiKey = process.env.TOOLHOUSE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Toolhouse] API key not found. Set TOOLHOUSE_API_KEY environment variable.');
    }
  }

  async checkCoverage(request: ToolhouseRAGRequest): Promise<ToolhouseCoverageResponse> {
    try {
      console.log(`[Toolhouse] Checking coverage for ${request.medication_name} on ${request.plan_id}`);

      // Create the prompt for the RAG query
      const prompt = `You are a pharmacy benefits expert. A patient needs coverage information for this medication:
      
**Medication**: ${request.medication_name}
**Insurance Plan**: ${request.plan_id}
**Patient Details**: ZIP code ${request.patient_zip}, pharmacy ZIP ${request.pharmacy_zip}

Look up the medication in the formulary database for the specified insurance plan. 

Provide a detailed response with this exact JSON structure:
{
  "is_covered": true/false,
  "tier": 1-4 or null,
  "copay": number or null,
  "prior_auth_required": true/false,
  "prior_auth_details": "string or null",
  "quantity_limits": true/false,
  "quantity_limit_details": "string or null",
  "step_therapy_required": true/false,
  "step_therapy_alternatives": ["med1", "med2"] or null,
  "suggested_alternatives": [
    {
      "name": "alternative_name",
      "tier": 1-4,
      "copay": number,
      "prior_auth": true/false,
      "reason": "why this is a good alternative"
    }
  ],
  "pharmacy_notes": "any special pharmacy requirements",
  "explanation": "detailed explanation of coverage and why"
}

Always search the formulary database first. If the exact medication isn't found, look for similar medications or the generic equivalent. Return only valid JSON.`;

      // Make RAG query to Toolhouse
      const response = await fetch('https://api.toolhouse.ai/v1/rag/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folder: this.ragFolderName,
          query: prompt,
          model: 'gpt-4o-mini'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Toolhouse] API error:', response.status, errorText);
        throw new Error(`Toolhouse API error: ${response.status}`);
      }

      const result = await response.json();
      const aiResponse = result.response || result.answer || result.content;

      if (!aiResponse) {
        throw new Error('No response from Toolhouse RAG');
      }

      // Parse the JSON response from the AI
      let coverageData: ToolhouseCoverageResponse;
      try {
        // Extract JSON from the response if it's wrapped in text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        coverageData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('[Toolhouse] Failed to parse JSON response:', aiResponse);
        throw new Error('Invalid JSON response from Toolhouse');
      }

      console.log('[Toolhouse] Successfully checked coverage:', coverageData.is_covered ? 'Covered' : 'Not covered');
      return coverageData;

    } catch (error) {
      console.error('[Toolhouse] Error checking coverage:', error);
      
      // Return fallback response
      return {
        is_covered: false,
        tier: null,
        copay: null,
        prior_auth_required: false,
        prior_auth_details: null,
        quantity_limits: false,
        quantity_limit_details: null,
        step_therapy_required: false,
        step_therapy_alternatives: null,
        suggested_alternatives: null,
        pharmacy_notes: null,
        explanation: `Error checking coverage: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch('https://api.toolhouse.ai/v1/health', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      return response.ok;
    } catch (error) {
      console.error('[Toolhouse] Health check failed:', error);
      return false;
    }
  }
}

export const toolhouseService = new ToolhouseService();