import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="font-headline text-2xl text-on-surface">
          Set your password
        </CardTitle>
        <CardDescription>
          Choose a strong password before continuing. You won&apos;t be asked
          again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
