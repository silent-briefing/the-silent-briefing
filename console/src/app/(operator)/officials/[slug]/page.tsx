import { DossierView } from "@/components/operator/dossier/DossierView";

type Props = { params: Promise<{ slug: string }> };

/** Same dossier chrome as `/judicial/[slug]`; hub at `/officials` still Phase B.8. */
export default async function OfficialDossierPage({ params }: Props) {
  const { slug } = await params;
  return (
    <DossierView slug={slug} parentNav={{ href: "/judicial", label: "Judicial" }} />
  );
}
