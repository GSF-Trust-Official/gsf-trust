"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, member_code: memberCode.trim() || undefined, message: message.trim() || undefined }),
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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-low px-4">
        <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-8 text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-headline font-bold text-on-surface">Request Submitted</h1>
          <p className="text-sm text-on-surface-variant">
            Your registration request has been submitted. The Treasurer will review it and you&apos;ll
            receive an email when your account is ready.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-low px-4">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Request Access</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Submit a request to the Treasurer for a member portal account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Member Code <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input id="code" value={memberCode} onChange={(e) => setMemberCode(e.target.value)} placeholder="If shown on your receipt, e.g. GSF042" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message to Treasurer <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you'd like to tell the Treasurer…"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Submit Request"}
          </Button>
        </form>

        <p className="text-center text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
