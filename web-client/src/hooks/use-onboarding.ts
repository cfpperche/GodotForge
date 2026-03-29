import { useState, useCallback } from "react";

const STORAGE_KEY = "godotforge-onboarding-complete";
const CURRENT_VERSION = 1;

interface OnboardingState {
  completedAt: string;
  version: number;
}

export function useOnboarding() {
  const [step, setStep] = useState(0);

  const isCompleted = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const state: OnboardingState = JSON.parse(raw);
      return state.version >= CURRENT_VERSION;
    } catch {
      return false;
    }
  }, []);

  const [completed, setCompleted] = useState(isCompleted);

  const nextStep = useCallback(() => setStep((s) => s + 1), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const finish = useCallback(() => {
    const state: OnboardingState = {
      completedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setCompleted(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCompleted(false);
    setStep(0);
  }, []);

  return { completed, step, nextStep, prevStep, finish, reset };
}
