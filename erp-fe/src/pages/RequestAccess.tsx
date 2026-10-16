import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";

// Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import AuthLayout from "@/layouts/AuthLayout";

// Icons
import { User, Mail, Loader2, ArrowLeft, Send } from "lucide-react";

const requestAccessSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

type RequestAccessValues = z.infer<typeof requestAccessSchema>;

import { useState } from "react";
import { toast } from "sonner";

export default function RequestAccess() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestAccessValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  const onSubmit = async (_values: RequestAccessValues) => {
    try {
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 1000));
      toast.success("Access request received. The administrator will contact you soon.");
      navigate("/login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
        </Link>
        <h2 className="text-2xl font-bold">Request Portal Access</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Submit your details to request access to the EduPulse ERP portal. Your department head will review your request.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Jane Doe"
                      className="pl-10 h-12 bg-secondary/50 border-none focus-visible:ring-primary"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Institutional Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. jane.doe@school.edu"
                      className="pl-10 h-12 bg-secondary/50 border-none focus-visible:ring-primary"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />



          <Button
            type="submit"
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg shadow-primary/20 mt-4"
            disabled={isSubmitting || form.formState.isSubmitting}
          >
            {isSubmitting || form.formState.isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Submit Request <Send className="h-4 w-4" />
              </span>
            )}
          </Button>

        </form>
      </Form>
    </AuthLayout>
  );
}
