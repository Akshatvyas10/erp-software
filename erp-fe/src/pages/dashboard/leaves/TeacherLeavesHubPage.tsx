import { useSearchParams } from "react-router-dom";
import { usePermissions, useAuth } from "@/store/hooks";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MyLeavesPage from "@/pages/dashboard/leaves/MyLeavesPage";
import LeaveApprovalsPage from "@/pages/dashboard/leaves/LeaveApprovalsPage";
import { LeaveRulesTab } from "@/components/leaves/LeaveRulesTab";
import {
    CalendarCheck,
    CheckCircle2,
    ShieldCheck,
    Lock,
} from "lucide-react";
import { motion } from "framer-motion";

export default function TeacherLeavesHubPage() {
    const { can } = usePermissions();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Permission checks
    const isTeacher = !!(user?.teacherProfile || user?.teacherId);
    const canViewMyLeaves = isTeacher || (can("teacher_leaves", "read") || can("teacher_leaves", "create"));
    const canActOnLeaves = can("teacher_leaves", "update") || can("teacher_leaves", "manage");
    const canViewRules = can("leave_rules", "read") || can("leave_rules", "manage");

    // Collect only the tabs the user is permitted to see
    const allowedTabs: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];
    if (canViewMyLeaves) {
        allowedTabs.push({ id: "my-leaves", label: "My Leaves & Apply", icon: CalendarCheck });
    }
    if (canActOnLeaves) {
        allowedTabs.push({ id: "approvals", label: "Leave Approvals Queue", icon: CheckCircle2 });
    }
    if (canViewRules) {
        allowedTabs.push({ id: "rules", label: "Leave Rules & Policy", icon: ShieldCheck });
    }

    const requestedTab = searchParams.get("tab");
    const isValidTab = allowedTabs.some((t) => t.id === requestedTab);
    
    // If the logged in user is purely an administrator without a teacher profile, default to approvals or rules tab
    const defaultTab = (!isTeacher && canActOnLeaves) 
        ? "approvals" 
        : (!isTeacher && canViewRules) 
            ? "rules" 
            : allowedTabs[0]?.id;

    const activeTab = isValidTab ? (requestedTab as string) : defaultTab;

    const handleTabChange = (val: string) => {
        setSearchParams({ tab: val });
    };

    if (allowedTabs.length === 0) {
        return (
            <div className="p-12 text-center rounded-2xl border border-border/60 bg-card space-y-3">
                <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto" />
                <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You do not have permission to view or manage teacher leaves. Please contact your administrator.
                </p>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6 text-foreground"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {/* Only show global Hub header if user has administrative tabs (Approvals or Rules) */}
            {allowedTabs.length > 1 && (
                <PageHeader
                    title="Teacher Leave Management"
                    description="Centralized portal for teacher leave applications, departmental approval workflows, and institutional policy rules."
                />
            )}

            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className="w-full space-y-6"
            >
                {allowedTabs.length > 1 && (
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <TabsList className="h-11 bg-muted/60 p-1 rounded-xl">
                            {allowedTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3.5 py-1.5 flex items-center gap-2"
                                    >
                                        <Icon className="h-3.5 w-3.5 text-primary" />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>
                )}

                {/* Tab 1 Content: My Leaves (Only rendered if permitted) */}
                {canViewMyLeaves && (
                    <TabsContent value="my-leaves" className="outline-none focus:outline-none">
                        <MyLeavesPage />
                    </TabsContent>
                )}

                {/* Tab 2 Content: Approvals Queue (Only rendered if permitted) */}
                {canActOnLeaves && (
                    <TabsContent value="approvals" className="outline-none focus:outline-none">
                        <LeaveApprovalsPage />
                    </TabsContent>
                )}

                {/* Tab 3 Content: Leave Rules Policy (Only rendered if permitted) */}
                {canViewRules && (
                    <TabsContent value="rules" className="outline-none focus:outline-none">
                        <LeaveRulesTab />
                    </TabsContent>
                )}
            </Tabs>
        </motion.div>
    );
}

