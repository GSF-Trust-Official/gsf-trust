import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Branding */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <Image
            src="/gsf-logo.png"
            alt="GSF Trust"
            width={88}
            height={88}
            className="rounded-2xl shadow-md"
            priority
          />
        </div>
        <div>
          <h1 className="font-headline font-bold text-2xl text-on-surface tracking-tight">
            GSF Trust
          </h1>
          <p className="text-sm text-on-surface-variant">Member Portal</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm px-6 py-7 space-y-5">
        <p className="text-sm font-medium text-on-surface-variant">Sign in to your account</p>
        <LoginForm />
      </div>

      <p className="text-center text-sm text-on-surface-variant">
        Foundation member?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Request portal access
        </Link>
      </p>
    </div>
  );
}
