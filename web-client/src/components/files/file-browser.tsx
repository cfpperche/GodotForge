import { useContext } from "react";
import { ProjectContext } from "@/app";
import { useFiles } from "@/hooks/use-files";
import { FileTree } from "./file-tree";
import { FileList } from "./file-list";
import { FilePreview } from "./file-preview";
import { cn } from "@/lib/utils";
import { ChevronRight, LayoutGrid, List, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    toggleView,
    refresh,
  } = useFiles(projectRoot);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: file tree */}
      <aside className="w-56 shrink-0 border-r border-border/40 bg-card/30 overflow-y-auto hidden md:block">
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
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", viewMode === "grid" && "text-primary bg-primary/10")}
              onClick={() => viewMode !== "grid" && toggleView()}
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", viewMode === "list" && "text-primary bg-primary/10")}
              onClick={() => viewMode !== "list" && toggleView()}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content area: file list + optional preview panel */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* File list */}
          <div className={cn("overflow-y-auto", selectedFile ? "flex-1" : "w-full")}>
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

          {/* Preview panel */}
          {selectedFile && (
            <div className="w-72 xl:w-80 shrink-0 border-l border-border/40 bg-card/20 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Preview</span>
                <button
                  onClick={() => selectFile(null!)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Close preview"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <FilePreview entry={selectedFile} parentPath={currentPath} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
