import { PrawnikAiClient } from "./prawnik-ai-client";

export default function PrawnikAiPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Adwokat AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wygeneruj projekt umowy dopasowany do Twojej sytuacji lub prześlij dokument do analizy pod
          kątem ryzyk prawnych — w ramach jednej opłaconej sesji.
        </p>
      </div>
      <PrawnikAiClient />
    </div>
  );
}
