"use client";

import { useState, useTransition } from "react";
import { Database, Clock, CheckCircle2, AlertCircle, Plus, RefreshCw, X, Calendar, Download, Search, Filter } from "lucide-react";
import {
  createBackupJob, createBackupSchedule, toggleBackupSchedule, createRestoreJob,
  type BackupJob, type BackupSchedule, type RestoreJob, type BackupType,
} from "@/lib/actions/backups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialBackupJobs: BackupJob[];
  initialSchedules: BackupSchedule[];
  initialRestoreJobs: RestoreJob[];
  initialStats: {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    activeSchedules: number;
    totalStorageUsed: number;
  };
};

export function BackupsClient({ initialBackupJobs, initialSchedules, initialRestoreJobs, initialStats }: Props) {
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>(initialBackupJobs);
  const [schedules, setSchedules] = useState<BackupSchedule[]>(initialSchedules);
  const [restoreJobs, setRestoreJobs] = useState<RestoreJob[]>(initialRestoreJobs);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showBackupForm, setShowBackupForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "running" | "failed">("all");

  const [backupForm, setBackupForm] = useState({
    name: "",
    type: "full" as BackupType,
    tables: [] as string[],
    includeStorage: true,
  });

  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    type: "full" as BackupType,
    schedule: "0 2 * * *",
    timezone: "UTC",
    tables: [] as string[],
    includeStorage: true,
    retentionDays: 30,
  });

  const [restoreForm, setRestoreForm] = useState({
    backupJobId: "",
    targetTables: [] as string[],
    restoreStorage: true,
    previewOnly: true,
  });

  function handleCreateBackup() {
    if (!backupForm.name) { setError("Назва є обов'язковою"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createBackupJob(backupForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowBackupForm(false);
      setBackupForm({ name: "", type: "full", tables: [], includeStorage: true });
      // Reload backups
      const newBackups = await fetch("/api/backups/jobs").then(r => r.json());
      setBackupJobs(newBackups);
    });
  }

  function handleCreateSchedule() {
    if (!scheduleForm.name || !scheduleForm.schedule) {
      setError("Назва та розклад є обов'язковими");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createBackupSchedule(scheduleForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowScheduleForm(false);
      setScheduleForm({ name: "", type: "full", schedule: "0 2 * * *", timezone: "UTC", tables: [], includeStorage: true, retentionDays: 30 });
      // Reload schedules
      const newSchedules = await fetch("/api/backups/schedules").then(r => r.json());
      setSchedules(newSchedules);
    });
  }

  function handleToggleSchedule(scheduleId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleBackupSchedule(scheduleId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload schedules
      const newSchedules = await fetch("/api/backups/schedules").then(r => r.json());
      setSchedules(newSchedules);
    });
  }

  function handleCreateRestore() {
    if (!restoreForm.backupJobId) { setError("Виберіть бекап"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createRestoreJob(restoreForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowRestoreForm(false);
      setRestoreForm({ backupJobId: "", targetTables: [], restoreStorage: true, previewOnly: true });
      // Reload restore jobs
      const newRestores = await fetch("/api/backups/restore").then(r => r.json());
      setRestoreJobs(newRestores);
    });
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredBackupJobs = backupJobs.filter((job) => {
    const matchesSearch = !searchQuery || job.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Бекапи та відновлення
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Керування бекапами, розкладами та відновленням даних
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Всього бекапів</p>
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalBackups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Успішні</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.successfulBackups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Помилки</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.failedBackups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Використано</p>
              <Download className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{formatBytes(stats.totalStorageUsed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowBackupForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Створити бекап
        </Button>
        <Button variant="outline" onClick={() => setShowScheduleForm(true)}>
          <Calendar className="h-4 w-4 mr-2" />
          Додати розклад
        </Button>
        <Button variant="outline" onClick={() => setShowRestoreForm(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Відновити
        </Button>
      </div>

      {/* Backup Form */}
      {showBackupForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Створити бекап</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowBackupForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={backupForm.name} onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Тип</label>
              <select
                value={backupForm.type}
                onChange={(e) => setBackupForm({ ...backupForm, type: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="full">Повний</option>
                <option value="incremental">Інкрементальний</option>
                <option value="differential">Диференційний</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="storage"
                checked={backupForm.includeStorage}
                onChange={(e) => setBackupForm({ ...backupForm, includeStorage: e.target.checked })}
              />
              <label htmlFor="storage" className="text-sm">Включити сховище</label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateBackup} disabled={pending}>{pending ? "Створення..." : "Створити"}</Button>
              <Button variant="outline" onClick={() => { setShowBackupForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Form */}
      {showScheduleForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Додати розклад</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowScheduleForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={scheduleForm.name} onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Тип</label>
              <select
                value={scheduleForm.type}
                onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="full">Повний</option>
                <option value="incremental">Інкрементальний</option>
                <option value="differential">Диференційний</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Cron розклад</label>
              <Input value={scheduleForm.schedule} onChange={(e) => setScheduleForm({ ...scheduleForm, schedule: e.target.value })} className="mt-1" placeholder="0 2 * * *" />
            </div>
            <div>
              <label className="text-sm font-medium">Часовий пояс</label>
              <Input value={scheduleForm.timezone} onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Зберігання (днів)</label>
              <Input type="number" value={scheduleForm.retentionDays} onChange={(e) => setScheduleForm({ ...scheduleForm, retentionDays: Number(e.target.value) })} className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateSchedule} disabled={pending}>{pending ? "Додавання..." : "Додати"}</Button>
              <Button variant="outline" onClick={() => { setShowScheduleForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restore Form */}
      {showRestoreForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Відновити з бекапу</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowRestoreForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Бекап</label>
              <select
                value={restoreForm.backupJobId}
                onChange={(e) => setRestoreForm({ ...restoreForm, backupJobId: e.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Виберіть бекап</option>
                {backupJobs.filter((b) => b.status === "completed").map((b) => (
                  <option key={b.id} value={b.id}>{b.name} - {new Date(b.created_at).toLocaleString("pl-PL")}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preview"
                checked={restoreForm.previewOnly}
                onChange={(e) => setRestoreForm({ ...restoreForm, previewOnly: e.target.checked })}
              />
              <label htmlFor="preview" className="text-sm">Тільки попередній перегляд</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="restoreStorage"
                checked={restoreForm.restoreStorage}
                onChange={(e) => setRestoreForm({ ...restoreForm, restoreStorage: e.target.checked })}
              />
              <label htmlFor="restoreStorage" className="text-sm">Відновити сховище</label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateRestore} disabled={pending}>{pending ? "Відновлення..." : "Відновити"}</Button>
              <Button variant="outline" onClick={() => { setShowRestoreForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Бекапи</CardTitle>
        </CardHeader>
        <CardContent>
          {backupJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає бекапів
            </div>
          ) : (
            <div className="space-y-2">
              {backupJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.status === "completed" ? "bg-green-100 text-green-700" :
                        job.status === "running" ? "bg-blue-100 text-blue-700" :
                        job.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.type} • {job.file_size_bytes ? formatBytes(job.file_size_bytes) : "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Розклади</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає розкладів
            </div>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{schedule.name}</p>
                      {schedule.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-gray-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{schedule.schedule} • {schedule.timezone}</p>
                    <p className="text-xs text-muted-foreground">Зберігання: {schedule.retention_days} днів</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleToggleSchedule(schedule.id)}>
                    {schedule.is_active ? "Вимкнути" : "Увімкнути"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Завдання відновлення</CardTitle>
        </CardHeader>
        <CardContent>
          {restoreJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає завдань відновлення
            </div>
          ) : (
            <div className="space-y-2">
              {restoreJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.status === "completed" ? "bg-green-100 text-green-700" :
                        job.status === "running" ? "bg-blue-100 text-blue-700" :
                        job.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {job.status}
                      </span>
                      {job.preview_only && <span className="text-xs text-muted-foreground">(попередній перегляд)</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
