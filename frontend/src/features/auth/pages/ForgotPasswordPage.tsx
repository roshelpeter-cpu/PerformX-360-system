// Forgot Password
// Lets an employee request a password reset that HR reviews through notifications.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/app/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/features/auth/hooks/useAuth";

const forgotPasswordSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const inputClass =
  "border-stone-400 bg-white text-stone-900 placeholder:text-stone-500 dark:border-stone-700 dark:bg-[#090807] dark:text-stone-100 dark:placeholder:text-stone-500";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { employeeId: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await forgotPassword.mutateAsync(values);
  });

  return (
    <AuthLayout>
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
        <div className="w-full rounded-3xl border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(28,25,23,0.12)] backdrop-blur-xl sm:p-8 dark:border-stone-700/70 dark:bg-stone-950/80">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">
              Contact HR
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-white">
              Password Reset Request
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Enter your Employee ID. HR will handle the password reset.
            </p>
          </div>

          {forgotPassword.isSuccess ? (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-medium">Request sent</p>
              <p>
                Your request has been sent to your HR Administrator. HR will
                reset your password.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-stone-800 dark:text-stone-200">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  placeholder="e.g. EMP000234"
                  aria-invalid={Boolean(errors.employeeId)}
                  className={inputClass}
                  {...register("employeeId")}
                />
                {errors.employeeId ? (
                  <p className="text-sm text-red-500">
                    {errors.employeeId.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-amber-700 hover:text-amber-600 dark:text-amber-300"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
