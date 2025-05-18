// frontend/src/components/CoverageResults.tsx

import React from 'react';
import { CoverageResponse, OnboardingData } from '../../../shared/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <span className="text-lg font-bold text-gray-900">CoveredRx</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Results Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {onboardingData.patientName ? `${onboardingData.patientName}'s` : 'Your'} Coverage Results
          </h1>
          <p className="text-gray-600">
            {result.medication.name} • {result.insurancePlan.carrier}
          </p>
        </div>

        {/* Main Results Card */}
        <Card className={`shadow-lg border-2 mb-8 ${
          result.isCovered 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-1">{result.medication.name}</CardTitle>
                <CardDescription className="text-base">
                  {result.insurancePlan.carrier} - {result.insurancePlan.name}
                </CardDescription>
              </div>
              <div className="text-4xl">
                {getCoverageIcon(result.isCovered)}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Coverage Status */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Coverage</div>
                <div className={`text-lg font-semibold ${
                  result.isCovered ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.isCovered ? 'Covered' : 'Not Covered'}
                </div>
              </div>

              {/* Prior Authorization */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Prior Auth</div>
                <div className={`text-lg font-semibold ${
                  result.priorAuth.required ? 'text-red-700' : 'text-green-700'
                }`}>
                  <div className="flex items-center justify-center gap-1">
                    {getPriorAuthIcon(result.priorAuth.required)}
                    {result.priorAuth.required ? 'Required' : 'Not Required'}
                  </div>
                </div>
              </div>

              {/* Copay */}
              <div className="text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Copay</div>
                <div className="text-lg font-semibold text-gray-900">
                  {result.estimatedCopay ? (
                    result.estimatedCopay.min === result.estimatedCopay.max 
                      ? formatCurrency(result.estimatedCopay.min)
                      : `${formatCurrency(result.estimatedCopay.min)}–${formatCurrency(result.estimatedCopay.max)}`
                  ) : (
                    result.isCovered ? 'Contact plan' : 'Full price'
                  )}
                </div>
              </div>

              {/* Tier */}
              {result.tier && (
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-500 mb-1">Tier</div>
                  <div className="text-lg font-semibold text-gray-900">
                    Tier {result.tier}
                  </div>
                </div>
              )}
            </div>

            {/* Prior Auth Warning */}
            {result.priorAuth.required && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-xl">⚠️</span>
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Prior Authorization Required</h4>
                    {result.priorAuth.reason && (
                      <p className="text-sm text-amber-800 mb-2">{result.priorAuth.reason}</p>
                    )}
                    {result.priorAuth.estimatedApprovalTime && (
                      <p className="text-sm text-amber-700">
                        <span className="font-medium">Estimated approval time:</span> {result.priorAuth.estimatedApprovalTime}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Alternative */}
        {result.suggestedAlternative && (
          <Card className="shadow-lg border border-blue-200 bg-blue-50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                💡 Suggested Alternative
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    {result.suggestedAlternative.medication.name}
                    {result.suggestedAlternative.medication.genericName && 
                     result.suggestedAlternative.medication.genericName !== result.suggestedAlternative.medication.name && (
                      <span className="text-blue-700 font-normal ml-2">
                        ({result.suggestedAlternative.medication.genericName})
                      </span>
                    )}
                  </h3>
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.suggestedAlternative.priorAuth.required
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {getPriorAuthIcon(result.suggestedAlternative.priorAuth.required)}
                      {result.suggestedAlternative.priorAuth.required ? 'PA Required' : 'No PA Needed'}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Tier {result.suggestedAlternative.tier}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-blue-900 font-medium mb-2">
                      💬 <span className="font-semibold">Ask your doctor:</span>
                    </p>
                    <p className="text-blue-800">
                      "Can I use {result.suggestedAlternative.medication.name} instead?"
                    </p>
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <div className="text-2xl font-bold text-blue-900 mb-1">
                    {formatCurrency(result.suggestedAlternative.estimatedCopay.min)}
                    {result.suggestedAlternative.estimatedCopay.min !== result.suggestedAlternative.estimatedCopay.max &&
                      `–${formatCurrency(result.suggestedAlternative.estimatedCopay.max)}`
                    }
                  </div>
                  {result.estimatedCopay && result.suggestedAlternative.estimatedCopay.max < result.estimatedCopay.min && (
                    <div className="text-green-700 font-semibold">
                      Save {formatCurrency(result.estimatedCopay.min - result.suggestedAlternative.estimatedCopay.max)}+
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            onClick={onNewSearch}
            variant="default"
            size="lg"
            className="flex-1 sm:flex-initial"
          >
            Check Another Medication
          </Button>
          
          <Button 
            onClick={onStartOver}
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-initial"
          >
            New Patient
          </Button>
        </div>

        {/* Disclaimer */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Important:</span> Results are estimates based on your plan's formulary. 
                  Actual costs may vary by pharmacy. Always confirm with your pharmacist before purchasing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timestamp */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Last updated: {new Date(result.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CoverageResults;
