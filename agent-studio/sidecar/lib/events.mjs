// agent-studio/sidecar/lib/events.mjs
//
// Newline-delimited JSON event emitter, matching the shape the Rust side
// (agent-studio/src-tauri/src/lib.rs) already forwards for Phase 0's
// `sidecar-log` / `sidecar-status` Tauri events:
//   {"type":"log","line":"..."}
//   {"type":"status","status":"...", ...extra fields}
//
// Every line written to stdout by this sidecar MUST be exactly one JSON
// object per line — Rust splits on newlines and JSON.parses each line.

export function emitLog(line) {
  process.stdout.write(JSON.stringify({ type: "log", line: String(line) }) + "\n");
}

export function emitStatus(status, extra = {}) {
  process.stdout.write(JSON.stringify({ type: "status", status, ...extra }) + "\n");
}
