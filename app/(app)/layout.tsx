export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-low">
      {/* Sidebar — Phase 1 */}
      <aside className="hidden xl:flex xl:flex-col xl:fixed xl:inset-y-0 xl:w-72 bg-white border-r border-outline-variant">
        <div className="flex items-center h-16 px-6 border-b border-outline-variant">
          <span className="font-headline font-bold text-primary text-lg">
            GSF Foundation
          </span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {/* Nav links — Phase 1 */}
        </nav>
      </aside>

      {/* Main content */}
      <main className="xl:pl-72 flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex-1">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — Phase 1 */}
    </div>
  );
}
