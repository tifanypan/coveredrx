// frontend/src/components/OnboardingForm.tsx

import React, { useState } from 'react';
import { OnboardingData, InsurancePlan, ValidationError } from '../../../shared/types';

// Mock insurance plans for now
const MOCK_INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: 'aetna-choice-pos',
    name: 'Choice POS II',
    carrier: 'Aetna',
    type: 'POS',
    tier1Copay: 10,
    tier2Copay: 30,
    tier3Copay: 60
  },
  {
    id: 'bcbs-ppo-standard',
    name: 'Blue Choice PPO',
    carrier: 'Blue Cross Blue Shield',
    type: 'PPO',
    tier1Copay: 15,
    tier2Copay: 40,
    tier3Copay: 70
  },
  {
    id: 'unitedhealth-hmo',
    name: 'UnitedHealthcare HMO',
    carrier: 'UnitedHealthcare',
    type: 'HMO',
    tier1Copay: 8,
    tier2Copay: 25,
    tier3Copay: 50
  },
  {
    id: 'cigna-hdhp',
    name: 'Cigna HDHP',
    carrier: 'Cigna',
    type: 'HDHP',
    tier1Copay: 5,
    tier2Copay: 20,
    tier3Copay: 45
  },
  {
    id: 'kaiser-hmo',
    name: 'Kaiser Permanente HMO',
    carrier: 'Kaiser Permanente',
    type: 'HMO',
    tier1Copay: 12,
    tier2Copay: 35,
    tier3Copay: 65
  }
];

interface OnboardingFormProps {
  onComplete: (data: OnboardingData) => void;
  errors?: ValidationError[];
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({
  onComplete,
  errors = []
}) => {
  const [formData, setFormData] = useState<OnboardingData>({
    insurancePlan: '',
    patientZipCode: '',
    patientName: ''
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  const selectedPlan = MOCK_INSURANCE_PLANS.find(plan => plan.id === formData.insurancePlan);

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <div className="step-indicator">
          <div className="step active">
            <div className="step-number">1</div>
            <div className="step-label">Personal Details</div>
          </div>
          <div className="step-connector"></div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-label">Prescription Check</div>
          </div>
        </div>
        
        <h1 className="onboarding-title">Welcome to CoveredRx</h1>
        <p className="onboarding-subtitle">
          Let's start by setting up your insurance information. This will be saved for future prescription checks.
        </p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Patient Name (Optional) */}
          <div className="form-group">
            <label htmlFor="patientName" className="form-label">
              Your Name (Optional)
            </label>
            <input
              type="text"
              id="patientName"
              name="patientName"
              value={formData.patientName || ''}
              onChange={handleInputChange}
              className="form-input modern"
              placeholder="Enter your full name"
            />
            <div className="form-hint">
              This helps personalize your experience
            </div>
          </div>

          {/* Insurance Plan */}
          <div className="form-group">
            <label htmlFor="insurancePlan" className="form-label required">
              Insurance Plan
            </label>
            <select
              id="insurancePlan"
              name="insurancePlan"
              value={formData.insurancePlan}
              onChange={handleInputChange}
              className="form-input modern"
              required
            >
              <option value="">Select your insurance plan</option>
              {MOCK_INSURANCE_PLANS.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.carrier} - {plan.name}
                </option>
              ))}
            </select>
            {getFieldError('insurancePlan') && (
              <div className="form-error">{getFieldError('insurancePlan')}</div>
            )}
            {selectedPlan && (
              <div className="insurance-info">
                <div className="info-pill">
                  {selectedPlan.type} Plan
                </div>
                <div className="copay-info">
                  Typical copays: ${selectedPlan.tier1Copay} / ${selectedPlan.tier2Copay} / ${selectedPlan.tier3Copay}
                </div>
              </div>
            )}
          </div>

          {/* Patient ZIP Code */}
          <div className="form-group">
            <label htmlFor="patientZipCode" className="form-label required">
              Your ZIP Code
            </label>
            <input
              type="text"
              id="patientZipCode"
              name="patientZipCode"
              value={formData.patientZipCode}
              onChange={handleInputChange}
              className="form-input modern"
              placeholder="e.g., 94105"
              maxLength={5}
              pattern="[0-9]{5}"
              required
            />
            {getFieldError('patientZipCode') && (
              <div className="form-error">{getFieldError('patientZipCode')}</div>
            )}
            <div className="form-hint">
              Used to find nearby in-network pharmacies and regional pricing
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <div className="privacy-icon">🔒</div>
            <div className="privacy-text">
              <strong>Your privacy matters.</strong> We use bank-level encryption to protect your information. 
              Your data is never shared with third parties and is used only to provide prescription coverage information.
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary large"
            disabled={!formData.insurancePlan || !formData.patientZipCode}
          >
            Continue to Prescription Check
            <span className="btn-icon">→</span>
          </button>
        </form>
      </div>

      {/* Benefits Preview */}
      <div className="benefits-preview">
        <h3>What you'll get:</h3>
        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">⚡</div>
            <div className="benefit-text">
              <strong>Instant Results</strong>
              <span>Coverage info in under 5 seconds</span>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">💰</div>
            <div className="benefit-text">
              <strong>Cost Transparency</strong>
              <span>See exact copays before you leave</span>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">🔍</div>
            <div className="benefit-text">
              <strong>Smart Alternatives</strong>
              <span>Find cheaper covered options</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;