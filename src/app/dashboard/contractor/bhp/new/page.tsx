import { getBhpDocument, type BhpDocType } from "@/lib/actions/bhp";
import { BhpDocumentForm } from "./bhp-document-form";

export default async function NewBhpDocumentPage({
  searchParams,
}: {
  searchParams: { id?: string; type?: string };
}) {
  const existing = searchParams.id ? await getBhpDocument(searchParams.id) : null;

  return (
    <BhpDocumentForm
      existing={existing}
      defaultType={(searchParams.type as BhpDocType) ?? "szkolenie_bhp"}
    />
  );
}
