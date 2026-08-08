import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Homework } from "@/types/erp";
import { useAuth, usePermissions } from "@/store/hooks";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { BookOpen, Plus, Search, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import PermissionGate from "@/components/auth/PermissionGate";
import HomeworkFormDialog from "@/components/homework/HomeworkFormDialog";

export default function HomeworkPage() {
    const { user } = useAuth();
    const { can } = usePermissions();
    const navigate = useNavigate();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // In a real app we might fetch subjects/classrooms to populate filters
    const [subjectFilter, setSubjectFilter] = useState("");

    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const { data: homeworks = [], isLoading } = useQuery<Homework[]>({
        queryKey: ["homeworks", statusFilter, subjectFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter) params.append("status", statusFilter);
            if (subjectFilter) params.append("subjectId", subjectFilter);
            const res = await api.get(`/homeworks?${params.toString()}`);
            return res.data;
        },
        enabled: can("homework", "read")
    });

    const filteredHomeworks = homeworks.filter(h =>
        h.title.toLowerCase().includes(search.toLowerCase()) ||
        h.subject?.name.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
            case 'DRAFT': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
            case 'ARCHIVED': return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20';
            default: return 'bg-muted text-muted-foreground border-border/50';
        }
    };

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-6 max-w-[1400px]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            {/* Premium Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-6 sm:p-10 text-primary-foreground shadow-xl">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-black/10 rounded-full blur-2xl" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide uppercase mb-2">
                            <BookOpen className="h-3.5 w-3.5" /> Academics
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                            Homework Management
                        </h1>
                        <p className="text-primary-foreground/80 text-sm md:text-base max-w-xl font-medium">
                            Assign, track, and grade student homework across all your classrooms in one unified dashboard.
                        </p>
                    </div>

                    <div className="flex items-center w-full md:w-auto">
                        <PermissionGate resource="homework" action="create">
                            <Button
                                variant="secondary"
                                className="w-full md:w-auto gap-2 h-12 px-6 rounded-xl font-bold bg-background text-foreground hover:bg-background/90 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                <Plus className="h-5 w-5 stroke-[2.5]" /> Assign New Homework
                            </Button>
                        </PermissionGate>
                    </div>
                </div>
            </div>

            {/* Floating Toolbar */}
            <div className="sticky top-4 z-20">
                <Card className="p-2 sm:p-3 border-border/40 shadow-lg shadow-black/5 bg-background/80 backdrop-blur-xl rounded-2xl">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title or subject..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 border-none shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none bg-muted/40 hover:bg-muted/60 transition-colors rounded-xl text-sm font-medium"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-12 w-full sm:w-48 border-none bg-muted/40 hover:bg-muted/60 transition-colors rounded-xl text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="all_statuses">All Statuses</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>
            </div>

            {/* Grid Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <Card key={i} className="p-6 h-[220px] animate-pulse bg-muted/40 rounded-3xl border-border/30" />
                    ))}
                </div>
            ) : filteredHomeworks.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-24 text-center px-4"
                >
                    <div className="h-24 w-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-sm">
                        <BookOpen className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No homework found</h3>
                    <p className="text-muted-foreground max-w-sm mb-8">
                        It looks like there are no assignments matching your current criteria. Try adjusting your filters or create a new one.
                    </p>
                    <PermissionGate resource="homework" action="create">
                        <Button
                            variant="outline"
                            className="rounded-xl h-11 px-6 font-semibold border-border text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Assign Homework
                        </Button>
                    </PermissionGate>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
                    {filteredHomeworks.map((hw, idx) => (
                        <motion.div
                            key={hw.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card
                                className="group h-full p-5 rounded-3xl border-border/60 hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-pointer bg-card hover:-translate-y-1 flex flex-col justify-between overflow-hidden relative"
                                onClick={() => navigate(`/dashboard/homework/${hw.id}`)}
                            >
                                {/* Subtle background accent on hover */}
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="outline" className={`font-bold tracking-wide text-[10px] px-2.5 py-0.5 rounded-full ${getStatusColor(hw.status)}`}>
                                            {hw.status}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                            {hw.subject?.name}
                                        </div>
                                    </div>
                                    <h3 className="font-extrabold text-lg text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                                        {hw.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-6 leading-relaxed">
                                        {hw.description}
                                    </p>
                                </div>

                                <div className="relative z-10 pt-4 border-t border-border/50 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                            <CalendarIcon className="h-3.5 w-3.5 text-primary/70" />
                                            Due {format(new Date(hw.dueDate), 'MMM dd')}
                                        </span>
                                        <span className="font-bold text-foreground bg-muted px-2.5 py-1 rounded-md border border-border/50">
                                            {hw.classroom?.name} <span className="opacity-60">{hw.classroom?.section}</span>
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <HomeworkFormDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                homeworkId={null}
            />
        </motion.div>
    );
}
