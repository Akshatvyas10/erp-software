import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Calendar,
    CalendarCheck,
    BookOpen,
    Award,
    LogOut,
    School,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/hooks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface PortalNavItem {
    label: string;
    to: string;
    icon: React.ElementType;
}

const PORTAL_NAV: PortalNavItem[] = [
    { label: "Overview", to: "/portal", icon: LayoutDashboard },
    { label: "Timetable", to: "/portal/timetable", icon: Calendar },
    { label: "Attendance", to: "/portal/attendance", icon: CalendarCheck },
    { label: "Leaves", to: "/portal/leaves", icon: CalendarCheck },
    { label: "Homework", to: "/portal/homework", icon: BookOpen },
    { label: "Report Cards", to: "/portal/report-cards", icon: Award },
];

export default function StudentPortalLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const userRec = user as Record<string, any>;
    const fullName = `${userRec?.firstName || ""} ${userRec?.lastName || ""}`.trim() || "Student";
    const initials = fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "ST";

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="flex min-h-screen bg-muted/20">
            {/* Desktop Navigation Rail */}
            <aside className="hidden md:flex w-64 flex-col border-r border-border/60 bg-card p-4">
                <div className="flex items-center gap-3 px-2 py-3 border-b border-border/60">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <School className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight text-foreground">Student Portal</h2>
                        <p className="text-[11px] text-muted-foreground font-medium">Acme Academy</p>
                    </div>
                </div>

                <nav className="mt-4 flex-1 space-y-1">
                    {PORTAL_NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/portal"}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                    )
                                }
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <Avatar className="h-8 w-8 rounded-lg border border-border">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                            <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                            <p className="text-[10px] text-muted-foreground">Student Account</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </aside>

            {/* Mobile Header & Bottom Navigation */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border/60 bg-card">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <School className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-foreground">Student Portal</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="h-8 w-8 text-muted-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </header>

                <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto pb-20 md:pb-8">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation Bar */}
                <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border/60 flex items-center justify-around py-2 z-40">
                    {PORTAL_NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/portal"}
                                className={({ isActive }) =>
                                    cn(
                                        "flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-lg transition-colors",
                                        isActive ? "text-primary font-bold" : "text-muted-foreground"
                                    )
                                }
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
