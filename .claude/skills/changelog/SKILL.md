---
name: changelog
description: Generate changelog from git history
user_invocable: true
---

# /changelog

Generate a changelog from git history, optionally for a specific version or date range.

## Arguments
- `version` (optional): Version tag or range (e.g., `v0.1.0`, `v0.1.0..v0.2.0`)
- If no argument: changelog since last tag or last 20 commits

## Steps

1. **Read git history**:
   ```bash
   git log --oneline --no-merges ${VERSION_RANGE:-HEAD~20..HEAD}
   ```

2. **Categorize changes** using conventional commit prefixes:
   - `feat` → **New Features**
   - `fix` → **Bug Fixes**
   - `refactor` → **Improvements**
   - `docs` → **Documentation**
   - `chore` → **Maintenance**

3. **Generate two outputs**:

   **Internal changelog** (for developers):
   - Include commit hashes, scopes, full descriptions
   - Note breaking changes with migration instructions
   - Reference related files changed

   **User-facing changelog** (for plugin users):
   - Friendly, non-technical language
   - Focus on what changed from the user's perspective
   - Group by: Plugin changes vs MCP server changes

4. **Write to file**: `docs/CHANGELOG.md` (append at top, keep history)

## Output Format

```markdown
## [version] - YYYY-MM-DD

### New Features
- (plugin) Description of feature
- (mcp) Description of feature

### Bug Fixes
- Description of fix

### Improvements
- Description of improvement
```
