import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <Card className="shadow-md">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="font-headline text-2xl text-on-surface">
            GSF Foundation
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="text-center text-sm text-on-surface-variant">
        Foundation member?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Request portal access
        </Link>
      </p>
    </div>
  );
}
