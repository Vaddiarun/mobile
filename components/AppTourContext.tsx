import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TourContextType {
  tourActive: boolean;
  currentStep: number;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  setTourStep: (step: number) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

let tourLock = false; // God mode: prevent multiple tour starts

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = () => {
    if (tourLock) {
      console.log('[Tour] Blocked: Tour already started');
      return; // God mode: prevent restart
    }
    console.log('[Tour] Starting tour');
    tourLock = true;
    setTourActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      console.log('[Tour] Moving to step:', next);
      return next;
    });
  };

  const skipTour = () => {
    console.log('[Tour] Skipping/Ending tour');
    setTourActive(false);
    setCurrentStep(0);
    tourLock = false; // Reset lock when tour is skipped
  };

  const setTourStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <TourContext.Provider value={{ tourActive, currentStep, startTour, nextStep, skipTour, setTourStep }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within TourProvider');
  return context;
};
