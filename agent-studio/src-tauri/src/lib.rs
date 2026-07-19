use std::io::{BufRead, BufReader, Read};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
struct SidecarLog {
    line: String,
}

#[derive(Clone, serde::Serialize)]
struct SidecarStatus {
    status: String, // "running" | "exited" | "failed_to_spawn"
    code: Option<i32>,
}

/// Spawn a thread that reads `reader` line-by-line (until EOF) and calls
/// `on_line` for each line. Shared by every sidecar-spawning command below
/// so the "spawn -> stream lines -> emit exit status" pattern established
/// in Phase 0 isn't duplicated per-command.
fn stream_lines<R, F>(reader: R, on_line: F) -> std::thread::JoinHandle<()>
where
    R: Read + Send + 'static,
    F: Fn(String) + Send + 'static,
{
    std::thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            on_line(line);
        }
    })
}

/// Phase 0 proof-of-concept: spawns `node --version` as a child process and
/// streams its stdout/stderr line-by-line as Tauri events. Establishes the
/// IPC pattern (spawn -> stream lines -> emit exit status) that Phase 1
/// reuses to stream the long-running Claude Agent SDK sidecar instead.
#[tauri::command]
fn run_node_version_check(app: tauri::AppHandle) -> Result<(), String> {
    std::thread::spawn(move || {
        let _ = app.emit(
            "sidecar-status",
            SidecarStatus {
                status: "running".into(),
                code: None,
            },
        );

        let mut child = match Command::new("node")
            .arg("--version")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    "sidecar-log",
                    SidecarLog {
                        line: format!("Failed to spawn node: {e}"),
                    },
                );
                let _ = app.emit(
                    "sidecar-status",
                    SidecarStatus {
                        status: "failed_to_spawn".into(),
                        code: None,
                    },
                );
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let stdout_app = app.clone();
        let stdout_handle = stdout.map(|out| {
            stream_lines(out, move |line| {
                let _ = stdout_app.emit("sidecar-log", SidecarLog { line });
            })
        });

        let stderr_app = app.clone();
        let stderr_handle = stderr.map(|err| {
            stream_lines(err, move |line| {
                let _ = stderr_app.emit(
                    "sidecar-log",
                    SidecarLog {
                        line: format!("[stderr] {line}"),
                    },
                );
            })
        });

        if let Some(h) = stdout_handle {
            let _ = h.join();
        }
        if let Some(h) = stderr_handle {
            let _ = h.join();
        }

        let code = child.wait().ok().and_then(|s| s.code());
        let _ = app.emit(
            "sidecar-status",
            SidecarStatus {
                status: "exited".into(),
                code,
            },
        );
    });

    Ok(())
}

/// Absolute path to the feature-dev sidecar script. `CARGO_MANIFEST_DIR` is
/// `agent-studio/src-tauri` at both `tauri dev` and build time, and the
/// sidecar lives at `agent-studio/sidecar/feature-dev-agent.mjs` — a sibling
/// of `src-tauri` — so this resolves correctly regardless of the running
/// process's current working directory.
fn sidecar_script_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("sidecar")
        .join("feature-dev-agent.mjs")
}

/// Parse one line of the sidecar's newline-delimited JSON protocol
/// (`{"type":"log",...}` / `{"type":"status",...}`, see
/// `agent-studio/sidecar/lib/events.mjs`) and forward it as the
/// corresponding Tauri event, passing the full parsed object through as the
/// payload (readers can just pick the fields they know about, e.g. `.line`
/// or `.status`, and ignore the rest). Anything that isn't valid JSON on
/// that protocol (e.g. a stray non-JSON line) is still surfaced as a log
/// line rather than silently dropped.
fn forward_sidecar_line(app: &tauri::AppHandle, line: &str) {
    match serde_json::from_str::<serde_json::Value>(line) {
        Ok(value) => {
            let event_type = value.get("type").and_then(|t| t.as_str()).unwrap_or("");
            match event_type {
                "log" => {
                    let _ = app.emit("sidecar-log", value);
                }
                "status" => {
                    let _ = app.emit("sidecar-status", value);
                }
                _ => {
                    let _ = app.emit("sidecar-log", serde_json::json!({ "line": line }));
                }
            }
        }
        Err(_) => {
            let _ = app.emit("sidecar-log", serde_json::json!({ "line": line }));
        }
    }
}

/// Phase 1: spawns the `feature-dev-agent.mjs` Node sidecar, which runs a
/// single Claude Agent SDK "feature-dev" agent against an isolated git
/// worktree of `repo_path` on a fresh branch, then (on success) verifies,
/// commits, and pushes that branch. This command never touches
/// `repo_path`'s working checkout directly and never merges anything —
/// see `agent-studio/sidecar/feature-dev-agent.mjs` for the full harness.
#[tauri::command]
fn run_feature_dev_agent(app: tauri::AppHandle, repo_path: String, task: String) -> Result<(), String> {
    std::thread::spawn(move || {
        let _ = app.emit(
            "sidecar-status",
            SidecarStatus {
                status: "running".into(),
                code: None,
            },
        );

        let script = sidecar_script_path();
        let sidecar_dir = script.parent().and_then(|p| p.parent()).map(PathBuf::from);

        let mut command = Command::new("node");
        command.arg(&script).arg(&repo_path).arg(&task);
        if let Some(dir) = &sidecar_dir {
            command.current_dir(dir);
        }

        let mut child = match command
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    "sidecar-log",
                    SidecarLog {
                        line: format!(
                            "Failed to spawn feature-dev-agent sidecar ({}): {e}",
                            script.display()
                        ),
                    },
                );
                let _ = app.emit(
                    "sidecar-status",
                    SidecarStatus {
                        status: "failed_to_spawn".into(),
                        code: None,
                    },
                );
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let stdout_app = app.clone();
        let stdout_handle = stdout.map(|out| {
            stream_lines(out, move |line| {
                forward_sidecar_line(&stdout_app, &line);
            })
        });

        let stderr_app = app.clone();
        let stderr_handle = stderr.map(|err| {
            stream_lines(err, move |line| {
                let _ = stderr_app.emit(
                    "sidecar-log",
                    SidecarLog {
                        line: format!("[stderr] {line}"),
                    },
                );
            })
        });

        if let Some(h) = stdout_handle {
            let _ = h.join();
        }
        if let Some(h) = stderr_handle {
            let _ = h.join();
        }

        let code = child.wait().ok().and_then(|s| s.code());
        let _ = app.emit(
            "sidecar-status",
            SidecarStatus {
                status: "exited".into(),
                code,
            },
        );
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            run_node_version_check,
            run_feature_dev_agent
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
