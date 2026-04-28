import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isMember, isAdmin } from "@/lib/roles";
import { getMedicalCases } from "@/lib/queries/medicalCases";
import { MedicalClient } from "@/components/medical/MedicalClient";

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function MedicalPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (isMember(user.role)) redirect("/me");

  const { env } = getCloudflareContext();
  const db = env.DB;

  const sp     = await searchParams;
  const status = (sp.status === "open" || sp.status === "closed") ? sp.status : undefined;
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10));

  const data = await getMedicalCases(db, { status, page, pageSize: 20 }, isAdmin(user.role));

  return (
    <MedicalClient
      initialData={data}
      role={user.role}
      status={status ?? ""}
    />
  );
}
