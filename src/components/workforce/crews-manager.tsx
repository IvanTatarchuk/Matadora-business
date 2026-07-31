"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ArrowRight, Search, Filter } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "with_members" | "without_members">("all");

  const workerName = (id: string) =>
    workers.find((w) => w.id === id)?.full_name ?? "—";

  function add() {
    setError(null);
    if (!name.trim()) {
      setError("Nazwa brygady jest wymagana");
      return;
    }
    startTransition(async () => {
      const res = await createCrew(orgId, name, foreman || null);
      if (!res.ok) {
        setError(res.error ?? "Błąd tworzenia");
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

  const filteredCrews = crews.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "with_members" && c.memberIds.length > 0) ||
      (filterStatus === "without_members" && c.memberIds.length === 0);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Utwórz brygadę</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label>Nazwa brygady</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brygada A"
            />
          </div>
          <div className="space-y-1">
            <Label>Brygadzista</Label>
            <select
              className={selectClass}
              value={foreman}
              onChange={(e) => setForeman(e.target.value)}
            >
              <option value="">— nie wybrano —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={add} disabled={pending}>
            <Plus className="mr-1 h-4 w-4" /> Utwórz
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard/crews/new")} disabled={pending}>
            <Plus className="mr-1 h-4 w-4" /> Nowa
          </Button>
          {error && (
            <p className="text-sm text-destructive sm:col-span-4">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj brygad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "with_members" | "without_members")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="with_members">Z członkami</option>
          <option value="without_members">Bez członków</option>
        </select>
      </div>

      {filteredCrews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="font-medium">Nie ma jeszcze żadnych brygad</p>
            <p className="text-sm mt-1">Utwórz pierwszą brygadę, aby zacząć grupować pracowników</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCrews.map((crew) => (
            <Card key={crew.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex-1">
                  <CardTitle>{crew.name}</CardTitle>
                  {crew.foreman_worker_id && (
                    <p className="text-xs text-muted-foreground">
                      Brygadzista: {workerName(crew.foreman_worker_id)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/dashboard/crews/${crew.id}`)}
                    disabled={pending}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(crew.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-sm font-medium">
                  Członkowie ({crew.memberIds.length})
                </p>
                {workers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Najpierw dodaj pracowników.
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
