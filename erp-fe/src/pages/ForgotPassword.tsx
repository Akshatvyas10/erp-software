import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

// Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import AuthLayout from "@/layouts/AuthLayout";

// Icons
import { User, Loader2, ArrowLeft, Send, AlertCircle } from "lucide-react";

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Please enter your username, email, or mobile number"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: "",
    },
  });

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null); // Clear previous error
      const res = await api.post("/auth/forgot-password", {
        identifier: values.identifier.trim(),
      });
      setEmailSent(true);
      setCountdown(30); // 30-second cooldown timer for resend
      toast.success(res.data.message || "Password reset link sent to your registered email!");
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        "No account found. Check your username, email or mobile number and try again.";
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isSubmitting) return;
    const identifier = form.getValues("identifier");
    if (!identifier) {
      toast.error("Please enter your username, email, or mobile number");
      return;
    }
    await onSubmit({ identifier });
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
        </Link>
        <h2 className="text-2xl font-bold">Reset Password</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {emailSent
            ? "We've dispatched a reset link to your registered email address. Please check your inbox and spam folder."
            : "Enter your registered username, email, or mobile number and we'll send you reset instructions."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Username, Email, or Mobile
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. ERP-00001 or name@school.edu"
                      className="pl-10 h-12 border-none focus-visible:ring-primary"
                      autoComplete="username"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (errorMessage) setErrorMessage(null);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20 mt-8"
            disabled={isSubmitting || form.formState.isSubmitting || countdown > 0}
          >
            {isSubmitting || form.formState.isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : countdown > 0 ? (
              <span>Resend available in {countdown}s</span>
            ) : (
              <span className="flex items-center gap-2">
                {emailSent ? "Resend Reset Link" : "Send Reset Link"} <Send className="h-4 w-4" />
              </span>
            )}
          </Button>

          {/* Error message displayed at bottom of Send Reset Link button */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 mt-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          {emailSent && (
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Didn't receive the email?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isSubmitting}
                  className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed transition-opacity"
                >
                  {countdown > 0 ? `Resend email (${countdown}s)` : "Click to resend"}
                </button>
              </p>
            </div>
          )}

        </form>
      </Form>
    </AuthLayout>
  );
}
