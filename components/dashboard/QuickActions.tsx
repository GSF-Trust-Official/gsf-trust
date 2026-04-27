"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface QuickActionsProps {
  /** Only admin and editor see these buttons. */
  canWrite: boolean;
}

interface Action {
  label: string;
  phase: string;
  icon: string;
}

const ACTIONS: Action[] = [
  { label: "Log Subscription", phase: "Phase 4", icon: "📋" },
  { label: "Log Donation",     phase: "Phase 6", icon: "🤲" },
  { label: "Log Expense",      phase: "Phase 5", icon: "📝" },
];

export function QuickActions({ canWrite }: QuickActionsProps) {
  const [fabOpen, setFabOpen] = useState(false);

  if (!canWrite) return null;

  const handleAction = (action: Action) => {
    setFabOpen(false);
    toast.info(`${action.label} modal coming in ${action.phase}.`);
  };

  return (
    <>
      {/* Desktop: inline buttons */}
      <div className="hidden xl:flex items-center gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => handleAction(action)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-container transition-colors"
          >
            <span>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Mobile: FAB + bottom sheet */}
      <div className="xl:hidden">
        <button
          onClick={() => setFabOpen(true)}
          aria-label="Quick actions"
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl hover:bg-primary-container transition-colors"
        >
          +
        </button>

        <Sheet open={fabOpen} onOpenChange={setFabOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader className="mb-4">
              <SheetTitle>Quick Actions</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleAction(action)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left text-sm font-medium bg-surface-low hover:bg-surface-container transition-colors text-on-surface"
                >
                  <span className="text-xl">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
