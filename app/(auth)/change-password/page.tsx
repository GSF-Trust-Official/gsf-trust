import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isForcedChange = user.mustChangePassword;

  return (
    <div className="min-h-screen bg-surface-low flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <Image src="/gsf-logo.png" alt="GSF Trust" width={56} height={56} className="rounded-2xl shadow-md" />
          <span className="font-headline font-bold text-lg text-on-surface">GSF Trust</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm px-7 py-8 space-y-6">
          <div>
            <h1 className="font-headline font-bold text-2xl text-on-surface">
              {isForcedChange ? "Set Your Password" : "Change Password"}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {isForcedChange
                ? "Choose a strong password before continuing. You won't be asked again."
                : "Enter your current password, then choose a new one."}
            </p>
          </div>
          <ChangePasswordForm isForcedChange={isForcedChange} />
        </div>
      </div>

      <p className="text-center text-xs text-on-surface-variant mt-8">
        © {new Date().getFullYear()} GSF Trust · All rights reserved
      </p>
    </div>
  );
}
