// backend/src/services/coverageService.ts
import { Medication, InsurancePlan, CoverageResponse, PriorAuthRequirement } from '../../../shared/types';
import { groqService } from './groqService';
import { toolhouseService, ToolhouseRAGRequest } from './toolhouseService';

export interface CoverageCheckRequest {
  medicationName: string;
  insurancePlan: InsurancePlan;
  patientZipCode: string;
  pharmacyZipCode: string;
  quantity?: number;
  daySupply?: number;
}

export class CoverageService {
  async checkCoverage(request: CoverageCheckRequest): Promise<CoverageResponse> {
    console.log('[Coverage] Starting full coverage check...');
    
    try {
      // Step 1: Normalize medication with Groq
      console.log('[Coverage] Step 1: Normalizing medication with Groq...');
      const normalizedResult = await groqService.normalizeMedication(request.medicationName);
      
      if (normalizedResult.confidence < 0.3) {
        console.warn('[Coverage] Very low confidence in medication normalization:', normalizedResult.confidence);
        
        // Return "not covered" response for invalid medications
        return {
          medication: {
            name: request.medicationName,
            genericName: 'Unknown',
            strength: 'Unknown',
            dosageForm: 'unknown'
          },
          insurancePlan: request.insurancePlan,
          isCovered: false,
          tier: null,
          estimatedCopay: null,
          priorAuth: {
            required: false
          },
          lastUpdated: new Date().toISOString(),
          disclaimer: `"${request.medicationName}" is not recognized as a valid medication. Please check the spelling or consult with your healthcare provider.`
        };
      }

      // Step 2: Check coverage with real formulary service
      console.log('[Coverage] Step 2: Checking coverage with real formulary...');
      const toolhouseRequest: ToolhouseRAGRequest = {
        medication_name: normalizedResult.medication.name,
        plan_id: request.insurancePlan.id,
        patient_zip: request.patientZipCode,
        pharmacy_zip: request.pharmacyZipCode
      };

      const toolhouseResponse = await toolhouseService.checkCoverage(toolhouseRequest);

      // Step 3: Build comprehensive response
      console.log('[Coverage] Step 3: Building comprehensive response...');
      
      // Map Toolhouse response to our format
      const priorAuth: PriorAuthRequirement = {
        required: toolhouseResponse.prior_auth_required,
        reason: toolhouseResponse.prior_auth_details || undefined,
        estimatedApprovalTime: toolhouseResponse.prior_auth_required ? '1-3 business days' : undefined
      };

      // Build suggested alternative if available
      let suggestedAlternative = undefined;
      if (toolhouseResponse.suggested_alternatives && toolhouseResponse.suggested_alternatives.length > 0) {
        const firstAlt = toolhouseResponse.suggested_alternatives[0];
        suggestedAlternative = {
          medication: {
            name: firstAlt.name,
            genericName: firstAlt.name, // Assume generic for now
          },
          tier: firstAlt.tier,
          estimatedCopay: {
            min: firstAlt.copay,
            max: firstAlt.copay,
            currency: 'USD' as const
          },
          priorAuth: {
            required: firstAlt.prior_auth
          }
        };
      }

      // Combine all information into final response
      const response: CoverageResponse = {
        medication: normalizedResult.medication,
        insurancePlan: request.insurancePlan,
        isCovered: toolhouseResponse.is_covered,
        tier: toolhouseResponse.tier,
        estimatedCopay: toolhouseResponse.copay ? {
          min: toolhouseResponse.copay,
          max: toolhouseResponse.copay,
          currency: 'USD'
        } : null,
        priorAuth,
        suggestedAlternative,
        lastUpdated: new Date().toISOString(),
        disclaimer: `AI-powered coverage check: Medication normalized with ${Math.round(normalizedResult.confidence * 100)}% confidence. ${toolhouseResponse.explanation}`
      };

      console.log('[Coverage] Coverage check completed successfully');
      return response;

    } catch (error) {
      console.error('[Coverage] Error in coverage check:', error);
      
      // Fallback response in case of errors
      return {
        medication: {
          name: request.medicationName,
          genericName: request.medicationName
        },
        insurancePlan: request.insurancePlan,
        isCovered: false,
        tier: null,
        estimatedCopay: null,
        priorAuth: {
          required: false
        },
        lastUpdated: new Date().toISOString(),
        disclaimer: `Error checking coverage: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify with your insurance provider.`
      };
    }
  }

  async healthCheck(): Promise<{ groq: boolean; toolhouse: boolean }> {
    const [groqHealthy, toolhouseHealthy] = await Promise.all([
      groqService.healthCheck(),
      toolhouseService.healthCheck()
    ]);

    return {
      groq: groqHealthy,
      toolhouse: toolhouseHealthy
    };
  }
}

export const coverageService = new CoverageService();