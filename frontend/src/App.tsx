// frontend/src/App.tsx


import React, { useState } from 'react';
import './index.css';
import OnboardingForm from './components/OnboardingForm';
import PrescriptionForm from './components/PrescriptionForm';
import CoverageResults from './components/CoverageResults';
import { OnboardingData, PrescriptionData, CoverageResponse, ValidationError, UserSession } from '../../shared/types';

type AppView = 'onboarding' | 'prescription' | 'loading' | 'results';
type LoadingStep = 'identifying' | 'checking-coverage' | 'calculating' | 'complete';

interface AppState {
  currentView: AppView;
  session: UserSession;
  formErrors: ValidationError[];
  loadingStep: LoadingStep;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'onboarding',
    session: {
      onboardingData: null,
      prescriptionData: null,
      coverageResult: null
    },
    formErrors: [],
    loadingStep: 'identifying'
  });

  const handleOnboardingComplete = (onboardingData: OnboardingData) => {
    setState(prev => ({
      ...prev,
      currentView: 'prescription',
      session: {
        ...prev.session,
        onboardingData
      },
      formErrors: []
    }));
  };

  // Helper functions for insurance plan details
  const getInsurancePlanName = (planId: string): string => {
    const plans: { [key: string]: string } = {
      'aetna-choice-pos': 'Choice POS II',
      'bcbs-ppo-standard': 'Blue Choice PPO',
      'unitedhealth-hmo': 'UnitedHealthcare HMO',
      'cigna-hdhp': 'Cigna HDHP',
      'kaiser-hmo': 'Kaiser Permanente HMO'
    };
    return plans[planId] || 'Unknown Plan';
  };

  const getInsuranceCarrier = (planId: string): string => {
    const carriers: { [key: string]: string } = {
      'aetna-choice-pos': 'Aetna',
      'bcbs-ppo-standard': 'Blue Cross Blue Shield',
      'unitedhealth-hmo': 'UnitedHealthcare',
      'cigna-hdhp': 'Cigna',
      'kaiser-hmo': 'Kaiser Permanente'
    };
    return carriers[planId] || 'Unknown Carrier';
  };

  const getInsuranceType = (planId: string): string => {
    const types: { [key: string]: string } = {
      'aetna-choice-pos': 'POS',
      'bcbs-ppo-standard': 'PPO',
      'unitedhealth-hmo': 'HMO',
      'cigna-hdhp': 'HDHP',
      'kaiser-hmo': 'HMO'
    };
    return types[planId] || 'PPO';
  };

  const handlePrescriptionSubmit = async (prescriptionData: PrescriptionData) => {
    setState(prev => ({ 
      ...prev, 
      currentView: 'loading', 
      formErrors: [],
      loadingStep: 'identifying',
      session: {
        ...prev.session,
        prescriptionData
      }
    }));

    try {
      // Step 1: Start identifying
      await new Promise(resolve => setTimeout(resolve, 800)); // Small delay for UX
      setState(prev => ({ ...prev, loadingStep: 'checking-coverage' }));

      // Transform frontend data to match backend format
      const requestData = {
        medication: {
          name: prescriptionData.medicationName
        },
        insurancePlan: {
          id: state.session.onboardingData!.insurancePlan,
          name: getInsurancePlanName(state.session.onboardingData!.insurancePlan),
          carrier: getInsuranceCarrier(state.session.onboardingData!.insurancePlan),
          type: getInsuranceType(state.session.onboardingData!.insurancePlan)
        },
        patientZipCode: state.session.onboardingData!.patientZipCode,
        pharmacyZipCode: prescriptionData.pharmacyZipCode,
        quantity: prescriptionData.quantity,
        daySupply: prescriptionData.daySupply
      };

      console.log('[App] Sending request to backend:', requestData);

      // Step 2: Call the API (this is where real AI happens)
      const response = await fetch('http://localhost:3001/api/coverage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Step 3: Processing response
      setState(prev => ({ ...prev, loadingStep: 'calculating' }));
      await new Promise(resolve => setTimeout(resolve, 600)); // Small delay for UX

      const result = await response.json();

      if (result.success) {
        // Step 4: Complete
        setState(prev => ({ ...prev, loadingStep: 'complete' }));
        await new Promise(resolve => setTimeout(resolve, 500)); // Show completion briefly

        setState(prev => ({
          ...prev,
          currentView: 'results',
          session: {
            ...prev.session,
            coverageResult: result.data
          }
        }));
        console.log('[App] Coverage check successful:', result.data);
      } else {
        // Handle API errors
        setState(prev => ({
          ...prev,
          currentView: 'prescription',
          formErrors: result.error?.details || [
            { field: 'general', message: result.error?.message || 'Coverage check failed' }
          ]
        }));
      }
    } catch (error) {
      console.error('[App] Error checking coverage:', error);
      setState(prev => ({
        ...prev,
        currentView: 'prescription',
        formErrors: [{ 
          field: 'general', 
          message: `Failed to check coverage: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }]
      }));
    }
  };

  const handleBackToPrescription = () => {
    setState(prev => ({
      ...prev,
      currentView: 'prescription',
      formErrors: []
    }));
  };

  const handleNewSearch = () => {
    setState(prev => ({
      ...prev,
      currentView: 'prescription',
      session: {
        ...prev.session,
        prescriptionData: null,
        coverageResult: null
      },
      formErrors: []
    }));
  };

  const handleStartOver = () => {
    setState({
      currentView: 'onboarding',
      session: {
        onboardingData: null,
        prescriptionData: null,
        coverageResult: null
      },
      formErrors: [],
      loadingStep: 'identifying'
    });
  };

  return (
    <div className="App">
      {/* Header - different for each view */}
      {state.currentView === 'onboarding' && (
        <header className="app-header gradient">
          <div className="header-content">
            <div className="logo">
              <span className="logo-icon">🏥</span>
              <span className="logo-text">CoveredRx</span>
            </div>
            <div className="tagline">
              Real-time prescription transparency tool
            </div>
          </div>
        </header>
      )}

      {(state.currentView === 'prescription' || state.currentView === 'loading') && (
        <header className="app-header compact">
          <div className="header-content">
            <div className="logo small">
              <span className="logo-icon">🏥</span>
              <span className="logo-text">CoveredRx</span>
            </div>
          </div>
        </header>
      )}

      {state.currentView === 'results' && (
        <header className="app-header minimal">
          <div className="header-content">
            <div className="logo minimal">
              <span className="logo-icon">🏥</span>
              <span className="logo-text">CoveredRx</span>
            </div>
          </div>
        </header>
      )}

      <main className="main-content">
        {/* General Error Messages */}
        {state.formErrors.some(error => error.field === 'general') && (
          <div className="alert error">
            {state.formErrors
              .filter(error => error.field === 'general')
              .map((error, index) => (
                <div key={index}>{error.message}</div>
              ))
            }
          </div>
        )}

        {/* Onboarding */}
        {state.currentView === 'onboarding' && (
          <OnboardingForm
            onComplete={handleOnboardingComplete}
            errors={state.formErrors.filter(error => error.field !== 'general')}
          />
        )}

        {/* Prescription Form */}
        {state.currentView === 'prescription' && state.session.onboardingData && (
          <PrescriptionForm
            onboardingData={state.session.onboardingData}
            onSubmit={handlePrescriptionSubmit}
            onBack={handleBackToPrescription}
            isLoading={false}
            errors={state.formErrors.filter(error => error.field !== 'general')}
          />
        )}

        {/* Loading State - Dynamic Progress */}
        {state.currentView === 'loading' && (
          <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
            <div className="max-w-md mx-auto text-center px-6">
              
              {/* Animated Logo */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 animate-pulse">
                  <span className="text-3xl text-white">🏥</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">CoveredRx</h1>
              </div>

              {/* Loading Animation */}
              <div className="mb-8">
                <div className="relative w-24 h-24 mx-auto">
                  {/* Outer circle */}
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  {/* Spinning circle */}
                  <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                  {/* Inner dot - only pulse, no movement */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>

              {/* Loading Text */}
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Checking Coverage...
                </h2>
                <p className="text-gray-600">
                  Our AI agents are analyzing your prescription
                </p>
              </div>

              {/* Dynamic Loading Steps */}
              <div className="mt-8 space-y-4">
                {/* Step 1: Medication Identification */}
                <div className={`flex items-center justify-center space-x-3 p-3 border rounded-lg transition-all duration-300 ${
                  state.loadingStep === 'identifying' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex-shrink-0">
                    {state.loadingStep === 'identifying' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    state.loadingStep === 'identifying' ? 'text-blue-800' : 'text-green-800'
                  }`}>
                    {state.loadingStep === 'identifying' ? 'Identifying medication...' : 'Medication identified'}
                  </span>
                </div>

                {/* Step 2: Formulary Coverage */}
                <div className={`flex items-center justify-center space-x-3 p-3 border rounded-lg transition-all duration-300 ${
                  state.loadingStep === 'checking-coverage'
                    ? 'bg-blue-50 border-blue-200'
                    : state.loadingStep === 'calculating' || state.loadingStep === 'complete'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex-shrink-0">
                    {state.loadingStep === 'checking-coverage' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : state.loadingStep === 'calculating' || state.loadingStep === 'complete' ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    state.loadingStep === 'checking-coverage' 
                      ? 'text-blue-800'
                      : state.loadingStep === 'calculating' || state.loadingStep === 'complete'
                      ? 'text-green-800'
                      : 'text-gray-600'
                  }`}>
                    {state.loadingStep === 'checking-coverage' 
                      ? 'Checking formulary coverage...'
                      : state.loadingStep === 'calculating' || state.loadingStep === 'complete'
                      ? 'Formulary coverage checked'
                      : 'Checking formulary coverage'
                    }
                  </span>
                </div>

                {/* Step 3: Calculating Costs */}
                <div className={`flex items-center justify-center space-x-3 p-3 border rounded-lg transition-all duration-300 ${
                  state.loadingStep === 'calculating'
                    ? 'bg-blue-50 border-blue-200'
                    : state.loadingStep === 'complete'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex-shrink-0">
                    {state.loadingStep === 'calculating' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : state.loadingStep === 'complete' ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    state.loadingStep === 'calculating'
                      ? 'text-blue-800'
                      : state.loadingStep === 'complete'
                      ? 'text-green-800'
                      : 'text-gray-600'
                  }`}>
                    {state.loadingStep === 'calculating'
                      ? 'Calculating costs & alternatives...'
                      : state.loadingStep === 'complete'
                      ? 'Costs & alternatives calculated'
                      : 'Calculating costs & alternatives'
                    }
                  </span>
                </div>
              </div>

              {/* Fun Facts */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-blue-600">💡</span>
                  <span className="text-sm font-medium text-blue-900">Did you know?</span>
                </div>
                <p className="text-xs text-blue-800">
                  CoveredRx can reduce pharmacy callbacks by up to 70% and save patients an average of $150 per prescription.
                </p>
              </div>

              {/* Progress Dots */}
              <div className="mt-6 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>

            </div>
          </div>
        )}

        {/* Results */}
        {state.currentView === 'results' && state.session.coverageResult && state.session.onboardingData && (
          <CoverageResults
            result={state.session.coverageResult}
            onboardingData={state.session.onboardingData}
            onNewSearch={handleNewSearch}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer - only show on onboarding */}
      {state.currentView === 'onboarding' && (
        <footer className="app-footer">
          <div className="footer-content">
            <p className="footer-text">
              Powered by advanced AI • Real-time formulary data • Bank-level security
            </p>
            <div className="footer-badges">
              <span className="badge">SOC 2 Compliant</span>
              <span className="badge">HIPAA Secure</span>
              <span className="badge">256-bit Encryption</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;