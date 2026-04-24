import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { NavLinks } from "@/components/layout/NavLinks";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-surface-low">
      {/* Desktop sidebar — fixed, 18rem wide, xl+ only */}
      <aside className="hidden xl:flex xl:flex-col xl:fixed xl:inset-y-0 xl:w-72 bg-white border-r border-outline-variant">
        <div className="flex items-center h-16 px-6 border-b border-outline-variant shrink-0">
          <span className="font-headline font-bold text-primary text-lg">
            GSF Foundation
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks role={user.role} />
        </nav>

        <div className="border-t border-outline-variant px-4 py-4 shrink-0">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-on-surface truncate">
              {user.name}
            </p>
            <p className="text-xs text-on-surface-variant capitalize">
              {user.role}
            </p>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content — offset by sidebar width on xl+ */}
      <main className="xl:pl-72 flex-1 flex flex-col min-h-screen">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 pb-24 xl:pb-6 flex-1">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav role={user.role} name={user.name} />
    </div>
  );
}
