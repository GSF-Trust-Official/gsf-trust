import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm shadow-md">
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
  );
}
