---
name: release-checklist
description: Pre-release validation checklist for plugin and MCP server
user_invocable: true
---

# /release-checklist

Generate a comprehensive pre-release validation checklist.

## Arguments
- `version`: Version being released (e.g., `v0.2.0`)

## Steps

1. **Scan codebase health**:
   ```bash
   grep -r "TODO\|FIXME\|HACK" addons/godotforge/ mcp-server/src/ --include="*.gd" --include="*.ts" | wc -l
   ```

2. **Generate checklist**:

### Codebase Health
- [ ] No TODO/FIXME/HACK in release code (count: X)
- [ ] No `print()` debug statements in plugin
- [ ] No `console.log()` debug statements in MCP server (except stderr)
- [ ] No hardcoded API keys or secrets

### Plugin Validation
- [ ] `plugin.cfg` version updated to {version}
- [ ] All GDScript files have `@tool` annotation
- [ ] Plugin loads without errors in Godot (check log)
- [ ] HTTP server starts on port 6970
- [ ] Port file created at `.godot/godotforge.port`
- [ ] Port file cleaned up on plugin disable
- [ ] All 6 tools respond via HTTP endpoints
- [ ] Chat panel renders and sends messages
- [ ] API key save/load works

### MCP Server Validation
- [ ] `package.json` version updated to {version}
- [ ] `npm run build` succeeds with no errors
- [ ] MCP handshake (initialize) works via stdio
- [ ] `tools/list` returns all 9 tools
- [ ] Editor tools fail gracefully without Godot
- [ ] Local tools (list_files, read_file) work without Godot
- [ ] Bridge connects to plugin when Godot is running

### Integration Tests
- [ ] MCP → Bridge → Plugin → create_scene works end-to-end
- [ ] MCP → Bridge → Plugin → create_script works end-to-end
- [ ] Claude Code `mcp list` shows godotforge as connected
- [ ] `.mcp.json` config works for fresh setup

### Distribution
- [ ] `.gitignore` excludes node_modules, dist, .api_key
- [ ] README has setup instructions for all 3 modes
- [ ] CHANGELOG updated

3. **Write to**: `docs/releases/checklist-{version}.md`
