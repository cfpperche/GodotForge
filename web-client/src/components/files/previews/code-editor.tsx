import { useEffect, useState, useCallback, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save } from "lucide-react";

function getLanguageExtension(ext: string) {
  switch (ext) {
    case ".json":
      return json();
    case ".md":
    case ".mdx":
      return markdown();
    case ".py":
      return python();
    case ".ts":
    case ".tsx":
      return javascript({ typescript: true });
    case ".js":
    case ".jsx":
      return javascript();
    default:
      return undefined;
  }
}

interface CodeEditorProps {
  url: string;
  filePath: string;
  extension: string;
}

export function CodeEditor({ url, filePath, extension }: CodeEditorProps) {
  const [content, setContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string>("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const currentContent = useRef<string>("");

  useEffect(() => {
    setContent(null);
    setError(false);
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        setContent(text);
        setSavedContent(text);
        currentContent.current = text;
      })
      .catch(() => setError(true));
  }, [url]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const ok = await api.saveFile(filePath, currentContent.current);
      if (ok) {
        setSavedContent(currentContent.current);
        toast.success("File saved");
      } else {
        toast.error("Failed to save file");
      }
    } catch {
      toast.error("Failed to save file");
    } finally {
      setSaving(false);
    }
  }, [filePath]);

  const handleChange = useCallback((value: string) => {
    currentContent.current = value;
    setContent(value);
  }, []);

  const saveKeymap = keymap.of([
    {
      key: "Mod-s",
      run: () => {
        handleSave();
        return true;
      },
    },
  ]);

  if (error) return <p className="text-destructive text-sm p-4">Failed to load file content.</p>;
  if (content === null) return <p className="text-muted-foreground text-sm p-4 animate-pulse">Loading...</p>;

  const isDirty = content !== savedContent;
  const lang = getLanguageExtension(extension);
  const extensions = [saveKeymap, ...(lang ? [lang] : [])];

  return (
    <div className="flex flex-col h-full">
      {/* Editor toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/40 bg-card/40">
        <span className="text-xs text-muted-foreground font-mono truncate">{filePath}</span>
        {isDirty && <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors disabled:opacity-30 text-muted-foreground hover:text-foreground hover:bg-muted/40"
            title="Save (Ctrl+S)"
          >
            <Save className="h-3 w-3" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden min-h-0">
        <CodeMirror
          ref={editorRef}
          value={content}
          onChange={handleChange}
          theme={oneDark}
          extensions={extensions}
          height="100%"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightActiveLine: true,
            searchKeymap: true,
          }}
          style={{ height: "100%", fontSize: "13px" }}
        />
      </div>
    </div>
  );
}
