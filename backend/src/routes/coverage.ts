
// backend/src/routes/coverage.ts
import express, { RequestHandler } from 'express';
import {
  CoverageRequest,
  ApiResponse,
  CoverageResponse,
  ValidationError,
  WebResearchResult
} from '../../../shared/types';
import { coverageService } from '../services/coverageService';

const router = express.Router();

// Validation helper
const validateCoverageRequest = (body: CoverageRequest): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!body.medication?.name || typeof body.medication.name !== 'string') {
    errors.push({ field: 'medication.name', message: 'Medication name is required' });
  }
  if (!body.insurancePlan?.id || typeof body.insurancePlan.id !== 'string') {
    errors.push({ field: 'insurancePlan.id', message: 'Insurance plan ID is required' });
  }
  if (!body.patientZipCode || typeof body.patientZipCode !== 'string') {
    errors.push({ field: 'patientZipCode', message: 'Patient ZIP code is required' });
  }
  if (body.patientZipCode && !/^\d{5}$/.test(body.patientZipCode)) {
    errors.push({ field: 'patientZipCode', message: 'ZIP code must be 5 digits' });
  }
  // pharmacyZipCode optional but if present, validate
  if (body.pharmacyZipCode && !/^\d{5}$/.test(body.pharmacyZipCode)) {
    errors.push({ field: 'pharmacyZipCode', message: 'Pharmacy ZIP code must be 5 digits' });
  }

  return errors;
};

// Enhanced coverage check handler with optional web research
const coverageCheckHandler: RequestHandler<{}, ApiResponse<CoverageResponse | null>, CoverageRequest & { includeWebResearch?: boolean }> =
  async (req, res) => {
    try {
      console.log('[API] Coverage check request received:', req.body.medication.name);
      console.log('[API] Include web research:', req.body.includeWebResearch || false);

      // Validate input
      const validationErrors = validateCoverageRequest(req.body);
      if (validationErrors.length > 0) {
        const errorResp: ApiResponse<null> = {
          success: false,
          error: { message: 'Validation failed', details: validationErrors },
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(errorResp);
      }

      // Use the enhanced coverage service with optional web research
      const coverageResult = await coverageService.checkCoverage({
        medicationName: req.body.medication.name,
        insurancePlan: req.body.insurancePlan,
        patientZipCode: req.body.patientZipCode,
        pharmacyZipCode: req.body.pharmacyZipCode || req.body.patientZipCode,
        quantity: req.body.quantity,
        daySupply: req.body.daySupply,
        includeWebResearch: req.body.includeWebResearch || false // NEW: Pass web research flag
      });

      const successResp: ApiResponse<CoverageResponse> = {
        success: true,
        data: coverageResult,
        timestamp: new Date().toISOString()
      };

      console.log('[API] Coverage check completed successfully');
      if (coverageResult.webResearch) {
        console.log(`[API] Included web research with ${coverageResult.webResearch.alternatives.length} alternatives`);
      }
      return res.json(successResp);

    } catch (err) {
      console.error('[API] Coverage check error:', err);
      const errorResp: ApiResponse<null> = {
        success: false,
        error: { message: 'Internal server error' },
        timestamp: new Date().toISOString()
      };
      return res.status(500).json(errorResp);
    }
  };

// NEW: Dedicated web research endpoint
const webResearchHandler: RequestHandler<{}, ApiResponse<WebResearchResult | null>, { 
  medicationName: string; 
  researchType?: 'alternatives' | 'pricing' | 'pa-strategies' 
}> = async (req, res) => {
  try {
    const { medicationName, researchType = 'alternatives' } = req.body;
    
    console.log(`[API] Web research request: ${medicationName} (${researchType})`);

    if (!medicationName || typeof medicationName !== 'string') {
      const errorResp: ApiResponse<null> = {
        success: false,
        error: { message: 'Medication name is required' },
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResp);
    }

    const researchResult = await coverageService.performWebResearch(medicationName, researchType);

    const successResp: ApiResponse<WebResearchResult> = {
      success: true,
      data: researchResult,
      timestamp: new Date().toISOString()
    };

    console.log(`[API] Web research completed: ${researchResult.alternatives.length} alternatives found`);
    return res.json(successResp);

  } catch (err) {
    console.error('[API] Web research error:', err);
    const errorResp: ApiResponse<null> = {
      success: false,
      error: { message: 'Web research failed', details: [{ field: 'general', message: err instanceof Error ? err.message : 'Unknown error' }] },
      timestamp: new Date().toISOString()
    };
    return res.status(500).json(errorResp);
  }
};

// Mount routes
router.post('/check', coverageCheckHandler);
router.post('/research', webResearchHandler); // NEW: Dedicated research endpoint

export default router;