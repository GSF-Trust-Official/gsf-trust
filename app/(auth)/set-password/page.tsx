"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      toast.error("Password must be at least 10 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { ok?: boolean; role?: string; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to set password"); return; }
      toast.success("Password set — welcome!");
      router.replace(data.role === "member" ? "/me" : "/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-error text-sm text-center">
        Invalid or missing invite link. Please request a new invitation from the Treasurer.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 10 characters"
            required
            minLength={10}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Confirm Password
        </Label>
        <Input
          id="confirm"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat password"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-primary hover:bg-primary-container text-white font-semibold"
      >
        {loading ? "Setting password…" : "Set Password & Log In"}
      </Button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[52%] bg-primary flex-col items-center justify-center p-14 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-36 h-36 rounded-3xl bg-white/5" />
        <div className="absolute bottom-16 right-10 w-52 h-52 rounded-3xl bg-white/5" />
        <div className="absolute top-1/2 right-6 w-24 h-24 rounded-2xl bg-white/5" />
        <div className="absolute top-20 right-1/3 w-16 h-16 rounded-xl bg-white/5" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs space-y-7">
          <div className="p-2 bg-white/10 rounded-3xl backdrop-blur-sm">
            <Image src="/gsf-logo.png" alt="GSF Trust" width={148} height={148} className="rounded-2xl" priority />
          </div>
          <div className="space-y-3">
            <h1 className="font-headline font-bold text-3xl text-white leading-snug">GSF Trust</h1>
            <p className="text-primary-fixed-dim text-sm leading-relaxed">
              Secure financial management for the Foundation's accounts, subscriptions, and fund tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — set password form */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10 space-y-3">
            <Image src="/gsf-logo.png" alt="GSF Trust" width={72} height={72} className="rounded-2xl shadow-md" priority />
            <h1 className="font-headline font-bold text-xl text-on-surface">GSF Trust</h1>
          </div>

          <div className="w-full max-w-sm space-y-8">
            <div>
              <h2 className="font-headline font-bold text-3xl text-on-surface">Set Your Password</h2>
              <p className="text-on-surface-variant mt-1.5 text-sm">
                Create a secure password to access the GSF Trust portal.
              </p>
            </div>
            <Suspense fallback={<p className="text-sm text-on-surface-variant">Loading…</p>}>
              <SetPasswordForm />
            </Suspense>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant pb-6">
          © {new Date().getFullYear()} GSF Trust · All rights reserved
        </p>
      </div>
    </div>
  );
}
