"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, UserMinusIcon } from "lucide-react";

import type { Member, UserRole } from "@/types";
import { canWrite, isAdmin } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberModal } from "@/components/members/MemberModal";

interface Props {
  member: Member;
  role: UserRole;
}

export function MemberProfileClient({ member, role }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function handleDeactivate() {
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to deactivate member");
        return;
      }
      toast.success(`${member.name} has been deactivated`);
      setConfirmOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeactivating(false);
    }
  }

  return (
    <>
      {/* Status badge + action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex px-2.5 py-1 rounded-full text-xs font-medium",
            member.status === "active"
              ? "bg-success-container text-success"
              : "bg-surface-container text-on-surface-variant"
          )}
        >
          {member.status === "active" ? "Active" : "Inactive"}
        </span>
        {canWrite(role) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <PencilIcon />
            Edit
          </Button>
        )}
        {isAdmin(role) && member.status === "active" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <UserMinusIcon />
            Deactivate
          </Button>
        )}
      </div>

      {/* Edit modal */}
      <MemberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        member={member}
        onSuccess={() => router.refresh()}
      />

      {/* Deactivate confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deactivate Member</DialogTitle>
            <DialogDescription>
              {member.name} will be marked as inactive. This can be reviewed
              later. The audit log will retain a permanent record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end p-6 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
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
    </>
  );
}
