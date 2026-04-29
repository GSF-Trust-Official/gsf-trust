import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { MeNavLinks } from "@/components/me/MeNavLinks";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!isMember(user.role)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-surface-low">
      {/* Desktop sidebar */}
      <aside className="hidden xl:flex xl:flex-col xl:fixed xl:inset-y-0 xl:w-64 bg-white border-r border-outline-variant">
        <div className="flex items-center h-16 px-6 border-b border-outline-variant shrink-0">
          <span className="font-headline font-bold text-primary text-lg">GSF Foundation</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <MeNavLinks />
        </nav>
        <div className="border-t border-outline-variant px-4 py-4 shrink-0">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
            <p className="text-xs text-on-surface-variant">Member</p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="xl:pl-64 flex-1 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-24 xl:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="xl:hidden fixed bottom-0 inset-x-0 bg-white border-t border-outline-variant z-40 flex">
        <MeNavLinks mobile />
      </nav>
    </div>
  );
}
