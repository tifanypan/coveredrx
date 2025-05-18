// frontend/src/components/PrescriptionForm.tsx

import React, { useState } from 'react';
import { PrescriptionData, OnboardingData, ValidationError } from '../../../shared/types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏥</span>
            <span className="text-xl font-bold text-gray-900">CoveredRx</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                ✓
              </div>
              <span className="font-medium text-gray-600">Personal Details</span>
            </div>
            <div className="w-12 h-0.5 bg-green-600"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span className="font-medium text-gray-900">Prescription Check</span>
            </div>
          </div>
        </div>

        {/* User Info Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                {onboardingData.patientName ? `Hello, ${onboardingData.patientName}!` : 'Ready to check your prescription?'}
              </h2>
              <p className="text-sm text-gray-600">Your insurance information is saved and ready</p>
            </div>
            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
              <span className="text-green-600">🛡️</span>
              <span className="text-sm font-medium text-green-800">Insurance Connected</span>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check Prescription Coverage</CardTitle>
            <CardDescription className="text-lg">
              Enter the medication prescribed by your doctor to see coverage, costs, and alternatives.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Medication Name - Featured Input */}
              <div className="space-y-2">
                <Label htmlFor="medicationName" className="text-base font-medium">
                  Prescribed Medication
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="medicationName"
                  name="medicationName"
                  type="text"
                  value={formData.medicationName}
                  onChange={handleInputChange}
                  placeholder="e.g., Lisinopril, Metformin, Atorvastatin"
                  required
                  disabled={isLoading}
                  autoFocus
                  className="text-lg py-3 h-12"
                />
                {getFieldError('medicationName') && (
                  <p className="text-sm text-red-500">{getFieldError('medicationName')}</p>
                )}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 <span className="font-medium">Pro tip:</span> Enter brand name or generic name - our AI will help identify the medication
                  </p>
                </div>
              </div>

              {/* Pharmacy ZIP Code */}
              <div className="space-y-2">
                <Label htmlFor="pharmacyZipCode">Pharmacy ZIP Code</Label>
                <Input
                  id="pharmacyZipCode"
                  name="pharmacyZipCode"
                  type="text"
                  value={formData.pharmacyZipCode}
                  onChange={handleInputChange}
                  placeholder="e.g., 94105"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  disabled={isLoading}
                />
                {getFieldError('pharmacyZipCode') && (
                  <p className="text-sm text-red-500">{getFieldError('pharmacyZipCode')}</p>
                )}
                <p className="text-sm text-gray-600">
                  Different from your home ZIP? Update to check local pharmacy pricing
                </p>
              </div>

              {/* Quantity and Day Supply */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    disabled={isLoading}
                  />
                  {getFieldError('quantity') && (
                    <p className="text-sm text-red-500">{getFieldError('quantity')}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daySupply">Day Supply</Label>
                  <Input
                    id="daySupply"
                    name="daySupply"
                    type="number"
                    value={formData.daySupply}
                    onChange={handleInputChange}
                    min="1"
                    max="365"
                    disabled={isLoading}
                  />
                  {getFieldError('daySupply') && (
                    <p className="text-sm text-red-500">{getFieldError('daySupply')}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isLoading}
                  className="sm:w-auto"
                >
                  ← Back
                </Button>
                
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !formData.medicationName}
                  className="flex-1 sm:flex-initial"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking Coverage...
                    </>
                  ) : (
                    <>
                      Check Coverage & Cost
                      <span className="ml-2">🔍</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Tips Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
              💡 Quick Tips
            </h3>
            <ul className="space-y-3 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span className="text-sm">Don't know the exact name? Just type what you remember - our AI is smart!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span className="text-sm">Results include all covered alternatives to save you money</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span className="text-sm">Prior authorization requirements are flagged instantly</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrescriptionForm;