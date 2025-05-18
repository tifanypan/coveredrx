// frontend/src/components/PrescriptionForm.tsx

import React, { useState } from 'react';
import { PrescriptionData, OnboardingData, ValidationError } from '../../../shared/types';

interface PrescriptionFormProps {
  onboardingData: OnboardingData;
  onSubmit: (data: PrescriptionData) => void;
  onBack: () => void;
  isLoading?: boolean;
  errors?: ValidationError[];
}

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({
  onboardingData,
  onSubmit,
  onBack,
  isLoading = false,
  errors = []
}) => {
  const [formData, setFormData] = useState<PrescriptionData>({
    medicationName: '',
    pharmacyZipCode: onboardingData.patientZipCode, // Default to patient ZIP
    quantity: 30,
    daySupply: 30
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'daySupply' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  return (
    <div className="prescription-container">
      <div className="prescription-header">
        <div className="step-indicator">
          <div className="step completed">
            <div className="step-number">✓</div>
            <div className="step-label">Personal Details</div>
          </div>
          <div className="step-connector completed"></div>
          <div className="step active">
            <div className="step-number">2</div>
            <div className="step-label">Prescription Check</div>
          </div>
        </div>

        <div className="user-info">
          <div className="greeting">
            {onboardingData.patientName ? `Hello, ${onboardingData.patientName}!` : 'Ready to check your prescription?'}
          </div>
          <div className="insurance-badge">
            <span className="badge-icon">🛡️</span>
            <span className="badge-text">Insurance: Connected</span>
          </div>
        </div>
        
        <h1 className="prescription-title">Check Prescription Coverage</h1>
        <p className="prescription-subtitle">
          Enter the medication prescribed by your doctor to see coverage, costs, and alternatives.
        </p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Medication Name */}
          <div className="form-group focus-group">
            <label htmlFor="medicationName" className="form-label required">
              Prescribed Medication
            </label>
            <input
              type="text"
              id="medicationName"
              name="medicationName"
              value={formData.medicationName}
              onChange={handleInputChange}
              className="form-input modern large"
              placeholder="e.g., Lisinopril, Metformin, Atorvastatin"
              required
              disabled={isLoading}
              autoFocus
            />
            {getFieldError('medicationName') && (
              <div className="form-error">{getFieldError('medicationName')}</div>
            )}
            <div className="form-hint">
              💡 Enter brand name or generic name - our AI will help identify the medication
            </div>
          </div>

          {/* Pharmacy ZIP Code */}
          <div className="form-group">
            <label htmlFor="pharmacyZipCode" className="form-label">
              Pharmacy ZIP Code
            </label>
            <input
              type="text"
              id="pharmacyZipCode"
              name="pharmacyZipCode"
              value={formData.pharmacyZipCode}
              onChange={handleInputChange}
              className="form-input modern"
              placeholder="e.g., 94105"
              maxLength={5}
              pattern="[0-9]{5}"
              disabled={isLoading}
            />
            {getFieldError('pharmacyZipCode') && (
              <div className="form-error">{getFieldError('pharmacyZipCode')}</div>
            )}
            <div className="form-hint">
              Different from your home ZIP? Update to check local pharmacy pricing
            </div>
          </div>

          {/* Quantity and Day Supply */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                className="form-input modern"
                min="1"
                max="365"
                disabled={isLoading}
              />
              {getFieldError('quantity') && (
                <div className="form-error">{getFieldError('quantity')}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="daySupply" className="form-label">
                Day Supply
              </label>
              <input
                type="number"
                id="daySupply"
                name="daySupply"
                value={formData.daySupply}
                onChange={handleInputChange}
                className="form-input modern"
                min="1"
                max="365"
                disabled={isLoading}
              />
              {getFieldError('daySupply') && (
                <div className="form-error">{getFieldError('daySupply')}</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
              disabled={isLoading}
            >
              ← Back
            </button>
            
            <button
              type="submit"
              className="btn-primary large"
              disabled={isLoading || !formData.medicationName}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Checking Coverage...
                </>
              ) : (
                <>
                  Check Coverage & Cost
                  <span className="btn-icon">🔍</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="tips-card">
        <h3>💡 Quick Tips</h3>
        <ul className="tips-list">
          <li>Don't know the exact name? Just type what you remember - our AI is smart!</li>
          <li>Results include all covered alternatives to save you money</li>
          <li>Prior authorization requirements are flagged instantly</li>
        </ul>
      </div>
    </div>
  );
};

export default PrescriptionForm;