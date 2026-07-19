use std::io::{BufRead, BufReader};
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

/// Phase 0 proof-of-concept: spawns `node --version` as a child process and
/// streams its stdout/stderr line-by-line as Tauri events. Establishes the
/// IPC pattern (spawn -> stream lines -> emit exit status) that later phases
/// reuse to stream a long-running Claude Agent SDK sidecar instead.
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
            std::thread::spawn(move || {
                for line in BufReader::new(out).lines().map_while(Result::ok) {
                    let _ = stdout_app.emit("sidecar-log", SidecarLog { line });
                }
            })
        });

        let stderr_app = app.clone();
        let stderr_handle = stderr.map(|err| {
            std::thread::spawn(move || {
                for line in BufReader::new(err).lines().map_while(Result::ok) {
                    let _ = stderr_app.emit(
                        "sidecar-log",
                        SidecarLog {
                            line: format!("[stderr] {line}"),
                        },
                    );
                }
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
        .invoke_handler(tauri::generate_handler![run_node_version_check])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
