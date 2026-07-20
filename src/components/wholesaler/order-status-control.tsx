"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateOrderStatus } from "@/lib/actions/materials";
import type { OrderStatus } from "@/types/database";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Oczekujące",
  confirmed: "Potwierdzone",
  shipped: "Wysłane",
  delivered: "Dostarczone",
  cancelled: "Anulowane",
};

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: OrderStatus) {
    if (next === status) return;
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, next);
      if (!res.ok) {
        setError(res.error ?? "Nie udało się zaktualizować");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={status}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as OrderStatus)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
