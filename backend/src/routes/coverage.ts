// backend/src/routes/coverage.ts
import express, { RequestHandler } from 'express';
import {
  CoverageRequest,
  ApiResponse,
  CoverageResponse,
  ValidationError,
  Medication
} from '../../../shared/types';
import { groqService } from '../services/groqService';

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

// Handler with strong typing
const coverageCheckHandler: RequestHandler<{}, ApiResponse<CoverageResponse | null>, CoverageRequest> =
  async (req, res) => {
    try {
      console.log('Coverage check request:', req.body);

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

      // Destructure validated body
      const { medication, insurancePlan, patientZipCode, pharmacyZipCode, quantity, daySupply } = req.body;

      // Phase 2: Use Groq to enhance medication data
      console.log('[Coverage] Starting Groq normalization for:', medication.name);
      let enhancedMedication: Medication;
      let groqDisclaimer = '';

      try {
        const normalizedResult = await groqService.normalizeMedication(medication.name);
        
        // Merge the original medication data with Groq's enhanced data
        enhancedMedication = {
          id: medication.id,
          name: normalizedResult.medication.name || medication.name,
          genericName: normalizedResult.medication.genericName || medication.genericName,
          brandName: normalizedResult.medication.brandName || medication.brandName,
          strength: normalizedResult.medication.strength || medication.strength,
          dosageForm: normalizedResult.medication.dosageForm || medication.dosageForm,
          ndc: normalizedResult.medication.ndc || medication.ndc
        };

        groqDisclaimer = ` (Enhanced by AI with ${Math.round(normalizedResult.confidence * 100)}% confidence)`;
        console.log('[Coverage] Groq normalization successful:', enhancedMedication.name);
        
      } catch (groqError) {
        console.warn('[Coverage] Groq normalization failed, using original data:', groqError);
        enhancedMedication = medication;
        groqDisclaimer = ' (AI enhancement unavailable)';
      }

      // TODO: Phase 3 - Add Toolhouse integration for coverage checking
      
      // Mock response with enhanced medication data
      const mockResponse: CoverageResponse = {
        medication: enhancedMedication,
        insurancePlan,
        isCovered: true,
        tier: 2,
        estimatedCopay: { min: 25, max: 35, currency: 'USD' },
        priorAuth: { required: false },
        suggestedAlternative: undefined,
        lastUpdated: new Date().toISOString(),
        disclaimer: `Phase 2 prototype: Medication normalized by AI${groqDisclaimer}. Coverage rules are still mock data.`
      };

      const successResp: ApiResponse<CoverageResponse> = {
        success: true,
        data: mockResponse,
        timestamp: new Date().toISOString()
      };

      return res.json(successResp);
    } catch (err) {
      console.error('Coverage check error:', err);
      const errorResp: ApiResponse<null> = {
        success: false,
        error: { message: 'Internal server error' },
        timestamp: new Date().toISOString()
      };
      return res.status(500).json(errorResp);
    }
  };

// Mount route
router.post('/check', coverageCheckHandler);

export default router;