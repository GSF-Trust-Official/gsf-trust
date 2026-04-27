"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import React from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/NavLinks";
import { SignOutButton } from "@/components/layout/SignOutButton";
import type { UserRole } from "@/types";

const PRIMARY_TABS: { href: string; label: string; icon: React.ElementType; roles?: UserRole[] }[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users, roles: ["admin", "editor", "viewer"] },
  { href: "/subscriptions", label: "Subs", icon: CreditCard, roles: ["admin", "editor", "viewer"] },
  { href: "/ledger", label: "Ledger", icon: BookOpen, roles: ["admin", "editor", "viewer"] },
];

interface BottomNavProps {
  role: UserRole;
  name: string;
}

export function BottomNav({ role, name }: BottomNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="xl:hidden fixed bottom-0 inset-x-0 bg-white border-t border-outline-variant z-40 safe-area-inset-bottom">
      <div className="flex">
        {PRIMARY_TABS.filter((tab) => !tab.roles || tab.roles.includes(role)).map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 min-h-14 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[2.5]")} />
              {tab.label}
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="flex-1 flex flex-col items-center justify-center py-2 min-h-14 text-xs font-medium text-on-surface-variant bg-transparent border-none cursor-pointer"
            render={<button />}
          >
            <MoreHorizontal className="h-5 w-5 mb-0.5" />
            More
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl px-4 pb-8">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="text-sm font-semibold text-on-surface">
                {name}
                <span className="ml-2 text-xs font-normal text-on-surface-variant capitalize">
                  ({role})
                </span>
              </SheetTitle>
            </SheetHeader>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
            <div className="mt-3 border-t border-outline-variant pt-3">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
