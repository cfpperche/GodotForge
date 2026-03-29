# Multiplayer & Networking

- Server-authoritative: the server validates ALL game state changes. Clients propose, server decides.
- Client prediction + rollback for responsive feel: predict locally, reconcile when server confirms.
- Versioned message formats: every packet/RPC has a version field. Support backward compatibility for at least 1 prior version.
- Define bandwidth budgets per message type. Position updates: ≤50 bytes. Chat: ≤256 bytes. State sync: ≤1KB.
- Validate packet size and field ranges server-side. Reject malformed data immediately.
- Handle gracefully: disconnection (save state), reconnection (restore state), host migration (elect new host).
- Rate-limit network debug logging — max 1 log per second per category, not per packet.
- Interpolate remote entity positions between network updates. Never teleport — it breaks immersion.
- Input buffering: collect inputs for N frames, send as batch to reduce packet count.
- NEVER trust client data. Validate positions (speed check), actions (cooldown check), inventory (ownership check).
- Use Godot's MultiplayerAPI, MultiplayerSpawner, MultiplayerSynchronizer. Avoid raw TCP/UDP unless you need custom protocol.
- Test with simulated latency (200ms+) and packet loss (5%+) before shipping.
