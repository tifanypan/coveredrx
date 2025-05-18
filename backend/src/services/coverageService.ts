// backend/src/services/coverageService.ts
import { Medication, InsurancePlan, CoverageResponse, PriorAuthRequirement } from '../../../shared/types';
import { groqService } from './groqService';
import { toolhouseService, ToolhouseRAGRequest } from './toolhouseService';
import { formularyService } from './formularyService';
import { webResearchService } from './webResearchService';

export interface CoverageCheckRequest {
  medicationName: string;
  insurancePlan: InsurancePlan;
  patientZipCode: string;
  pharmacyZipCode: string;
  quantity?: number;
  daySupply?: number;
  includeWebResearch?: boolean; // NEW: Optional web research
}

export class CoverageService {
  async checkCoverage(request: CoverageCheckRequest): Promise<CoverageResponse> {
    console.log('[Coverage] Starting optimized coverage check...');
    const startTime = Date.now();
    
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

      // Step 2: SMART PARALLEL PROCESSING 
      console.log('[Coverage] Step 2: Starting smart parallel lookup...');
      
      // Always start local lookup first (it's fast)
      const localPromise = this.checkLocalFormulary(request.insurancePlan.id, normalizedResult.medication.name);
      
      // For demo purposes with RAG issues, prioritize local for common drugs
      const commonDrugs = ['lisinopril', 'metformin', 'atorvastatin', 'omeprazole', 'sertraline', 'amlodipine', 'humira', 'adalimumab'];
      const isCommonDrug = commonDrugs.some(drug => 
        normalizedResult.medication.name.toLowerCase().includes(drug.toLowerCase()) ||
        normalizedResult.medication.genericName?.toLowerCase().includes(drug.toLowerCase()) ||
        normalizedResult.medication.brandName?.toLowerCase().includes(drug.toLowerCase())
      );
      
      if (isCommonDrug && normalizedResult.confidence > 0.9) {
        console.log('[Coverage] Common drug with high confidence - checking local first');
        const localResult = await localPromise;
        
        if (localResult.isFound) {
          console.log('[Coverage] Found in local formulary - skipping RAG for speed');
          // Convert local result and return immediately
          const toolhouseResponse = {
            is_covered: true,
            tier: localResult.entry!.tier,
            copay: localResult.entry!.copay,
            prior_auth_required: localResult.entry!.prior_auth,
            prior_auth_details: localResult.entry!.prior_auth ? 'Prior authorization required by plan' : null,
            quantity_limits: localResult.entry!.quantity_limits || false,
            quantity_limit_details: localResult.entry!.quantity_limit_details || null,
            step_therapy_required: localResult.entry!.step_therapy || false,
            step_therapy_alternatives: localResult.entry!.step_therapy_alternatives || null,
            suggested_alternatives: localResult.entry!.alternatives?.map(alt => ({
              name: alt,
              tier: 1,
              copay: 10,
              prior_auth: false,
              reason: `Lower-cost alternative to ${normalizedResult.medication.name}`
            })) || null,
            pharmacy_notes: null,
            explanation: `Found in local ${request.insurancePlan.carrier} formulary as ${localResult.matchedName}`,
            data_source: 'local_formulary_fast'
          };
          
          const fastTime = Date.now() - startTime;
          console.log(`[Coverage] Fast local lookup completed in ${fastTime}ms`);
          
          // Step 3: Decide on web research
          let webResearch = undefined;
          if (request.includeWebResearch) {
            console.log('[Coverage] Starting optional web research...');
            try {
              // Trigger web research for expensive drugs or those with PA requirements
              if (toolhouseResponse.copay > 50 || toolhouseResponse.prior_auth_required) {
                webResearch = await webResearchService.findAlternatives(
                  normalizedResult.medication.name, 
                  toolhouseResponse.copay
                );
              }
            } catch (webError) {
              console.error('[Coverage] Web research failed:', webError);
              // Continue without web research
            }
          }
          
          // Build response immediately
          const priorAuth: PriorAuthRequirement = {
            required: toolhouseResponse.prior_auth_required,
            reason: toolhouseResponse.prior_auth_details || undefined,
            estimatedApprovalTime: toolhouseResponse.prior_auth_required ? '1-3 business days' : undefined
          };

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

          const totalTime = Date.now() - startTime;
          return {
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
            webResearch, // NEW: Include web research if performed
            lastUpdated: new Date().toISOString(),
            disclaimer: `Fast local lookup completed in ${totalTime}ms. Medication normalized with ${Math.round(normalizedResult.confidence * 100)}% confidence. ${toolhouseResponse.explanation}${webResearch ? ` Web research included ${webResearch.alternatives.length} additional alternatives.` : ''}`
          };
        }
      }
      
      // For uncommon drugs or if local didn't find it, try RAG in parallel
      const toolhouseRequest: ToolhouseRAGRequest = {
        medication_name: normalizedResult.medication.name,
        plan_id: request.insurancePlan.id,
        patient_zip: request.patientZipCode,
        pharmacy_zip: request.pharmacyZipCode
      };
      const ragPromise = toolhouseService.checkCoverage(toolhouseRequest);

      // Wait for both to complete or timeout
      const [localResult, ragResult] = await Promise.allSettled([localPromise, ragPromise]);

      let toolhouseResponse = null;
      let dataSource = 'unknown';

      // Prioritize successful results
      if (ragResult.status === 'fulfilled' && 
          ragResult.value.is_covered !== null && 
          ragResult.value.tier !== null &&
          ragResult.value.data_source !== 'toolhouse_timeout') {
        
        console.log('[Coverage] Using RAG result (complete data found)');
        toolhouseResponse = ragResult.value;
        dataSource = 'rag_primary';
        
      } else if (localResult.status === 'fulfilled' && localResult.value.isFound) {
        
        console.log('[Coverage] Using local formulary result');
        const local = localResult.value;
        
        // Convert local result to toolhouse format
        toolhouseResponse = {
          is_covered: true,
          tier: local.entry!.tier,
          copay: local.entry!.copay,
          prior_auth_required: local.entry!.prior_auth,
          prior_auth_details: local.entry!.prior_auth ? 'Prior authorization required by plan' : null,
          quantity_limits: local.entry!.quantity_limits || false,
          quantity_limit_details: local.entry!.quantity_limit_details || null,
          step_therapy_required: local.entry!.step_therapy || false,
          step_therapy_alternatives: local.entry!.step_therapy_alternatives || null,
          suggested_alternatives: local.entry!.alternatives?.map(alt => ({
            name: alt,
            tier: 1,
            copay: 10,
            prior_auth: false,
            reason: `Lower-cost alternative to ${normalizedResult.medication.name}`
          })) || null,
          pharmacy_notes: null,
          explanation: `Found in local ${request.insurancePlan.carrier} formulary as ${local.matchedName}`,
          data_source: 'local_formulary_fast'
        };
        dataSource = 'local_primary';
        
      } else {
        // Both failed - return not found
        console.log('[Coverage] Both RAG and local lookup failed');
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
          explanation: `${normalizedResult.medication.name} not found in available formularies. Please contact your insurance provider for coverage details.`,
          data_source: 'not_found_parallel'
        };
        dataSource = 'not_found';
      }

