import { listSuppliers } from "@/lib/actions/import";
import { ImportWizard } from "@/components/wholesaler/import-wizard";

export default async function ImportPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import materiałów</h1>
        <p className="text-sm text-muted-foreground">
          Wgraj cennik (CSV) otrzymany od dostawcy. Zmapuj kolumny, sprawdź
          podgląd i zaimportuj — istniejące produkty są dopasowywane po SKU,
          a ich ceny aktualizowane. Wykorzystywane są wyłącznie wgrane przez
          Ciebie dane; nic nie jest pobierane automatycznie.
        </p>
      </div>

      <ImportWizard suppliers={suppliers} />
    </div>
  );
}
