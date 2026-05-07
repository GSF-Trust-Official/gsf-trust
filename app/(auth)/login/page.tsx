import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-primary flex-col items-center justify-center p-14 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-10 left-10 w-36 h-36 rounded-3xl bg-white/5" />
        <div className="absolute bottom-16 right-10 w-52 h-52 rounded-3xl bg-white/5" />
        <div className="absolute top-1/2 right-6 w-24 h-24 rounded-2xl bg-white/5" />
        <div className="absolute top-20 right-1/3 w-16 h-16 rounded-xl bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs space-y-7">
          <div className="p-2 bg-white/10 rounded-3xl backdrop-blur-sm">
            <Image
              src="/gsf-logo-def.jpeg"
              alt="GSF Trust"
              width={148}
              height={148}
              className="rounded-2xl"
              priority
            />
          </div>
          <div className="space-y-3">
            <h1 className="font-headline font-bold text-3xl text-white leading-snug">
              GSF Trust
            </h1>
            <p className="text-primary-fixed-dim text-sm leading-relaxed">
              Secure financial management for the Foundation's accounts,
              subscriptions, and fund tracking.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10 space-y-3">
            <Image
              src="/gsf-logo-def.jpeg"
              alt="GSF Trust"
              width={72}
              height={72}
              className="rounded-2xl shadow-md"
              priority
            />
            <h1 className="font-headline font-bold text-xl text-on-surface">GSF Trust</h1>
          </div>

          <div className="w-full max-w-sm space-y-8">
            <div>
              <h2 className="font-headline font-bold text-3xl text-on-surface">
                Welcome back
              </h2>
              <p className="text-on-surface-variant mt-1.5 text-sm">
                Sign in to the accounts portal
              </p>
            </div>

            <LoginForm />

            <p className="text-center text-sm text-on-surface-variant">
              Foundation member?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Request portal access
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
