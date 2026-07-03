import { listSuppliers } from "@/lib/actions/import";
import { ImportWizard } from "@/components/wholesaler/import-wizard";

export default async function ImportPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import materials</h1>
        <p className="text-sm text-muted-foreground">
          Upload a price list (CSV) you received from a supplier. Map the
          columns, preview, and import — existing products are matched by SKU
          and their prices updated. Only data you upload is used; nothing is
          scraped.
        </p>
      </div>

      <ImportWizard suppliers={suppliers} />
    </div>
  );
}
