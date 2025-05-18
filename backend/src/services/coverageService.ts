// backend/src/services/coverageService.ts
import { Medication, InsurancePlan, CoverageResponse, PriorAuthRequirement } from '../../../shared/types';
import { groqService } from './groqService';
import { toolhouseService, ToolhouseRAGRequest } from './toolhouseService';
import { formularyService } from './formularyService';

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

      // Step 2: Try RAG first, but handle failures gracefully
      console.log('[Coverage] Step 2: Checking coverage with Toolhouse RAG...');
      let toolhouseResponse = null;
      
      try {
        const toolhouseRequest: ToolhouseRAGRequest = {
          medication_name: normalizedResult.medication.name,
          plan_id: request.insurancePlan.id,
          patient_zip: request.patientZipCode,
          pharmacy_zip: request.pharmacyZipCode
        };

        toolhouseResponse = await toolhouseService.checkCoverage(toolhouseRequest);
        
        // Check if RAG actually found data
        if (toolhouseResponse.is_covered === null || toolhouseResponse.tier === null) {
          console.log('[Coverage] RAG returned incomplete data, trying local formulary...');
          throw new Error('RAG returned incomplete data');
        }
        
        console.log('[Coverage] RAG found complete data, using RAG response');
        
      } catch (ragError) {
        console.log('[Coverage] RAG failed, falling back to local formulary:', ragError.message);
        
        // Step 2b: Fallback to local formulary
        const localResult = formularyService.checkCoverage(
          request.insurancePlan.id, 
          normalizedResult.medication.name
        );
        
        if (localResult.isFound && localResult.entry) {
          console.log('[Coverage] Found in local formulary:', localResult.matchedName);
          
          // Convert local result to toolhouse format
          toolhouseResponse = {
            is_covered: true,
            tier: localResult.entry.tier,
            copay: localResult.entry.copay,
            prior_auth_required: localResult.entry.prior_auth,
            prior_auth_details: localResult.entry.prior_auth ? 'Prior authorization required by plan' : null,
            quantity_limits: localResult.entry.quantity_limits || false,
            quantity_limit_details: localResult.entry.quantity_limit_details || null,
            step_therapy_required: localResult.entry.step_therapy || false,
            step_therapy_alternatives: localResult.entry.step_therapy_alternatives || null,
            suggested_alternatives: localResult.entry.alternatives?.map(alt => ({
              name: alt,
              tier: 1,
              copay: 10,
              prior_auth: false,
              reason: `Lower-cost alternative to ${normalizedResult.medication.name}`
            })) || null,
            pharmacy_notes: null,
            explanation: `Found in local ${request.insurancePlan.carrier} formulary as ${localResult.matchedName}`,
            data_source: 'local_formulary'
          };
        } else {
          console.log('[Coverage] Not found in local formulary either');
          // Use the error response from toolhouseService
          toolhouseResponse = {
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
            explanation: `${normalizedResult.medication.name} not found in ${request.insurancePlan.carrier} formulary. Please contact your insurance provider for coverage details.`,
            data_source: 'not_found'
          };
        }
      }

      // Step 3: Build comprehensive response
      console.log('[Coverage] Step 3: Building comprehensive response...');
      
      // Map Toolhouse response to our format
      const priorAuth: PriorAuthRequirement = {
        required: toolhouseResponse.prior_auth_required,
        reason: toolhouseResponse.prior_auth_details || undefined,
        estimatedApprovalTime: toolhouseResponse.prior_auth_required ? '1-3 business days' : undefined
      };

      // Build suggested alternatives if available
      let alternativeMedications = undefined;
      if (toolhouseResponse.suggested_alternatives && toolhouseResponse.suggested_alternatives.length > 0) {
        alternativeMedications = toolhouseResponse.suggested_alternatives.map(alt => ({
          name: alt.name,
          tier: alt.tier,
          copay: alt.copay,
          prior_auth: alt.prior_auth,
          reason: alt.reason
        }));
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
        alternativeMedications,
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