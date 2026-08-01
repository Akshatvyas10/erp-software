import React from "react";
import { School } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-destructive-foreground flex items-center justify-center p-4">
      {/* Container with Royal Shadow */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-background rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(85,19,161,0.15)] border border-border">

        {/* LEFT: Branding Section (Royal Purple Gradient) */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-[#5513a1] to-[#3a0d6e] text-white">
          <div>
            <div className="h-12 w-12 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center mb-6">
              <School className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Manage your <br />
              <span className="text-purple-200">Campus</span> digitally.
            </h1>
          </div>

          <div className="space-y-4">
            <p className="text-purple-100/80 text-sm">
              Standardized Education Management System for modern institutions. Secure, fast, and royal.
            </p>
            <div className="flex gap-2">
              <div className="h-1 w-8 bg-white rounded-full"></div>
              <div className="h-1 w-2 bg-white/30 rounded-full"></div>
              <div className="h-1 w-2 bg-white/30 rounded-full"></div>
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