      // Log timing
      const parallelTime = Date.now() - startTime;
      console.log(`[Coverage] Parallel lookup completed in ${parallelTime}ms using ${dataSource}`);

      // Step 3: Optional Web Research
      let webResearch = undefined;
      if (request.includeWebResearch) {
        console.log('[Coverage] Starting web research...');
        try {
          // Determine what type of research to do
          if (!toolhouseResponse.is_covered || (toolhouseResponse.copay && toolhouseResponse.copay > 100)) {
            // Drug not covered or expensive - find alternatives
            webResearch = await webResearchService.findAlternatives(
              normalizedResult.medication.name, 
              toolhouseResponse.copay || undefined
            );
          } else if (toolhouseResponse.prior_auth_required) {
            // Prior auth required - research strategies
            webResearch = await webResearchService.researchPAStrategies(normalizedResult.medication.name);
          } else {
            // Just do price comparison
            webResearch = await webResearchService.findPriceComparison(normalizedResult.medication.name);
          }
          
          const webTime = Date.now() - startTime;
          console.log(`[Coverage] Web research completed in ${webTime}ms total`);
        } catch (webError) {
          console.error('[Coverage] Web research failed:', webError);
          // Continue without web research
        }
      }

      // Step 4: Build comprehensive response
      console.log('[Coverage] Step 4: Building comprehensive response...');
      
      // Map response to our format
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
      const finalTime = Date.now() - startTime;
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
        webResearch, // NEW: Include web research results
        lastUpdated: new Date().toISOString(),
        disclaimer: `AI-powered coverage check completed in ${finalTime}ms. Medication normalized with ${Math.round(normalizedResult.confidence * 100)}% confidence. ${toolhouseResponse.explanation}${webResearch ? ` Web research found ${webResearch.alternatives.length} additional alternatives and ${webResearch.priceComparisons.length} price comparisons.` : ''}`
      };

      console.log(`[Coverage] Coverage check completed successfully in ${finalTime}ms`);
      return response;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`[Coverage] Error in coverage check after ${totalTime}ms:`, error);
      
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
        disclaimer: `Error checking coverage after ${totalTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify with your insurance provider.`
      };
    }
  }

  // NEW: Method specifically for web research
  async performWebResearch(
    medicationName: string, 
    researchType: 'alternatives' | 'pricing' | 'pa-strategies' = 'alternatives'
  ) {
    console.log(`[Coverage] Performing ${researchType} research for ${medicationName}`);
    
    try {
      switch (researchType) {
        case 'alternatives':
          return await webResearchService.findAlternatives(medicationName);
        case 'pricing':
          return await webResearchService.findPriceComparison(medicationName);
        case 'pa-strategies':
          return await webResearchService.researchPAStrategies(medicationName);
        default:
          return await webResearchService.findAlternatives(medicationName);
      }
    } catch (error) {
      console.error(`[Coverage] Web research failed:`, error);
      throw error;
    }
  }

  // Helper method for local formulary check
  private async checkLocalFormulary(planId: string, medicationName: string): Promise<{
    isFound: boolean;
    entry?: any;
    matchedName?: string;
  }> {
    // Add small delay to simulate async behavior and make timing more realistic
    await new Promise(resolve => setTimeout(resolve, 100));
    return formularyService.checkCoverage(planId, medicationName);
  }

  async healthCheck(): Promise<{ groq: boolean; toolhouse: boolean; webResearch: boolean }> {
    const [groqHealthy, toolhouseHealthy, webResearchHealthy] = await Promise.all([
      groqService.healthCheck(),
      toolhouseService.healthCheck(),
      webResearchService.healthCheck()
    ]);

    return {
      groq: groqHealthy,
      toolhouse: toolhouseHealthy,
      webResearch: webResearchHealthy
    };
  }
}

export const coverageService = new CoverageService();