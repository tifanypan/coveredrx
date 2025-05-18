// frontend/src/api/coverageApi.ts
import { ApiResponse, CoverageResponse, OnboardingData, PrescriptionData } from '../../../shared/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface CoverageCheckRequest {
  medication: {
    name: string;
  };
  insurancePlan: {
    id: string;
    name: string;
    carrier: string;
    type: string;
  };
  patientZipCode: string;
  pharmacyZipCode: string;
  quantity?: number;
  daySupply?: number;
}

class CoverageApiService {
  async checkHealth(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  async checkCoverage(
    onboardingData: OnboardingData, 
    prescriptionData: PrescriptionData
  ): Promise<CoverageResponse> {
    // Transform frontend data to backend format
    const requestData: CoverageCheckRequest = {
      medication: {
        name: prescriptionData.medicationName
      },
      insurancePlan: {
        id: onboardingData.insurancePlan,
        name: this.getInsurancePlanName(onboardingData.insurancePlan),
        carrier: this.getInsuranceCarrier(onboardingData.insurancePlan),
        type: this.getInsuranceType(onboardingData.insurancePlan)
      },
      patientZipCode: onboardingData.patientZipCode,
      pharmacyZipCode: prescriptionData.pharmacyZipCode,
      quantity: prescriptionData.quantity,
      daySupply: prescriptionData.daySupply
    };

    console.log('[API] Sending coverage request:', requestData);

    const response = await fetch(`${API_BASE_URL}/api/coverage/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Request failed: ${response.status}`);
    }

    const result: ApiResponse<CoverageResponse> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error?.message || 'Coverage check failed');
    }

    if (!result.data) {
      throw new Error('No coverage data returned');
    }

    console.log('[API] Coverage check successful:', result.data);
    return result.data;
  }

  private getInsurancePlanName(planId: string): string {
    const plans: { [key: string]: string } = {
      'aetna-choice-pos': 'Choice POS II',
      'bcbs-ppo-standard': 'Blue Choice PPO',
      'unitedhealth-hmo': 'UnitedHealthcare HMO',
      'cigna-hdhp': 'Cigna HDHP',
      'kaiser-hmo': 'Kaiser Permanente HMO'
    };
    return plans[planId] || 'Unknown Plan';
  }

  private getInsuranceCarrier(planId: string): string {
    const carriers: { [key: string]: string } = {
      'aetna-choice-pos': 'Aetna',
      'bcbs-ppo-standard': 'Blue Cross Blue Shield',
      'unitedhealth-hmo': 'UnitedHealthcare',
      'cigna-hdhp': 'Cigna',
      'kaiser-hmo': 'Kaiser Permanente'
    };
    return carriers[planId] || 'Unknown Carrier';
  }

  private getInsuranceType(planId: string): string {
    const types: { [key: string]: string } = {
      'aetna-choice-pos': 'POS',
      'bcbs-ppo-standard': 'PPO',
      'unitedhealth-hmo': 'HMO',
      'cigna-hdhp': 'HDHP',
      'kaiser-hmo': 'HMO'
    };
    return types[planId] || 'PPO';
  }
}

export const coverageApi = new CoverageApiService();