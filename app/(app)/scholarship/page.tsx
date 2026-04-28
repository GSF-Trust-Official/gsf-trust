import { getCloudflareContext } from "@opennextjs/cloudflare";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getScholarshipPayouts } from "@/lib/queries/scholarshipPayouts";
import { getActiveAnnouncement } from "@/lib/queries/scholarshipAnnouncements";
import { getAllMembers } from "@/lib/queries/members";
import { ScholarshipClient } from "@/components/scholarship/ScholarshipClient";

interface PageProps {
  searchParams: Promise<{ academicYear?: string; page?: string }>;
}

export default async function ScholarshipPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (isMember(user.role)) redirect("/me");

  const { env } = getCloudflareContext();
  const db = env.DB;

  const sp           = await searchParams;
  const academicYear = sp.academicYear ?? undefined;
  const page         = Math.max(1, parseInt(sp.page ?? "1", 10));

  const [data, announcement, allMembers] = await Promise.all([
    getScholarshipPayouts(db, { academicYear, page, pageSize: 20 }),
    getActiveAnnouncement(db),
    getAllMembers(db),
  ]);

  const members = allMembers
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.id, code: m.code, name: m.name }));

  return (
    <ScholarshipClient
      initialData={data}
      announcement={announcement}
      members={members}
      role={user.role}
      academicYear={academicYear ?? ""}
    />
  );
}
