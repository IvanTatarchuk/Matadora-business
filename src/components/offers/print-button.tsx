"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Triggers the browser's native print dialog so the branded offer can be
 * saved as a PDF. Hidden from the printed output via `print:hidden`.
 */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
