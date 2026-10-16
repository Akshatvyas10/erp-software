import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, GraduationCap, BookOpen,
    ShieldCheck, KeyRound, X, School, Building2, LayoutGrid,
    LogOut, User, ChevronsUpDown, Calendar, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions, useAuth } from "@/store/hooks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
    resource?: string;
    action?: string;
    alwaysShow?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, alwaysShow: true },
    { label: "Users", to: "/dashboard/users", icon: Users, resource: "users", action: "read" },
    { label: "Students", to: "/dashboard/students", icon: GraduationCap, resource: "students", action: "read" },
    { label: "Teachers", to: "/dashboard/teachers", icon: BookOpen, resource: "teachers", action: "read" },
    { label: "Departments", to: "/dashboard/departments", icon: Building2, resource: "departments", action: "read" },
    { label: "Classrooms", to: "/dashboard/classrooms", icon: LayoutGrid, resource: "classrooms", action: "read" },
    { label: "Homework", to: "/dashboard/homework", icon: BookOpen, resource: "homework", action: "read" },
    { label: "Calendar", to: "/dashboard/calendar", icon: Calendar, resource: "events", action: "read" },
    { label: "Admissions", to: "/dashboard/admissions", icon: ClipboardList, resource: "users", action: "read" },
    { label: "Roles", to: "/dashboard/roles", icon: ShieldCheck, resource: "roles", action: "read" },
    { label: "Permissions", to: "/dashboard/permissions", icon: KeyRound, resource: "permissions", action: "read" },
];

interface SidebarProps {
    mobileOpen: boolean;
    onMobileClose: () => void;
    isCollapsed: boolean;
}

export default function Sidebar({ mobileOpen, onMobileClose, isCollapsed }: SidebarProps) {
    const { can } = usePermissions();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [showLogoutAlert, setShowLogoutAlert] = useState(false);

    const visibleItems = NAV_ITEMS.filter(
        (item) => item.alwaysShow || (item.resource && item.action && can(item.resource, item.action))
    );

    const userRec = user as Record<string, any>;
    const initials = userRec ? `${userRec.firstName?.[0] || ""}${userRec.lastName?.[0] || ""}`.toUpperCase() : "U";
    const roleName = userRec?.Roles?.[0]?.name?.replace(/_/g, " ") || "No Role";
    const fullName = `${String(userRec?.firstName || "")} ${String(userRec?.lastName || "")}`;

    const handleLogout = () => {
        logout();
    };

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onMobileClose}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-background/95 border-r border-border/60 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 shadow-xs",
                    isCollapsed ? "w-16" : "w-[260px]",
                    mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full",
                    "lg:flex"
                )}
            >
                {/* Brand Header */}
                <div className="flex items-center justify-between px-3 h-16 border-b border-border/60 shrink-0 bg-muted/30">
                    <div className={cn("flex items-center w-full gap-3 overflow-hidden whitespace-nowrap", isCollapsed && !mobileOpen ? "justify-center" : "px-1")}>
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <School className="h-5 w-5 text-primary" />
                        </div>
                        {(!isCollapsed || mobileOpen) && (
                            <div className="flex flex-col">
                                <p className="font-bold text-[15px] leading-tight text-foreground tracking-tight">ERP Portal</p>
                                <p className="text-[11px] text-primary font-bold uppercase tracking-wider">Acme School</p>
                            </div>
                        )}
                    </div>
                    {mobileOpen && (
                        <button
                            onClick={onMobileClose}
                            className="lg:hidden text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Nav Links Items */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
                    <nav className="px-2 space-y-1">
                        {visibleItems.map((item) => {
                            const Icon = item.icon;

                            const linkContent = (isActive: boolean) => (
                                <>
                                    <Icon className={cn(
                                        "h-5 w-5 shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                                    )} />
                                    {(!isCollapsed || mobileOpen) && (
                                        <span className="truncate">{item.label}</span>
                                    )}
                                </>
                            );

                            const LinkNode = (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === "/dashboard"}
                                    onClick={() => { if (mobileOpen) onMobileClose(); }}
                                    className={({ isActive }) =>
                                        cn(
                                            "group flex items-center gap-3 rounded-xl transition-all duration-150 font-semibold text-sm w-full",
                                            isCollapsed && !mobileOpen ? "justify-center h-10 w-10 mx-auto" : "px-3 py-2.5",
                                            isActive
                                                ? "bg-primary/10 text-primary shadow-xs"
                                                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                                        )
                                    }
                                >
                                    {({ isActive }) => linkContent(isActive)}
                                </NavLink>
                            );

                            if (isCollapsed && !mobileOpen) {
                                return (
                                    <Tooltip key={item.to} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div className="w-full flex justify-center">
                                                {LinkNode}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-bold bg-primary text-primary-foreground border-none shadow-xl">
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return LinkNode;
                        })}
                    </nav>
                </div>

                {/* Bottom Profile Section */}
                <div className="p-2 border-t border-border/60 shrink-0 bg-muted/20">
                    <DropdownMenu>
                        {(() => {
                            const TriggerButton = (
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "flex items-center rounded-xl transition-colors hover:bg-muted p-2 outline-none ring-primary focus-visible:ring-2",
                                        isCollapsed && !mobileOpen ? "w-10 h-10 justify-center mx-auto" : "w-full gap-3 px-2"
                                    )}>
                                        <Avatar className="h-9 w-9 border border-primary/20 shrink-0 shadow-xs">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                                        </Avatar>
                                        {(!isCollapsed || mobileOpen) && (
                                            <>
                                                <div className="flex flex-col items-start overflow-hidden text-left flex-1">
                                                    <span className="text-sm font-bold truncate w-full text-foreground">
                                                        {fullName}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate w-full">
                                                        {roleName}
                                                    </span>
                                                </div>
                                                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                            </>
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                            );

                            if (isCollapsed && !mobileOpen) {
                                return (
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div className="w-full flex justify-center">
                                                {TriggerButton}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-bold bg-primary text-primary-foreground border-none shadow-xl">
                                            <div className="flex flex-col text-xs">
                                                <span>{fullName}</span>
                                                <span className="opacity-80 font-normal">{roleName}</span>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return TriggerButton;
                        })()}

                        <DropdownMenuContent
                            side="right"
                            align="end"
                            sideOffset={16}
                            className="w-56 shadow-xl rounded-xl border-border bg-card"
                        >
                            <div className="flex items-center gap-2 p-2 mb-1">
                                <Avatar className="h-8 w-8 border border-border">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-foreground truncate">{fullName}</span>
                                    <span className="text-xs text-muted-foreground truncate">{String(userRec?.email || "")}</span>
                                </div>
                            </div>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 py-2 text-foreground focus:bg-primary/10 font-medium"
                                onClick={() => navigate("/dashboard/profile")}
                            >
                                <User className="h-4 w-4 text-primary" />
                                <span>View Profile</span>
                            </DropdownMenuItem>
                            {(roleName.toLowerCase() === "super admin" || roleName.toLowerCase() === "admin") && (
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 py-2 text-foreground focus:bg-primary/10 font-medium"
                                    onClick={() => navigate("/dashboard/school-config")}
                                >
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span>School Configuration</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 py-2 text-destructive focus:bg-destructive/10 font-medium"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setShowLogoutAlert(true);
                                }}
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Logout Alert Dialog */}
            <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
                <AlertDialogContent className="rounded-xl border border-border bg-card shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground font-bold">Ready to leave?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to logout? You will need to sign in again to access the dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-muted text-foreground hover:bg-muted/80 border-none h-10 px-4 rounded-lg font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4 rounded-lg shadow-md font-semibold"
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}