"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, EyeIcon, UserMinusIcon } from "lucide-react";

import type { Member, UserRole } from "@/types";
import { canWrite, isAdmin } from "@/lib/roles";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MemberModal } from "@/components/members/MemberModal";

const PAGE_SIZE = 20;

function computeNextCode(members: Member[]): string {
  const numeric = members
    .map((m) => parseInt(m.code, 10))
    .filter((n) => !isNaN(n));
  if (numeric.length === 0) return "0001";
  return String(Math.max(...numeric) + 1).padStart(4, "0");
}

interface Props {
  members: Member[];
  role: UserRole;
}

export function MembersClient({ members, role }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive" | "bod">("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deactivatingMember, setDeactivatingMember] = useState<Member | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const nextCode = useMemo(() => computeNextCode(members), [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      if (statusFilter === "active" && m.status !== "active") return false;
      if (statusFilter === "inactive" && m.status !== "inactive") return false;
      if (statusFilter === "bod" && m.is_bod !== 1) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [members, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageMembers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(f: "" | "active" | "inactive" | "bod") {
    setStatusFilter(f);
    setPage(1);
  }

  async function handleDeactivate() {
    if (!deactivatingMember) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/members/${deactivatingMember.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to deactivate");
        return;
      }
      toast.success(`${deactivatingMember.name} has been deactivated`);
      setDeactivatingMember(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeactivating(false);
    }
  }

  const filterLabels: { value: "" | "active" | "inactive" | "bod"; label: string }[] = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "bod", label: "BOD Only" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Members
        </h1>
        {canWrite(role) && (
          <Button
            onClick={() => {
              setEditingMember(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon />
            Add Member
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {filterLabels.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-high"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-on-surface-variant">
        {filtered.length} member{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table — sm+ */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-sm">
          <thead className="border-b border-outline-variant bg-surface-low">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Code
              </th>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Contact
              </th>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Join Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-on-surface-variant">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageMembers.map((m) => (
              <tr
                key={m.id}
                className="border-b border-outline-variant last:border-0 hover:bg-surface-low transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                  {m.code}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/members/${m.id}`}
                      className="font-medium text-on-surface hover:text-primary"
                    >
                      {m.name}
                    </Link>
                    {m.is_bod === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary-fixed text-on-primary-fixed-variant">
                        {m.bod_designation ?? "BOD"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant text-xs">
                  {m.email ?? m.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-on-surface-variant text-xs">
                  {formatDate(m.join_date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                      m.status === "active"
                        ? "bg-success-container text-success"
                        : "bg-surface-container text-on-surface-variant"
                    )}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Link href={`/members/${m.id}`}>
                      <Button variant="ghost" size="icon-sm" aria-label="View member">
                        <EyeIcon />
                      </Button>
                    </Link>
                    {canWrite(role) && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit member"
                        onClick={() => {
                          setEditingMember(m);
                          setModalOpen(true);
                        }}
                      >
                        <PencilIcon />
                      </Button>
                    )}
                    {isAdmin(role) && m.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Deactivate member"
                        className="text-error hover:bg-error-container"
                        onClick={() => setDeactivatingMember(m)}
                      >
                        <UserMinusIcon />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageMembers.length === 0 && (
          <p className="text-center py-12 text-on-surface-variant">
            No members found.
          </p>
        )}
      </div>

      {/* Cards — mobile only */}
      <div className="sm:hidden space-y-3">
        {pageMembers.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-outline-variant bg-white p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-on-surface-variant mb-0.5">
                  {m.code}
                </p>
                <Link
                  href={`/members/${m.id}`}
                  className="font-medium text-on-surface hover:text-primary"
                >
                  {m.name}
                </Link>
                {m.is_bod === 1 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-primary-fixed text-on-primary-fixed-variant">
                    {m.bod_designation ?? "BOD"}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                  m.status === "active"
                    ? "bg-success-container text-success"
                    : "bg-surface-container text-on-surface-variant"
                )}
              >
                {m.status}
              </span>
            </div>
            {(m.email ?? m.phone) && (
              <p className="text-sm text-on-surface-variant">
                {m.email ?? m.phone}
              </p>
            )}
            <p className="text-xs text-on-surface-variant">
              Joined {formatDate(m.join_date)}
            </p>
            <div className="flex gap-2 pt-1">
              <Link href={`/members/${m.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
              {canWrite(role) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingMember(m);
                    setModalOpen(true);
                  }}
                >
                  Edit
                </Button>
              )}
              {isAdmin(role) && m.status === "active" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeactivatingMember(m)}
                >
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
        {pageMembers.length === 0 && (
          <p className="text-center py-12 text-on-surface-variant">
            No members found.
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-on-surface-variant">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Deactivate confirmation */}
      <Dialog
        open={!!deactivatingMember}
        onOpenChange={(v) => !v && setDeactivatingMember(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deactivate Member</DialogTitle>
            <DialogDescription>
              {deactivatingMember?.name} will be marked as inactive. This can
              be reviewed later. The audit log will retain a permanent record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end p-6 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeactivatingMember(null)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member modal */}
      <MemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={editingMember}
        defaultCode={nextCode}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
