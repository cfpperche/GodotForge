import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function DoneStep({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex flex-col items-center text-center gap-6 py-12">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center shadow-lg animate-bounce">
        <Sparkles className="h-10 w-10 text-green-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground max-w-sm">
          Start building your game by typing in the chat. Try "Create a 3D platformer" to get started.
        </p>
      </div>

      <Button size="lg" className="gap-2 text-base px-8" onClick={onFinish}>
        Start Building <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-[11px] text-muted-foreground animate-pulse">
        Starting automatically...
      </p>
    </div>
  );
}
