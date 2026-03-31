import { useContext, useState } from "react";
import { ProjectContext } from "@/app";
import { useFiles } from "@/hooks/use-files";
import { FileTree } from "./file-tree";
import { FileList } from "./file-list";
import { FilePreview } from "./file-preview";
import { cn } from "@/lib/utils";
import { ChevronRight, Eye, LayoutGrid, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RightTab = "preview" | "browse";

function Breadcrumb({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const segments = currentPath === "" ? [] : currentPath.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm min-w-0">
      <button
        onClick={() => onNavigate("")}
        className={cn(
          "text-sm font-medium transition-colors shrink-0",
          segments.length === 0
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        res://
      </button>
      {segments.map((seg, i) => {
        const segPath = segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={segPath} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <button
              onClick={() => onNavigate(segPath)}
              className={cn(
                "text-sm transition-colors truncate",
                isLast
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {seg}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

export function FileBrowser() {
  const { projectRoot } = useContext(ProjectContext);
  const {
    currentPath,
    entries,
    selectedFile,
    viewMode,
    loading,
    navigate,
    selectFile,
    refresh,
  } = useFiles(projectRoot);

  const [rightTab, setRightTab] = useState<RightTab>("preview");

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: file tree */}
      <aside className="w-56 shrink-0 border-r border-border/40 bg-card/30 overflow-y-auto">
        <div className="sticky top-0 z-10 px-3 py-2 border-b border-border/30 bg-card/60 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Project Files</p>
        </div>
        <FileTree
          currentPath={currentPath}
          onNavigate={navigate}
          onSelectFile={selectFile}
        />
      </aside>

      {/* Right: main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-card/30">
          <Breadcrumb currentPath={currentPath} onNavigate={navigate} />

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refresh}
              title="Refresh"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>

            {/* Tab toggle: Preview / Browse */}
            <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setRightTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors",
                  rightTab === "preview"
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
              <button
                onClick={() => setRightTab("browse")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors",
                  rightTab === "browse"
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3 w-3" />
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {rightTab === "preview" ? (
            /* Preview mode: full-width preview of selected file */
            selectedFile ? (
              <FilePreview entry={selectedFile.entry} parentPath={selectedFile.parentPath} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Eye className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm">Select a file from the tree to preview</p>
                <p className="text-xs text-muted-foreground/60">Supports images, audio, video, 3D models, code, and markdown</p>
              </div>
            )
          ) : (
            /* Browse mode: grid/list of files in current directory */
            <div className="h-full overflow-y-auto">
              {loading && entries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <FileList
                  entries={entries}
                  currentPath={currentPath}
                  selectedFile={selectedFile}
                  viewMode={viewMode}
                  onNavigate={navigate}
                  onSelectFile={selectFile}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
