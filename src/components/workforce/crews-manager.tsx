"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCrew,
  deleteCrew,
  setCrewMembers,
  type CrewWithMembers,
} from "@/lib/actions/workforce";
import type { Worker } from "@/types/database";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export function CrewsManager({
  orgId,
  workers,
  crews,
}: {
  orgId: string;
  workers: Worker[];
  crews: CrewWithMembers[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [foreman, setForeman] = useState("");
  const [error, setError] = useState<string | null>(null);

  const workerName = (id: string) =>
    workers.find((w) => w.id === id)?.full_name ?? "—";

  function add() {
    setError(null);
    if (!name.trim()) {
      setError("Crew name is required");
      return;
    }
    startTransition(async () => {
      const res = await createCrew(orgId, name, foreman || null);
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      setName("");
      setForeman("");
      router.refresh();
    });
  }

  function toggleMember(crew: CrewWithMembers, workerId: string) {
    const next = crew.memberIds.includes(workerId)
      ? crew.memberIds.filter((id) => id !== workerId)
      : [...crew.memberIds, workerId];
    startTransition(async () => {
      await setCrewMembers(crew.id, next);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteCrew(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create crew</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label>Crew name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Crew A"
            />
          </div>
          <div className="space-y-1">
            <Label>Foreman</Label>
            <select
              className={selectClass}
              value={foreman}
              onChange={(e) => setForeman(e.target.value)}
            >
              <option value="">— none —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={add} disabled={pending}>
            <Plus className="mr-1 h-4 w-4" /> Create
          </Button>
          {error && (
            <p className="text-sm text-destructive sm:col-span-3">{error}</p>
          )}
        </CardContent>
      </Card>

      {crews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No crews yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {crews.map((crew) => (
            <Card key={crew.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{crew.name}</CardTitle>
                  {crew.foreman_worker_id && (
                    <p className="text-xs text-muted-foreground">
                      Foreman: {workerName(crew.foreman_worker_id)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(crew.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm font-medium">
                  Members ({crew.memberIds.length})
                </p>
                {workers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Add workers first.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {workers.map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={crew.memberIds.includes(w.id)}
                          onChange={() => toggleMember(crew, w.id)}
                          disabled={pending}
                        />
                        {w.full_name}
                        {w.specialty && (
                          <span className="text-muted-foreground">
                            · {w.specialty}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
