import { Badge } from "@/components/ui/badge";
import { Wrench, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ToolCallLog } from "@/types/api";

interface ToolCallProps {
  tool: ToolCallLog;
}

export function ToolCall({ tool }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);
  const hasResult = tool.result && tool.result.length > 0;

  return (
    <div>
      <button
        onClick={() => hasResult && setExpanded(!expanded)}
        className="flex items-center gap-1.5 py-0.5 hover:opacity-80 transition-opacity"
      >
        <Badge
          variant={tool.is_error ? "destructive" : "secondary"}
          className="gap-1 text-[11px] font-mono cursor-pointer"
        >
          <Wrench className="h-2.5 w-2.5" />
          {tool.name}
          {tool.is_error ? (
            <XCircle className="h-2.5 w-2.5" />
          ) : (
            <CheckCircle className="h-2.5 w-2.5 text-green-500" />
          )}
        </Badge>
        {hasResult && (
          expanded
            ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {expanded && hasResult && (
        <div className="mt-1 ml-2 p-2 rounded bg-muted/50 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[100px] overflow-y-auto">
          {tool.result}
        </div>
      )}
    </div>
  );
}
