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
  private timeout = 5000; // 5 seconds timeout instead of 30+

  constructor() {
    this.apiKey = process.env.TOOLHOUSE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Toolhouse] API key not found. Set TOOLHOUSE_API_KEY environment variable.');
    }
  }

  async checkCoverage(request: ToolhouseRAGRequest): Promise<ToolhouseCoverageResponse> {
    const startTime = Date.now();
    console.log(`[Toolhouse] Starting coverage check for ${request.medication_name}`);

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log(`[Toolhouse] Request timed out after ${this.timeout}ms`);
      }, this.timeout);

      console.log(`[Toolhouse] Querying with ${this.timeout}ms timeout...`);

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
        }),
        signal: controller.signal // Add timeout signal
      });

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[Toolhouse] Response received in ${elapsed}ms`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('[Toolhouse] Raw response:', responseText);

      // Parse the JSON from the response
      let parsedResponse;
      
      // Quick check - if response doesn't look like JSON, fail fast
      if (!responseText.includes('{') && !responseText.includes('```json')) {
        console.log('[Toolhouse] Response is plain text, not JSON - failing fast');
        throw new Error('Toolhouse returned plain text, not JSON data');
      }
      
      try {
        // Try parsing directly first
        parsedResponse = JSON.parse(responseText);
      } catch (error) {
        // If that fails, try extracting JSON from text (but with timeout)
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          try {
            parsedResponse = JSON.parse(jsonString);
          } catch (parseError) {
            console.log('[Toolhouse] Failed to parse extracted JSON - failing fast');
            throw new Error('Invalid JSON in response');
          }
        } else {
          console.log('[Toolhouse] No JSON found in response - failing fast');
          throw new Error('No valid JSON found in response');
        }
      }

      console.log(`[Toolhouse] Successfully parsed response in ${Date.now() - startTime}ms total`);
      return parsedResponse;

    } catch (error) {
      const elapsed = Date.now() - startTime;
      
      if ((error as any).name === 'AbortError') {
        console.log(`[Toolhouse] Request aborted after ${elapsed}ms timeout - falling back to local`);
      } else {
        console.error(`[Toolhouse] Error after ${elapsed}ms:`, error);
      }
      
      // Return fallback response for any error (including timeout)
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
        explanation: `Toolhouse timeout after ${elapsed}ms - using local formulary data`,
        data_source: 'toolhouse_timeout'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s for health check

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
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('[Toolhouse] Health check failed:', error);
      return false;
    }
  }

  // Method to adjust timeout if needed
  setTimeout(milliseconds: number): void {
    this.timeout = milliseconds;
    console.log(`[Toolhouse] Timeout updated to ${milliseconds}ms`);
  }
}

export const toolhouseService = new ToolhouseService();