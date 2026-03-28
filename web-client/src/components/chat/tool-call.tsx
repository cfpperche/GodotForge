import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle, XCircle } from "lucide-react";
import type { ToolCallLog } from "@/types/api";

interface ToolCallProps {
  tool: ToolCallLog;
}

export function ToolCall({ tool }: ToolCallProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Badge variant="secondary" className="gap-1 text-xs font-mono">
        <Wrench className="h-3 w-3" />
        {tool.name}
      </Badge>
      {tool.is_error ? (
        <XCircle className="h-3.5 w-3.5 text-destructive" />
      ) : (
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      )}
      {tool.result && (
        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
          {tool.result}
        </span>
      )}
    </div>
  );
}
