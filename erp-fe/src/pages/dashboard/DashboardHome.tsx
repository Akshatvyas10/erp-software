import { useQuery } from "@tanstack/react-query";
import {
    Users, GraduationCap, BookOpen, ShieldCheck,
    KeyRound, CheckCircle2, XCircle, Loader2, RefreshCw,
    TrendingUp, Calendar, Plus, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePermissions, useAuth } from "@/store/hooks";
import api from "@/lib/api";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

// ─── Stat card ────────────────────────────────────────────────────────────────
const RESOURCE_CHECKS = [
    { resource: "users", action: "read", label: "View Users", icon: Users },
    { resource: "users", action: "manage", label: "Manage Users", icon: Users },
    { resource: "students", action: "read", label: "View Students", icon: GraduationCap },
    { resource: "students", action: "create", label: "Create Students", icon: GraduationCap },
    { resource: "students", action: "manage", label: "Manage Students", icon: GraduationCap },
    { resource: "teachers", action: "read", label: "View Teachers", icon: BookOpen },
    { resource: "teachers", action: "manage", label: "Manage Teachers", icon: BookOpen },
    { resource: "roles", action: "read", label: "View Roles", icon: ShieldCheck },
    { resource: "roles", action: "manage", label: "Manage Roles", icon: ShieldCheck },
    { resource: "permissions", action: "read", label: "View Permissions", icon: KeyRound },
    { resource: "permissions", action: "manage", label: "Manage Permissions", icon: KeyRound },
];

const useBulkPermissionCheck = (enabled: boolean) => {
    return useQuery({
        queryKey: ["permissions", "check-many", RESOURCE_CHECKS],
        queryFn: async () => {
            const { data } = await api.post("/permissions/check-many", {
                checks: RESOURCE_CHECKS.map(({ resource, action }) => ({ resource, action })),
            });
            return data.data.results as { resource: string; action: string; allowed: boolean }[];
        },
        enabled,
        staleTime: 14 * 60 * 1000,
    });
};

const useServerPermissions = (enabled: boolean) => {
    return useQuery({
        queryKey: ["permissions", "my"],
        queryFn: async () => {
            const { data } = await api.get("/permissions/my");
            return data.data;
        },
        enabled,
        staleTime: 14 * 60 * 1000,
    });
};

