"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MemberProfile {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  join_date: string;
  status: string;
}

export default function MeProfilePage() {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((d: { member?: MemberProfile }) => {
        if (d.member) {
          setMember(d.member);
          setPhone(d.member.phone ?? "");
          setEmail(d.member.email ?? "");
        }
      })
      .catch(() => toast.error("Failed to load profile"));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim() || null,
          email: email.trim() || null,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
      toast.success("Profile updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!member) return <p className="text-sm text-on-surface-variant">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">My Profile</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Update your contact details.</p>
      </div>

      <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-outline-variant">
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Name</p>
            <p className="text-sm font-medium text-on-surface mt-1">{member.name}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Member Code</p>
            <p className="text-sm font-mono font-medium text-on-surface mt-1">{member.code}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Joined</p>
            <p className="text-sm text-on-surface mt-1">
              {new Date(member.join_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Status</p>
            <p className="text-sm text-on-surface mt-1 capitalize">{member.status}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-surface-container border-0 shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="bg-surface-container border-0 shadow-none"
            />
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="size-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
