# Issue #001: simulate_input_sequence tool

## Problem

Each `simulate_input` call requires an HTTP roundtrip (~200ms). For games that need rapid repeated input (e.g., Flappy Bird flapping every 500ms), the agent can't keep up — the bird dies before the next flap arrives.

## Proposed Solution

Add a `simulate_input_sequence` tool that accepts an array of timed inputs:

```json
{
  "sequence": [
    { "action": "flap", "delay_ms": 0 },
    { "action": "flap", "delay_ms": 500 },
    { "action": "flap", "delay_ms": 500 },
    { "action": "flap", "delay_ms": 500 }
  ]
}
```

The game-side autoload would execute the full sequence with precise timing in a single debugger message, eliminating HTTP roundtrip latency between inputs.

## Impact

- Enables autonomous play-testing of action games
- Single HTTP call instead of N calls
- Game-side timing is frame-accurate

## Priority

Medium — workaround is to tune game physics for agent-friendly values.

## Status

Open
