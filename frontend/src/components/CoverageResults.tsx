// frontend/src/components/CoverageResults.tsx

import React from 'react';
import { CoverageResponse, OnboardingData } from '../../../shared/types';

interface CoverageResultsProps {
  result: CoverageResponse;
  onboardingData: OnboardingData;
  onNewSearch: () => void;
  onStartOver: () => void;
}

const CoverageResults: React.FC<CoverageResultsProps> = ({ 
  result, 
  onboardingData, 
  onNewSearch, 
  onStartOver 
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCoverageIcon = (isCovered: boolean) => {
    return isCovered ? '✅' : '❌';
  };

  const getPriorAuthIcon = (required: boolean) => {
    return required ? '🔒' : '✅';
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="user-info">
          <div className="greeting">
            {onboardingData.patientName ? `${onboardingData.patientName}'s` : 'Your'} Coverage Results
          </div>
          <div className="search-info">
            {result.medication.name} • {result.insurancePlan.carrier}
          </div>
        </div>
      </div>

      {/* Main Results Card */}
      <div className={`results-card ${result.isCovered ? 'covered' : 'not-covered'}`}>
        <div className="result-header">
          <div className="medication-info">
            <h2 className="medication-name">{result.medication.name}</h2>
            <div className="plan-name">{result.insurancePlan.carrier} - {result.insurancePlan.name}</div>
          </div>
          <div className="coverage-icon">
            {getCoverageIcon(result.isCovered)}
          </div>
        </div>

        <div className="result-grid">
          {/* Coverage Status */}
          <div className="result-item">
            <div className="result-label">Coverage</div>
            <div className={`result-value ${result.isCovered ? 'positive' : 'negative'}`}>
              {result.isCovered ? 'Covered' : 'Not Covered'}
            </div>
          </div>

          {/* Prior Authorization */}
          <div className="result-item">
            <div className="result-label">Prior Auth</div>
            <div className={`result-value ${result.priorAuth.required ? 'negative' : 'positive'}`}>
              {getPriorAuthIcon(result.priorAuth.required)}
              {result.priorAuth.required ? 'Required' : 'Not Required'}
            </div>
          </div>

          {/* Copay */}
          <div className="result-item">
            <div className="result-label">Copay</div>
            <div className="result-value copay">
              {result.estimatedCopay ? (
                result.estimatedCopay.min === result.estimatedCopay.max 
                  ? formatCurrency(result.estimatedCopay.min)
                  : `${formatCurrency(result.estimatedCopay.min)}–${formatCurrency(result.estimatedCopay.max)}`
              ) : (
                result.isCovered ? 'Contact plan' : 'Full price'
              )}
            </div>
          </div>

          {/* Tier (if covered) */}
          {result.tier && (
            <div className="result-item">
              <div className="result-label">Tier</div>
              <div className="result-value tier">
                Tier {result.tier}
              </div>
            </div>
          )}
        </div>

        {/* Prior Auth Details */}
        {result.priorAuth.required && (
          <div className="prior-auth-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <strong>Prior Authorization Required</strong>
              {result.priorAuth.reason && (
                <div className="warning-reason">{result.priorAuth.reason}</div>
              )}
              {result.priorAuth.estimatedApprovalTime && (
                <div className="warning-time">
                  Estimated approval time: {result.priorAuth.estimatedApprovalTime}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Alternative */}
      {result.suggestedAlternative && (
        <div className="alternative-card">
          <div className="alternative-header">
            <span className="alternative-icon">💡</span>
            <span className="alternative-title">Suggested Alternative</span>
          </div>
          
          <div className="alternative-content">
            <div className="alternative-info">
              <div className="alternative-name">
                {result.suggestedAlternative.medication.name}
                {result.suggestedAlternative.medication.genericName && 
                 result.suggestedAlternative.medication.genericName !== result.suggestedAlternative.medication.name && (
                  <span className="generic-name">
                    ({result.suggestedAlternative.medication.genericName})
                  </span>
                )}
              </div>
              <div className="alternative-benefits">
                <span className="benefit">
                  {getPriorAuthIcon(result.suggestedAlternative.priorAuth.required)}
                  {result.suggestedAlternative.priorAuth.required ? 'PA Required' : 'No PA Needed'}
                </span>
                <span className="benefit">
                  Tier {result.suggestedAlternative.tier}
                </span>
              </div>
            </div>
            
            <div className="alternative-savings">
              <div className="new-copay">
                {formatCurrency(result.suggestedAlternative.estimatedCopay.min)}
                {result.suggestedAlternative.estimatedCopay.min !== result.suggestedAlternative.estimatedCopay.max &&
                  `–${formatCurrency(result.suggestedAlternative.estimatedCopay.max)}`
                }
              </div>
              {result.estimatedCopay && result.suggestedAlternative.estimatedCopay.max < result.estimatedCopay.min && (
                <div className="savings-amount">
                  Save {formatCurrency(result.estimatedCopay.min - result.suggestedAlternative.estimatedCopay.max)}+
                </div>
              )}
            </div>
          </div>

          <div className="alternative-action">
            💬 <strong>Ask your doctor:</strong> "Can I use {result.suggestedAlternative.medication.name} instead?"
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="results-actions">
        <button 
          onClick={onNewSearch}
          className="btn-secondary"
        >
          Check Another Medication
        </button>
        
        <button 
          onClick={onStartOver}
          className="btn-outline"
        >
          New Patient
        </button>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <div className="disclaimer-icon">ℹ️</div>
        <div className="disclaimer-text">
          Results are estimates based on your plan's formulary. Actual costs may vary by pharmacy. 
          Always confirm with your pharmacist before purchasing.
        </div>
      </div>

      {/* Timestamp */}
      <div className="results-footer">
        Last updated: {new Date(result.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default CoverageResults;