"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BookOpen,
  Landmark,
  Gift,
  HeartHandshake,
  GraduationCap,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/ledger", label: "General Ledger", icon: BookOpen },
  { href: "/zakat", label: "Zakat Account", icon: Landmark },
  { href: "/donations", label: "Donations", icon: Gift },
  { href: "/medical", label: "Medical Cases", icon: HeartHandshake },
  { href: "/scholarship", label: "Scholarship", icon: GraduationCap },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

interface NavLinksProps {
  role: UserRole;
  onNavigate?: () => void;
}

export function NavLinks({ role, onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <ul className="space-y-0.5">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
