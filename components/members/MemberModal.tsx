"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import type { Member } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  member?: Member | null;
  defaultCode?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

// Form-level schema: all values are strings/booleans (what form fields emit).
// Nullable transformations happen server-side; the API accepts empty strings too.
// Note: is_bod must be z.boolean() (not .default()) so input/output types match
// for zodResolver. The default is set in the form's defaultValues instead.
const MemberFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().max(200, "Email too long").optional(),
  phone: z.string().max(20, "Phone too long").optional(),
  address: z.string().max(500, "Address too long").optional(),
  join_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  is_bod: z.boolean(),
  bod_designation: z.string().max(100, "Too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

type MemberFormValues = z.infer<typeof MemberFormSchema>;

const textareaClass =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground";

export function MemberModal({
  member,
  defaultCode,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!member;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: getDefaults(member, defaultCode),
  });

  const isBod = useWatch({ control, name: "is_bod" });

  useEffect(() => {
    reset(getDefaults(member, defaultCode));
  }, [member, defaultCode, reset]);

  async function onSubmit(values: MemberFormValues) {
    setIsPending(true);
    try {
      const url = isEditing ? `/api/members/${member.id}` : "/api/members";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      toast.success(
        isEditing ? "Member updated successfully" : "Member added successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Member" : "Add Member"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 p-6 pt-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="e.g. Abdul Rahman" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-error mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Code + Join Date */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Member Code</Label>
              <Input id="code" placeholder="e.g. 0025" {...register("code")} />
              {errors.code && (
                <p className="text-xs text-error mt-1">{errors.code.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="join_date">Join Date</Label>
              <Input id="join_date" type="date" {...register("join_date")} />
              {errors.join_date && (
                <p className="text-xs text-error mt-1">
                  {errors.join_date.message}
                </p>
              )}
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="optional"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-error mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="optional" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-error mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <textarea
              id="address"
              rows={2}
              placeholder="optional"
              className={textareaClass}
              {...register("address")}
            />
            {errors.address && (
              <p className="text-xs text-error mt-1">{errors.address.message}</p>
            )}
          </div>

          {/* Is BOD */}
          <div className="flex items-center gap-2">
            <input
              id="is_bod"
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              {...register("is_bod")}
            />
            <Label htmlFor="is_bod">Board of Directors (BOD) member</Label>
          </div>

          {/* BOD Designation — only when is_bod is checked */}
          {isBod && (
            <div className="space-y-1.5">
              <Label htmlFor="bod_designation">BOD Designation</Label>
              <Input
                id="bod_designation"
                placeholder="e.g. President, Secretary"
                {...register("bod_designation")}
              />
              {errors.bod_designation && (
                <p className="text-xs text-error mt-1">
                  {errors.bod_designation.message}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="optional"
              className={cn(textareaClass)}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-error mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save Member"
                  : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(
  member?: Member | null,
  defaultCode?: string
): MemberFormValues {
  return {
    code: member?.code ?? defaultCode ?? "",
    name: member?.name ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    address: member?.address ?? "",
    join_date: member?.join_date ?? new Date().toISOString().slice(0, 10),
    is_bod: member?.is_bod === 1,
    bod_designation: member?.bod_designation ?? "",
    notes: member?.notes ?? "",
  };
}
