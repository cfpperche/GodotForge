import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:6980";

interface ProjectStatus {
  project_root: string;
  has_godot_project: boolean;
  recent_projects?: string[];
}

export function useProject() {
  const [project, setProject] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/project`);
      const data = await res.json();
      setProject(data);
    } catch {
      setProject(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isValid = !!(project?.project_root && project.has_godot_project);
  const recentProjects = project?.recent_projects || [];

  return { project, isValid, loading, refresh, recentProjects };
}
