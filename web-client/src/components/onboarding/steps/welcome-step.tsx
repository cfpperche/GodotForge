import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-8 py-8">
      <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-2xl glow-primary">
        <Zap className="h-12 w-12 text-primary-foreground" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to GodotForge</h1>
        <p className="text-muted-foreground max-w-md text-base leading-relaxed">
          AI-powered game development hub. Create scenes in Godot, model in Blender,
          download assets — all with natural language.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center max-w-sm">
        {[
          { n: "85", l: "Tools" },
          { n: "4.7K", l: "API Docs" },
          { n: "3", l: "Engines" },
        ].map(({ n, l }) => (
          <div key={l} className="rounded-xl bg-muted/30 p-3">
            <div className="text-xl font-bold text-primary">{n}</div>
            <div className="text-[10px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <Button size="lg" className="gap-2 text-base px-8" onClick={onNext}>
        Get Started <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
