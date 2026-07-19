import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type SidecarStatus = "idle" | "running" | "exited" | "failed_to_spawn";

function App() {
  const [status, setStatus] = useState<SidecarStatus>("idle");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const unlistenLog = listen<{ line: string }>("sidecar-log", (event) => {
      setLines((prev) => [...prev, event.payload.line]);
    });
    const unlistenStatus = listen<{ status: SidecarStatus; code: number | null }>(
      "sidecar-status",
      (event) => {
        setStatus(event.payload.status);
        setExitCode(event.payload.code);
      }
    );
    return () => {
      unlistenLog.then((f) => f());
      unlistenStatus.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  async function runCheck() {
    setLines([]);
    setExitCode(null);
    await invoke("run_node_version_check");
  }

  const statusLabel: Record<SidecarStatus, string> = {
    idle: "Не запущено",
    running: "Виконується...",
    exited: exitCode === 0 ? "Завершено успішно" : `Завершено (код ${exitCode})`,
    failed_to_spawn: "Не вдалося запустити процес",
  };

  return (
    <main className="container">
      <h1>Matadora Agent Studio</h1>
      <p className="subtitle">
        Фаза 0: перевірка IPC-каналу — Rust спавнить <code>node --version</code>{" "}
        і стрімить вивід у вікно.
      </p>

      <div className="row">
        <button onClick={runCheck} disabled={status === "running"}>
          Запустити перевірку
        </button>
        <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>
      </div>

      <pre ref={logRef} className="log-output">
        {lines.length === 0 ? "(поки що нічого не виведено)" : lines.join("\n")}
      </pre>
    </main>
  );
}

export default App;
