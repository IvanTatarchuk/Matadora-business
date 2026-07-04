"use client";

import { useState, useTransition } from "react";
import { Shield, Activity, AlertTriangle, CheckCircle2, X, RefreshCw, LogOut, Clock } from "lucide-react";
import {
  resolveSecurityEvent, revokeSession,
  type SecurityEvent, type UserSession, type AuditLog,
} from "@/lib/actions/security";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialAuditLogs: AuditLog[];
  initialSecurityEvents: SecurityEvent[];
  initialSessions: UserSession[];
  initialStats: {
    totalAuditLogs: number;
    unresolvedEvents: number;
    criticalEvents: number;
    activeSessions: number;
  };
};

export function SecurityClient({ initialAuditLogs, initialSecurityEvents, initialSessions, initialStats }: Props) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(initialSecurityEvents);
  const [sessions, setSessions] = useState<UserSession[]>(initialSessions);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleResolveEvent(eventId: string, notes: string) {
    setError(null);
    startTransition(async () => {
      const res = await resolveSecurityEvent(eventId, notes);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload events
      const newEvents = await fetch("/api/security/events").then(r => r.json());
      setSecurityEvents(newEvents);
    });
  }

  function handleRevokeSession(sessionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeSession(sessionId, "revoked_by_admin");
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload sessions
      const newSessions = await fetch("/api/security/sessions").then(r => r.json());
      setSessions(newSessions);
    });
  }

  const unresolvedEvents = securityEvents.filter((e) => !e.resolved);
  const activeSessions = sessions.filter((s) => !s.ended_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Безпека та аудит
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Логи аудиту, події безпеки та активні сесії
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Логи аудиту</p>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalAuditLogs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Невирішені події</p>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats.unresolvedEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Критичні події</p>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.criticalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Активні сесії</p>
              <Clock className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Події безпеки</CardTitle>
        </CardHeader>
        <CardContent>
          {unresolvedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає невирішених подій
            </div>
          ) : (
            <div className="space-y-2">
              {unresolvedEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.event_type}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        event.severity === "critical" ? "bg-red-100 text-red-700" :
                        event.severity === "high" ? "bg-orange-100 text-orange-700" :
                        event.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description || "Без опису"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleResolveEvent(event.id, "resolved")}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Вирішити
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Активні сесії</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає активних сесій
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.browser || "Unknown browser"}</p>
                      <span className="text-xs text-muted-foreground">{session.os || "Unknown OS"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{session.ip_address || "Unknown IP"}</p>
                    <p className="text-xs text-muted-foreground">
                      Остання активність: {new Date(session.last_activity).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleRevokeSession(session.id)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Відключити
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Логи аудиту</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає логів
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{log.action}</p>
                      {log.entity_type && <span className="text-xs text-muted-foreground">{log.entity_type}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{log.ip_address || "Unknown IP"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
