
// frontend/src/components/OnboardingForm.tsx

import React, { useState } from 'react';
import { OnboardingData, InsurancePlan, ValidationError } from '../../../shared/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl">🏥</span>
              <span className="text-3xl font-bold">CoveredRx</span>
            </div>
            <p className="text-xl text-blue-100">
              Real-time prescription transparency tool
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <span className="font-medium text-gray-900">Personal Details</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span className="font-medium text-gray-500">Prescription Check</span>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to CoveredRx</CardTitle>
            <CardDescription className="text-lg">
              Let's start by setting up your insurance information. This will be saved for future prescription checks.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Name (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="patientName">Your Name (Optional)</Label>
                <Input
                  id="patientName"
                  name="patientName"
                  type="text"
                  value={formData.patientName || ''}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
                <p className="text-sm text-gray-600">
                  This helps personalize your experience
                </p>
              </div>

              {/* Insurance Plan */}
              <div className="space-y-2">
                <Label htmlFor="insurancePlan" className="required">
                  Insurance Plan
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <select
                  id="insurancePlan"
                  name="insurancePlan"
                  value={formData.insurancePlan}
                  onChange={handleInputChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select your insurance plan</option>
                  {MOCK_INSURANCE_PLANS.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.carrier} - {plan.name}
                    </option>
                  ))}
                </select>
                {getFieldError('insurancePlan') && (
                  <p className="text-sm text-red-500">{getFieldError('insurancePlan')}</p>
                )}
                {selectedPlan && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {selectedPlan.type} Plan
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Typical copays: ${selectedPlan.tier1Copay} / ${selectedPlan.tier2Copay} / ${selectedPlan.tier3Copay}
                    </p>
                  </div>
                )}
              </div>

              {/* Patient ZIP Code */}
              <div className="space-y-2">
                <Label htmlFor="patientZipCode">
                  Your ZIP Code
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="patientZipCode"
                  name="patientZipCode"
                  type="text"
                  value={formData.patientZipCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 94105"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  required
                />
                {getFieldError('patientZipCode') && (
                  <p className="text-sm text-red-500">{getFieldError('patientZipCode')}</p>
                )}
                <p className="text-sm text-gray-600">
                  Used to find nearby in-network pharmacies and regional pricing
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-green-600 text-xl">🔒</span>
                  <div>
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">Your privacy matters.</span> We use bank-level encryption to protect your information. 
                      Your data is never shared with third parties and is used only to provide prescription coverage information.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!formData.insurancePlan || !formData.patientZipCode}
              >
                Continue to Prescription Check
                <span className="ml-2">→</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Benefits Preview */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">What you'll get:</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="text-2xl mb-2">⚡</div>
                <h4 className="font-semibold mb-1">Instant Results</h4>
                <p className="text-sm text-gray-600">Coverage info in under 5 seconds</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl mb-2">💰</div>
                <h4 className="font-semibold mb-1">Cost Transparency</h4>
                <p className="text-sm text-gray-600">See exact copays before you leave</p>
              </div>
              <div className="text-center p-4">
                <div className="text-2xl mb-2">🔍</div>
                <h4 className="font-semibold mb-1">Smart Alternatives</h4>
                <p className="text-sm text-gray-600">Find cheaper covered options</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Powered by advanced AI • Real-time formulary data • Bank-level security
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">SOC 2 Compliant</span>
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">HIPAA Secure</span>
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">256-bit Encryption</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingForm;