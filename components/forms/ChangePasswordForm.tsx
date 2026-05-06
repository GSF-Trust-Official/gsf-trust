"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  isForcedChange: boolean;
}

function PasswordField({
  id,
  label,
  hint,
  register,
  error,
}: {
  id: keyof ChangePasswordInput;
  label: string;
  hint?: string;
  register: ReturnType<typeof useForm<ChangePasswordInput>>["register"];
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "currentPassword" ? "current-password" : "new-password"}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="pr-10"
          {...register(id)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-error">{error}</p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  );
}

export function ChangePasswordForm({ isForcedChange }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordInput) {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        toast.error(json.error ?? "Could not update password.");
        return;
      }

      toast.success(
        isForcedChange
          ? "Password set. Welcome to GSF Trust."
          : "Password changed successfully."
      );
      router.push("/dashboard");
    } catch {
      toast.error("Could not reach the server. Check your connection.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {!isForcedChange && (
        <PasswordField
          id="currentPassword"
          label="Current password"
          register={register}
          error={errors.currentPassword?.message}
        />
      )}

      <PasswordField
        id="password"
        label="New password"
        hint="Minimum 12 characters for admin accounts."
        register={register}
        error={errors.password?.message}
      />

      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        register={register}
        error={errors.confirmPassword?.message}
      />

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 bg-primary hover:bg-primary-container text-white font-semibold"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating…
          </span>
        ) : isForcedChange ? (
          "Set new password"
        ) : (
          "Change password"
        )}
      </Button>
    </form>
  );
}
