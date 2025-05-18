// frontend/src/App.tsx

import React, { useState } from 'react';
import './index.css';
import OnboardingForm from './components/OnboardingForm';
import PrescriptionForm from './components/PrescriptionForm';
import CoverageResults from './components/CoverageResults';
import { OnboardingData, PrescriptionData, CoverageResponse, ValidationError, UserSession } from '../../shared/types';

type AppView = 'onboarding' | 'prescription' | 'loading' | 'results';

interface AppState {
  currentView: AppView;
  session: UserSession;
  formErrors: ValidationError[];
}

function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'onboarding',
    session: {
      onboardingData: null,
      prescriptionData: null,
      coverageResult: null
    },
    formErrors: []
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

  const handlePrescriptionSubmit = async (prescriptionData: PrescriptionData) => {
    setState(prev => ({ 
      ...prev, 
      currentView: 'loading', 
      formErrors: [],
      session: {
        ...prev.session,
        prescriptionData
      }
    }));

    try {
      // Combine onboarding and prescription data for API
      const requestData = {
        ...state.session.onboardingData!,
        ...prescriptionData
      };

      const response = await fetch('http://localhost:3001/api/check-coverage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          currentView: 'results',
          session: {
            ...prev.session,
            coverageResult: result.data
          }
        }));
      } else {
        // Handle API errors
        setState(prev => ({
          ...prev,
          currentView: 'prescription',
          formErrors: result.error?.code === 'VALIDATION_ERROR' 
            ? result.error.details || []
            : [{ field: 'general', message: result.error?.message || 'An error occurred' }]
        }));
      }
    } catch (error) {
      console.error('Error checking coverage:', error);
      setState(prev => ({
        ...prev,
        currentView: 'prescription',
        formErrors: [{ field: 'general', message: 'Failed to connect to server. Please try again.' }]
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
      formErrors: []
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

        {/* Loading State */}
        {state.currentView === 'loading' && (
          <div className="loading-container">
            <div className="loading-animation">
              <div className="loading-icon">⚡</div>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h2 className="loading-title">Checking Coverage...</h2>
            <p className="loading-subtitle">
              Our AI agents are analyzing your prescription with your insurance plan
            </p>
            <div className="loading-features">
              <div className="feature active">
                <span className="feature-icon">🔍</span>
                <span className="feature-text">Identifying medication</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🛡️</span>
                <span className="feature-text">Checking formulary coverage</span>
              </div>
              <div className="feature">
                <span className="feature-icon">💰</span>
                <span className="feature-text">Calculating costs</span>
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