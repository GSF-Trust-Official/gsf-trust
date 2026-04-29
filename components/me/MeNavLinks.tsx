"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/me",                label: "Overview" },
  { href: "/me/subscriptions",  label: "Subscriptions" },
  { href: "/me/donations",      label: "Donations" },
  { href: "/me/profile",        label: "My Profile" },
  { href: "/me/scholarship",    label: "Scholarship" },
  { href: "/payments",          label: "Make a Payment" },
];

interface Props {
  mobile?: boolean;
}

export function MeNavLinks({ mobile = false }: Props) {
  const pathname = usePathname();

  const items = mobile ? NAV.slice(0, 5) : NAV;

  if (mobile) {
    return (
      <>
        {items.map(({ href, label }) => {
          const isActive = href === "/me" ? pathname === "/me" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium min-h-[56px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant"
              )}
            >
              <span className="text-xs text-center leading-tight px-0.5">{label}</span>
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      {items.map(({ href, label }) => {
        const isActive = href === "/me" ? pathname === "/me" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-white"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            )}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
