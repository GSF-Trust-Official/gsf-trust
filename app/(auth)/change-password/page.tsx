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

  const isForcedChange = user.mustChangePassword;

  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="font-headline text-2xl text-on-surface">
          {isForcedChange ? "Set your password" : "Change password"}
        </CardTitle>
        <CardDescription>
          {isForcedChange
            ? "Choose a strong password before continuing. You won't be asked again."
            : "Enter your current password, then choose a new one."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm isForcedChange={isForcedChange} />
      </CardContent>
    </Card>
  );
}
