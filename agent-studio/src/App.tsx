import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

// Union of every lifecycle status the Phase 0 node-version-check sidecar
// and the Phase 1 feature-dev-agent sidecar can emit. Both currently share
// the same "sidecar-log" / "sidecar-status" Tauri events (see lib.rs), so
// one status/log panel reflects whichever sidecar last ran.
type SidecarStatusName =
  | "idle"
  | "running"
  | "worktree_created"
  | "agent_working"
  | "checks_passed"
  | "checks_failed"
  | "pushed"
  | "awaiting_review"
  | "no_changes"
  | "exited"
  | "failed_to_spawn"
  | "error";

type SidecarStatusPayload = {
  status: SidecarStatusName;
  code?: number | null;
  message?: string;
  taskId?: string;
  branch?: string;
  worktreePath?: string;
  compareUrl?: string;
  pushed?: boolean;
};

function App() {
  const [status, setStatus] = useState<SidecarStatusName>("idle");
  const [statusInfo, setStatusInfo] = useState<SidecarStatusPayload | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);

  const [repoPath, setRepoPath] = useState("");
  const [task, setTask] = useState("");

  useEffect(() => {
    const unlistenLog = listen<{ line: string }>("sidecar-log", (event) => {
      setLines((prev) => [...prev, event.payload.line]);
    });
    const unlistenStatus = listen<SidecarStatusPayload>("sidecar-status", (event) => {
      setStatus(event.payload.status);
      setStatusInfo(event.payload);
    });
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
    setStatusInfo(null);
    await invoke("run_node_version_check");
  }

  async function runFeatureDevAgent() {
    setLines([]);
    setStatusInfo(null);
    await invoke("run_feature_dev_agent", { repoPath, task });
  }

  const isBusy =
    status === "running" || status === "worktree_created" || status === "agent_working";

  const statusLabel: Record<SidecarStatusName, string> = {
    idle: "Не запущено",
    running: "Виконується...",
    worktree_created: "Worktree створено, запускаю агента...",
    agent_working: "Агент працює над задачею...",
    checks_passed: "Перевірки пройдені (typecheck/lint/build)",
    checks_failed: "Перевірки НЕ пройдені — гілка НЕ запушена",
    pushed: statusInfo?.pushed
      ? "Гілку запушено"
      : "Пуш пропущено (немає remote 'origin') — гілка й коміт лишились локально",
    awaiting_review: "Очікує рев'ю власника",
    no_changes: "Агент не зробив жодних змін",
    exited: statusInfo?.code === 0 ? "Завершено успішно" : `Завершено (код ${statusInfo?.code ?? "?"})`,
    failed_to_spawn: "Не вдалося запустити процес",
    error: `Помилка: ${statusInfo?.message ?? "невідома"}`,
  };

  return (
    <main className="container">
      <h1>Matadora Agent Studio</h1>
      <p className="subtitle">
        Фаза 0: перевірка IPC-каналу — Rust спавнить <code>node --version</code>{" "}
        і стрімить вивід у вікно.
      </p>

      <div className="row">
        <button onClick={runCheck} disabled={isBusy}>
          Запустити перевірку
        </button>
        <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>
      </div>

      <hr />

      <h2>Фаза 1: feature-dev агент</h2>
      <p className="subtitle">
        Запускає один агент Claude Agent SDK в ізольованому <code>git worktree</code>{" "}
        на новій гілці (<code>agent/&lt;task-id&gt;</code>), з <code>disallowedTools</code>{" "}
        та <code>PreToolUse</code>-хуком, що блокує push у main/production, merge,
        db:apply/db:migrate, vercel-деплой, gh pr merge/release та витік секретів
        (Stripe/Supabase service-role). Після успіху: typecheck+lint+build → коміт →
        push гілки (якщо є remote) → compare-посилання. НІКОЛИ не мержить.
        Використовуйте тестовий/scratch репозиторій, не реальний Matadora-business.
      </p>

      <div className="form-column">
        <input
          type="text"
          placeholder={String.raw`Шлях до цільового репозиторію (напр. C:\...\scratch-repo)`}
          value={repoPath}
          onChange={(e) => setRepoPath(e.target.value)}
          disabled={isBusy}
        />
        <input
          type="text"
          placeholder="Опис задачі (напр. add a comment to README.md)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          disabled={isBusy}
        />
        <div className="row">
          <button
            onClick={runFeatureDevAgent}
            disabled={isBusy || !repoPath.trim() || !task.trim()}
          >
            Запустити feature-dev агента
          </button>
          <span className={`status-badge status-${status}`}>{statusLabel[status]}</span>
        </div>
      </div>

      {statusInfo?.branch && (
        <p className="subtitle">
          Гілка: <code>{statusInfo.branch}</code>
          {statusInfo.worktreePath ? (
            <>
              {" "}
              · Worktree: <code>{statusInfo.worktreePath}</code>
            </>
          ) : null}
        </p>
      )}

      {statusInfo?.compareUrl && (
        <p>
          Compare URL:{" "}
          <a href={statusInfo.compareUrl} target="_blank" rel="noreferrer">
            {statusInfo.compareUrl}
          </a>
        </p>
      )}

      <pre ref={logRef} className="log-output">
        {lines.length === 0 ? "(поки що нічого не виведено)" : lines.join("\n")}
      </pre>
    </main>
  );
}

export default App;
