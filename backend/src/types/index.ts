// shared/types/index.ts

export interface Medication {
  id?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  ndc?: string; // National Drug Code
}

export interface InsurancePlan {
  id: string;
  name: string;
  carrier: string;
  type: 'PPO' | 'HMO' | 'EPO' | 'POS' | 'HDHP';
  tier1Copay?: number;
  tier2Copay?: number;
  tier3Copay?: number;
}

// Onboarding step data
export interface OnboardingData {
  insurancePlan: string;
  patientZipCode: string;
  patientName?: string;
}

// Prescription step data
export interface PrescriptionData {
  medicationName: string;
  pharmacyZipCode: string;
  quantity: number;
  daySupply: number;
}

// Combined form data for API
export interface CoverageRequest {
  medication: Medication;
  insurancePlan: InsurancePlan;
  patientZipCode: string;
  pharmacyZipCode: string;
  quantity?: number;
  daySupply?: number;
}

export interface PriorAuthRequirement {
  required: boolean;
  reason?: string;
  documentationNeeded?: string[];
  estimatedApprovalTime?: string;
  alternativeOptions?: Medication[];
}

// Add missing interfaces
export interface CopayEstimate {
  min: number;
  max: number;
  currency: 'USD';
}

export interface AlternativeMedication {
  name: string;
  tier: number;
  copay: number;
  prior_auth: boolean;
  reason: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: ValidationError[];
  };
  timestamp: string;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

// App state
export interface UserSession {
  onboardingData: OnboardingData | null;
  prescriptionData: PrescriptionData | null;
  coverageResult: CoverageResponse | null;
}

// Web research interfaces
export interface AlternativeDrug {
  name: string;
  genericName?: string;
  brandName?: string;
  cashPrice?: number;
  pharmacy?: string;
  source?: string;
  availability?: string;
  savings?: number;
}

export interface PriceComparison {
  pharmacy: string;
  price: number;
  discounts?: string[];
}

export interface PAStrategy {
  strategy: string;
  successRate?: string;
  requirements?: string[];
}

export interface WebResearchResult {
  query: string;
  searchTime: number;
  timestamp: string;
  alternatives: AlternativeDrug[];
  priceComparisons: PriceComparison[];
  paStrategies: PAStrategy[];
  patientPrograms: string[];
  summary: string;
  sources: string[];
}

// Single CoverageResponse interface (removed duplicates)
export interface CoverageResponse {
  medication: Medication;
  insurancePlan: InsurancePlan;
  isCovered: boolean;
  tier: number | null;
  estimatedCopay: CopayEstimate | null;
  priorAuth: PriorAuthRequirement;
  alternativeMedications?: AlternativeMedication[];
  
  // Web research data
  webResearch?: WebResearchResult;
  
  lastUpdated: string;
  disclaimer: string; // Made required and consistent
}