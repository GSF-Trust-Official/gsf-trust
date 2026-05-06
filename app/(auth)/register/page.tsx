"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SuccessState() {
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

      {/* Right panel — success state */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="lg:hidden flex flex-col items-center mb-10 space-y-3">
            <Image src="/gsf-logo.png" alt="GSF Trust" width={72} height={72} className="rounded-2xl shadow-md" priority />
            <h1 className="font-headline font-bold text-xl text-on-surface">GSF Trust</h1>
          </div>
          <div className="w-full max-w-sm text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-success-container flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline font-bold text-2xl text-on-surface">Request Submitted</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Your registration request has been submitted. The Treasurer will review it and
                you&apos;ll receive an email when your account is ready.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-container transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-on-surface-variant pb-6">
          © {new Date().getFullYear()} GSF Trust · All rights reserved
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          member_code: memberCode.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to submit"); return; }
      setDone(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <SuccessState />;

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

      {/* Right panel — registration form */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10 space-y-3">
            <Image src="/gsf-logo.png" alt="GSF Trust" width={72} height={72} className="rounded-2xl shadow-md" priority />
            <h1 className="font-headline font-bold text-xl text-on-surface">GSF Trust</h1>
          </div>

          <div className="w-full max-w-sm space-y-8">
            <div>
              <h2 className="font-headline font-bold text-3xl text-on-surface">Request Access</h2>
              <p className="text-on-surface-variant mt-1.5 text-sm">
                Fill in your details and the Treasurer will approve your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Full Name <span className="text-error">*</span>
                </Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Email Address <span className="text-error">*</span>
                </Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Phone <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(optional)</span>
                </Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Member Code <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(optional)</span>
                </Label>
                <Input id="code" value={memberCode} onChange={(e) => setMemberCode(e.target.value)} placeholder="e.g. GSF042" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Message to Treasurer <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(optional)</span>
                </Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything you'd like to tell the Treasurer…"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-outline-variant bg-transparent px-3 py-2 text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-shadow"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-container text-white font-semibold"
              >
                {loading ? "Submitting…" : "Submit Request"}
              </Button>
            </form>

            <p className="text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant pb-6">
          © {new Date().getFullYear()} GSF Trust · All rights reserved
        </p>
      </div>
    </div>
  );
}
