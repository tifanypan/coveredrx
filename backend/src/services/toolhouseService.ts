// backend/src/services/toolhouseService.ts

// Use global fetch (Node 18+) or polyfill
declare const fetch: any;

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

    // Polyfill fetch for older Node versions
    if (typeof fetch === 'undefined') {
      (global as any).fetch = require('node-fetch');
    }
  }

  async checkCoverage(request: ToolhouseRAGRequest): Promise<ToolhouseCoverageResponse> {
    try {
      console.log(`[Toolhouse] Checking coverage for ${request.medication_name} on ${request.plan_id}`);

      // Since RAG API might not exist, let's simulate with a direct agent call
      // We'll make a simplified request to Toolhouse
      
      // Fallback: Return realistic mock data based on our formularies
      const mockResponse = this.getMockCoverageResponse(request);
      console.log('[Toolhouse] Using mock response for demo');
      return mockResponse;

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

  private getMockCoverageResponse(request: ToolhouseRAGRequest): ToolhouseCoverageResponse {
    // Mock realistic responses based on our formulary data
    const medication = request.medication_name.toLowerCase();
    const planId = request.plan_id;

    // Common medications with realistic coverage
    const commonMeds: { [key: string]: any } = {
      'lisinopril': {
        is_covered: true,
        tier: 1,
        copay: planId.includes('aetna') ? 10 : planId.includes('bcbs') ? 15 : 8,
        prior_auth_required: false,
        alternatives: ['enalapril', 'captopril', 'losartan']
      },
      'acetaminophen': {
        is_covered: true,
        tier: 1,
        copay: planId.includes('aetna') ? 10 : planId.includes('bcbs') ? 15 : 8,
        prior_auth_required: false,
        alternatives: ['ibuprofen', 'aspirin']
      },
      'tylenol': {
        is_covered: true,
        tier: 1,
        copay: planId.includes('aetna') ? 10 : planId.includes('bcbs') ? 15 : 8,
        prior_auth_required: false,
        alternatives: ['ibuprofen', 'aspirin']
      },
      'atorvastatin': {
        is_covered: true,
        tier: 1,
        copay: planId.includes('aetna') ? 10 : planId.includes('bcbs') ? 15 : 8,
        prior_auth_required: false,
        alternatives: ['simvastatin', 'rosuvastatin']
      },
      'humira': {
        is_covered: true,
        tier: 4,
        copay: planId.includes('aetna') ? 100 : planId.includes('bcbs') ? 150 : 75,
        prior_auth_required: true,
        alternatives: ['enbrel', 'remicade']
      },
      'xarelto': {
        is_covered: true,
        tier: 3,
        copay: planId.includes('aetna') ? 60 : planId.includes('bcbs') ? 70 : 50,
        prior_auth_required: true,
        alternatives: ['eliquis', 'warfarin']
      }
    };

    const medData = commonMeds[medication] || {
      is_covered: true,
      tier: 2,
      copay: planId.includes('aetna') ? 30 : planId.includes('bcbs') ? 40 : 25,
      prior_auth_required: false,
      alternatives: []
    };

    return {
      is_covered: medData.is_covered,
      tier: medData.tier,
      copay: medData.copay,
      prior_auth_required: medData.prior_auth_required,
      prior_auth_details: medData.prior_auth_required ? 'Prior authorization required - contact prescriber' : null,
      quantity_limits: false,
      quantity_limit_details: null,
      step_therapy_required: false,
      step_therapy_alternatives: null,
      suggested_alternatives: medData.alternatives?.map((alt: string) => ({
        name: alt,
        tier: 1,
        copay: Math.max(5, medData.copay - 10),
        prior_auth: false,
        reason: `Lower cost alternative to ${request.medication_name}`
      })) || null,
      pharmacy_notes: medData.tier === 4 ? 'Specialty pharmacy required' : null,
      explanation: `Based on ${planId} formulary: ${medication} is ${medData.is_covered ? 'covered' : 'not covered'} at Tier ${medData.tier} with ${medData.copay} copay.${medData.prior_auth_required ? ' Prior authorization required.' : ''}`
    };
  }

  async healthCheck(): Promise<boolean> {
    // For hackathon, always return true since we're using mock data
    return true;
  }
}

export const toolhouseService = new ToolhouseService();