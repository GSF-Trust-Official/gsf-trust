"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full",
        "text-on-surface-variant hover:bg-surface-container hover:text-error transition-colors",
        loading && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Sign out
    </button>
  );
}
