import React from "react";
import { School } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      {/* Container with Semantic Shadow */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-background rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 border border-border">

        {/* LEFT: Branding Section (Semantic Primary) */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
          <div>
            <div className="h-12 w-12 bg-primary-foreground/20 backdrop-blur-lg rounded-xl flex items-center justify-center mb-6">
              <School className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Manage your <br />
              <span className="text-primary-foreground/80">Campus</span> digitally.
            </h1>
          </div>

          <div className="space-y-4">
            <p className="text-primary-foreground/70 text-sm">
              Standardized Education Management System for modern institutions. Secure, fast, and enterprise-ready.
            </p>
            <div className="flex gap-2">
              <div className="h-1 w-8 bg-primary-foreground rounded-full"></div>
              <div className="h-1 w-2 bg-primary-foreground/30 rounded-full"></div>
              <div className="h-1 w-2 bg-primary-foreground/30 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Content Section */}
        <div className="p-8 flex flex-col justify-center relative">
          {children}
        </div>
      </div>
    </div>
  );
}
