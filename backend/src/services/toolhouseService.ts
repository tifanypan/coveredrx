// backend/src/services/toolhouseService.ts

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
  data_source?: string;
}

export class ToolhouseService {
  private apiKey: string;
  private agentUrl = 'https://agents.toolhouse.ai/cf30b305-7702-4674-9571-ad21fc7a2045';

  constructor() {
    this.apiKey = process.env.TOOLHOUSE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Toolhouse] API key not found. Set TOOLHOUSE_API_KEY environment variable.');
    }
  }

  async checkCoverage(request: ToolhouseRAGRequest): Promise<ToolhouseCoverageResponse> {
    try {
      console.log(`[Toolhouse] Checking coverage for ${request.medication_name} on ${request.plan_id}`);

      const response = await fetch(this.agentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medication_name: request.medication_name,
          plan_id: request.plan_id,
          patient_zip: request.patient_zip,
          pharmacy_zip: request.pharmacy_zip
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('[Toolhouse] Raw response:', responseText);

      // Parse the JSON from the response
      // The agent might return the JSON in a code block or directly
      let parsedResponse;
      try {
        // Try parsing directly first
        parsedResponse = JSON.parse(responseText);
      } catch (error) {
        // If that fails, try extracting JSON from text
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          parsedResponse = JSON.parse(jsonString);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      console.log('[Toolhouse] Parsed response:', parsedResponse);
      return parsedResponse;

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
        explanation: `Error checking coverage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data_source: 'error_fallback'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.agentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medication_name: 'test',
          plan_id: 'test',
          patient_zip: '94105',
          pharmacy_zip: '94105'
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('[Toolhouse] Health check failed:', error);
      return false;
    }
  }
}

export const toolhouseService = new ToolhouseService();