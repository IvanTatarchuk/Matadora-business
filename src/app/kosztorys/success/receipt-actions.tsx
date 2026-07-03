"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReceiptButton() {
  return (
    <Button
      variant="outline"
      className="w-full print:hidden"
      onClick={() => window.print()}
    >
      <Download className="mr-2 h-4 w-4" />
      Pobierz potwierdzenie zakupu (PDF)
    </Button>
  );
}