// --- Mock Data for UI Redesign ---
const METRICS = [
    { label: "Total Students", value: "1,248", change: "+12%", icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Teachers", value: "84", change: "+2%", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Active Users", value: "342", change: "+5%", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Tasks", value: "12", change: "-2", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
];

const RECENT_ACTIVITY = [
    { title: "New student enrolled", time: "2 hours ago", icon: GraduationCap },
    { title: "Teacher schedule updated", time: "5 hours ago", icon: BookOpen },
    { title: "System roles modified", time: "1 day ago", icon: ShieldCheck },
    { title: "New permission policy applied", time: "2 days ago", icon: KeyRound },
];

export default function DashboardHome() {
    const { user } = useAuth();
    const { roles, permissions, can, isLoading: permLoading } = usePermissions();

    const bulkCheck = useBulkPermissionCheck(!!user);
    const serverPerms = useServerPermissions(!!user);

    const groupedByResource = RESOURCE_CHECKS.reduce<Record<string, typeof RESOURCE_CHECKS>>((acc, item) => {
        if (!acc[item.resource]) acc[item.resource] = [];
        acc[item.resource].push(item);
        return acc;
    }, {});

    const resultMap = (bulkCheck.data ?? []).reduce<Record<string, boolean>>(
        (acc, r) => {
            acc[`${r.resource}:${r.action}`] = r.allowed;
            return acc;
        },
        {}
    );

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div 
            className="space-y-8 max-w-7xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header & Quick Actions */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">
                        Welcome, {String(user?.firstName || "")} {String(user?.lastName || "")}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Here's your access overview and school metrics for today.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2 bg-white hover-lift">
                        <Calendar className="h-4 w-4" />
                        View Schedule
                    </Button>
                    <Button className="gap-2 hover-lift">
                        <Plus className="h-4 w-4" />
                        Quick Create
                    </Button>
                </div>
            </motion.div>

            {/* Role chips */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-2 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
                    Active Roles:
                </span>
                {roles.length === 0 && permLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No roles assigned</span>
                ) : (
                    roles.map((role) => (
                        <Badge
                            key={role}
                            className="capitalize bg-primary/10 text-primary border-primary/20 font-semibold px-3 py-1"
                            variant="secondary"
                        >
                            {role.replace(/_/g, " ")}
                        </Badge>
                    ))
                )}
            </motion.div>

            {/* Metrics Overview */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {METRICS.map((metric, idx) => (
                    <Card key={idx} className="hover-lift overflow-hidden border-border/60">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl ${metric.bg}`}>
                                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                                </div>
                                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {metric.change}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold tracking-tight text-foreground">{metric.value}</h3>
                                <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── Chart Placeholder (Takes up 2 columns) ──────── */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full border-border/60 shadow-sm flex flex-col">
                        <CardHeader>
                            <CardTitle>Attendance Overview</CardTitle>
                            <CardDescription>Student and Teacher attendance over the last 30 days.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px] flex items-center justify-center p-6">
                            {/* Placeholder for Recharts */}
                            <div className="w-full h-full rounded-xl border border-dashed border-border/80 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground gap-3">
                                <Activity className="h-8 w-8 text-muted-foreground/50" />
                                <p className="font-medium text-sm">Chart Data Loading...</p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Recent Activity ──────── */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="h-full border-border/60 shadow-sm flex flex-col">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest actions in the system.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-6">
                            {RECENT_ACTIVITY.map((activity, i) => (
                                <div key={i} className="flex items-start gap-4 group cursor-pointer">
                                    <div className="p-2 rounded-full bg-secondary/10 group-hover:bg-primary/10 transition-colors">
                                        <activity.icon className="h-4 w-4 text-secondary group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full mt-4 text-xs font-medium">View All Activity</Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ── Server permission map (from /api/permissions/my) ─────────────── */}
                <motion.div variants={itemVariants}>
                    <Card className="border-border shadow-sm h-full flex flex-col">
                        <CardHeader className="border-b border-border pb-4 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base font-bold">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    My Permissions
                                    <Badge variant="secondary" className="text-xs ml-1 bg-white border shadow-sm">
                                        {permissions.length}
                                    </Badge>
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => serverPerms.refetch()}
                                    disabled={serverPerms.isFetching}
                                >
                                    <RefreshCw className={`h-3 w-3 ${serverPerms.isFetching ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                            </div>
                            {serverPerms.data?.cachedAt && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Cached at: {new Date(serverPerms.data.cachedAt).toLocaleTimeString()}
                                </p>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6 flex-1">
                            {serverPerms.isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {Object.entries((serverPerms.data?.permissionMap as Record<string, string[]>) ?? {}).map(([resource, actions]) => (
                                        <div key={resource} className="group">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                                                    {resource}
                                                </span>
                                                <Separator className="flex-1" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(actions as string[]).map((action) => (
                                                    <Badge
                                                        key={action}
                                                        variant="outline"
                                                        className={`text-xs font-medium capitalize px-2.5 py-0.5 rounded-md ${action === "manage"
                                                                ? "border-primary/40 text-primary bg-primary/5 shadow-sm"
                                                                : "border-border text-foreground hover:bg-muted"
                                                            }`}
                                                    >
                                                        {action}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {!serverPerms.data?.permissionMap || (Object.keys(serverPerms.data.permissionMap).length === 0 && (
                                        <div className="text-center py-8 flex flex-col items-center">
                                            <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                                            <p className="text-sm text-muted-foreground">No permissions found</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Bulk permission check (from /api/permissions/check-many) ──────── */}
                <motion.div variants={itemVariants}>
                    <Card className="border-border shadow-sm h-full flex flex-col">
                        <CardHeader className="border-b border-border pb-4 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base font-bold">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    Access Matrix
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => bulkCheck.refetch()}
                                    disabled={bulkCheck.isFetching}
                                >
                                    <RefreshCw className={`h-3 w-3 ${bulkCheck.isFetching ? "animate-spin" : ""}`} />
                                    Re-check
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Live check via POST /api/permissions/check-many</p>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1">
                            {bulkCheck.isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {Object.entries(groupedByResource).map(([resource, checks]) => (
                                        <div key={resource}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                                    {resource}
                                                </span>
                                                <Separator className="flex-1" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {checks.map(({ resource: r, action, label, icon: Icon }) => {
                                                    const allowed = resultMap[`${r}:${action}`];
                                                    const localAllowed = can(r, action);
                                                    const finalAllowed = bulkCheck.data ? allowed : localAllowed;
                                                    return (
                                                        <div
                                                            key={`${r}:${action}`}
                                                            className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="p-1.5 rounded-md bg-muted">
                                                                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </div>
                                                                <span className="text-xs font-medium text-foreground">{label}</span>
                                                            </div>
                                                            {finalAllowed ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow-sm" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-destructive/60 drop-shadow-sm" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}
