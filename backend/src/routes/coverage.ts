// backend/src/routes/coverage.ts
import express, { RequestHandler } from 'express';
import {
  CoverageRequest,
  ApiResponse,
  CoverageResponse,
  ValidationError
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

// Handler with full AI integration
const coverageCheckHandler: RequestHandler<{}, ApiResponse<CoverageResponse | null>, CoverageRequest> =
  async (req, res) => {
    try {
      console.log('[API] Coverage check request received:', req.body.medication.name);

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

      // Use the orchestration service for full AI-powered coverage check
      const coverageResult = await coverageService.checkCoverage({
        medicationName: req.body.medication.name,
        insurancePlan: req.body.insurancePlan,
        patientZipCode: req.body.patientZipCode,
        pharmacyZipCode: req.body.pharmacyZipCode || req.body.patientZipCode,
        quantity: req.body.quantity,
        daySupply: req.body.daySupply
      });

      const successResp: ApiResponse<CoverageResponse> = {
        success: true,
        data: coverageResult,
        timestamp: new Date().toISOString()
      };

      console.log('[API] Coverage check completed successfully');
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

// Mount route
router.post('/check', coverageCheckHandler);

export default router;