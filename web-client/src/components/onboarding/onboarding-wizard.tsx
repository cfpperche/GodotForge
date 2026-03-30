import { useOnboarding } from "@/hooks/use-onboarding";
import { WelcomeStep } from "./steps/welcome-step";
import { ProjectStep } from "./steps/project-step";
import { PathsStep } from "./steps/paths-step";
import { SettingsStep } from "./steps/settings-step";
import { DoneStep } from "./steps/done-step";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

const TOTAL_STEPS = 5;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { step, nextStep, finish } = useOnboarding();

  const handleFinish = () => {
    finish();
    onComplete();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Ambient background */}
      <div className="ambient-bg" />

      {/* Small branding top */}
      <div className="flex items-center gap-2 mb-6 text-muted-foreground">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">GodotForge</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          {step === 0 && <WelcomeStep onNext={nextStep} />}
          {step === 1 && <ProjectStep onNext={nextStep} />}
          {step === 2 && <PathsStep onNext={nextStep} onSkip={nextStep} />}
          {step === 3 && <SettingsStep onNext={nextStep} onSkip={nextStep} />}
          {step === 4 && <DoneStep onFinish={handleFinish} />}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-[11px] text-muted-foreground">
        85 tools — Godot + Blender + Assets + AI
      </p>
    </div>
  );
}
