import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Fetch encrypted permissions from backend → decrypt → store in Redux
    const { isLoading, isError } = useMyPermissions();

    // Show a full-screen spinner while permissions are being fetched & decrypted
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">
                        Loading your workspace…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar 
                    mobileOpen={mobileOpen} 
                    onMobileClose={() => setMobileOpen(false)} 
                    isCollapsed={isCollapsed}
                />

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative transition-all duration-300">
                    <Topbar 
                        onMobileMenuClick={() => setMobileOpen(true)} 
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    />
                    
                    <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/40">
                        {isError && (
                            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center shadow-sm">
                                <span className="font-semibold mr-2">Error:</span> Failed to load permissions. Some features may be restricted.
                            </div>
                        )}
                        <div className="max-w-7xl mx-auto">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
