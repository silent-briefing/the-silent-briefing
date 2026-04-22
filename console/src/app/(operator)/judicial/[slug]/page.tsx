import { DossierView } from "@/components/operator/dossier/DossierView";

type Props = { params: Promise<{ slug: string }> };

export default async function JudicialDossierPage({ params }: Props) {
  const { slug } = await params;
  return (
    <DossierView
      slug={slug}
      parentNav={{ href: "/judicial/supreme-court", label: "Supreme Court" }}
    />
  );
}
