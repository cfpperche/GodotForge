import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function ConnectionStatus() {
  const { health, connected } = useHealth();

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Connections
      </h3>

      <div className="space-y-2">
        <StatusRow
          label="MCP Server"
          connected={connected}
          detail={health ? `v${health.version} :${health.port}` : ""}
        />
        <StatusRow label="Godot Editor" connected={false} detail="Check plugin" />
        <StatusRow label="Blender" connected={false} detail="Port 8400" />
      </div>

      <Separator />
    </div>
  );
}

function StatusRow({
  label,
  connected,
  detail,
}: {
  label: string;
  connected: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-green-500" : "bg-red-500"
          )}
        />
        <span>{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}
