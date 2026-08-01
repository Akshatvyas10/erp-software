import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import AuthLayout from "@/layouts/AuthLayout";
import { Eye, EyeOff, User, Lock, Loader2, ArrowRight } from "lucide-react";

import api from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { loginSuccess } from "@/store/slices/authSlice";

const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: "", password: "", remember: false },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const { data } = await api.post("/auth/login", {
        userId: values.userId,
        password: values.password,
        remember: values.remember,
      });

      // ── Store ONLY token + safe user — no permissions in Redux from login ──
      dispatch(loginSuccess({
        token: data.data.accessToken,
        user: data.data.user,
      }));

      toast.success(`Welcome back, ${data.data.user.firstName}!`);
      // Navigate to dashboard — DashboardLayout will fetch + decrypt permissions
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Login failed. Please try again.";
      toast.error(message);
      if ((err as { response?: { status?: number } })?.response?.status === 401) {
        form.setError("password", { message });
      }
    }
  };

  return (
    <AuthLayout>
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Portal Login</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Enter your credentials to access your account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="userId" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User ID</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="e.g. ERP-00001" className="pl-10 h-12  border-none focus-visible:ring-primary" autoComplete="username" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                <Link to="/forgot-password">
                  <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary font-bold hover:bg-transparent">Forgot?</Button>
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showPw ? "text" : "password"} placeholder="••••••••" className="pl-10 h-12  border-none focus-visible:ring-primary" autoComplete="current-password" {...field} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="remember" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-1">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium leading-none cursor-pointer">Keep me logged in</FormLabel>
              </div>
            </FormItem>
          )} />

          <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>}
          </Button>

          <Separator className="my-4" />

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account?
            <Link to="/request-access">
              <Button type="button" variant="ghost" className="text-primary font-bold p-1 h-auto ml-1">Request Access</Button>
            </Link>
          </p>
        </form>
      </Form>
    </AuthLayout>
  );
}
