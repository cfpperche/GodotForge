# Examples — Frontend Polish

## Example 1: Button before/after

**Before (unpublished):**
```html
<button className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
```

**After (polished):**
```html
<button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg
  transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-95
  focus:ring-2 focus:ring-primary/30 focus:outline-none">
  Save
</button>
```

## Example 2: Card with glass effect

**Before:**
```html
<div className="bg-gray-800 border border-gray-700 p-4 rounded">Content</div>
```

**After:**
```html
<div className="bg-card/60 backdrop-blur-xl border border-border/50 p-4 rounded-xl
  transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30">
  Content
</div>
```

## Example 3: Empty state

**Before:**
```html
<p>No items found.</p>
```

**After:**
```html
<div className="flex flex-col items-center justify-center h-[60vh] gap-4">
  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5
    flex items-center justify-center shadow-lg glow-primary">
    <Inbox className="h-8 w-8 text-primary" />
  </div>
  <h3 className="text-lg font-semibold">No items yet</h3>
  <p className="text-sm text-muted-foreground max-w-md text-center">
    Create your first item to get started.
  </p>
  <Button>Create Item</Button>
</div>
```

## Counter-Example 1: Over-animation

**Bad output:**
```html
<div className="animate-bounce hover:animate-spin hover:scale-150 transition-all duration-1000">
  <h1 className="animate-pulse text-6xl">Welcome!</h1>
</div>
```

**Why it fails:** Multiple competing animations, excessive scale, slow duration. Feels chaotic. Keep animations subtle — `hover:-translate-y-0.5` not `hover:scale-150`.

## Counter-Example 2: Hardcoded dark theme

**Bad output:**
```html
<div className="bg-[#1a1a2e] text-[#e0e0e0] border-[#0f3460]">Content</div>
```

**Why it fails:** Hardcoded hex values bypass the design system. If the theme changes, these won't update. Use `bg-background text-foreground border-border` instead.
