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
            case 'PUBLISHED': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
            case 'DRAFT': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
            case 'ARCHIVED': return 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <BookOpen className="h-6 w-6 md:h-8 md:w-8" />
                        Homework Management
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1.5 max-w-2xl">
                        Assign, track, and grade student homework across all your classrooms.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <PermissionGate resource="homework" action="create">
                        <Button
                            variant="primary"
                            className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" /> Assign Homework
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Toolbar */}
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card dark:bg-zinc-900/40 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 max-w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assignments..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-11 border-none shadow-none focus-visible:ring-1
                                       focus-visible:ring-purple-500 bg-muted/60 dark:bg-zinc-950/60
                                       rounded-xl text-sm"
                        />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 w-full sm:w-40 border-none bg-muted/60 dark:bg-zinc-950/60 rounded-xl text-sm font-medium focus:ring-1 focus:ring-purple-500">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Statuses</SelectItem>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-5 h-40 animate-pulse bg-muted/50 rounded-2xl border-none" />
                    ))}
                </div>
            ) : filteredHomeworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                    border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                        <BookOpen className="h-7 w-7 text-purple-400/60" />
                    </div>
                    <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No homework found</p>
                    <p className="text-xs text-muted-foreground/60">No assignments match your current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHomeworks.map(hw => (
                        <Card 
                            key={hw.id} 
                            className="p-5 rounded-2xl border-border/60 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-zinc-900/60 flex flex-col justify-between"
                            onClick={() => navigate(`/dashboard/homework/${hw.id}`)}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant="outline" className={`font-semibold ${getStatusColor(hw.status)}`}>
                                        {hw.status}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md">
                                        {hw.subject?.name}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-1">{hw.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                    {hw.description}
                                </p>
                            </div>
                            
                            <div className="pt-4 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5 font-medium">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    <span>Due: {format(new Date(hw.dueDate), 'MMM dd, yyyy')}</span>
                                </div>
                                <span className="font-semibold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-md">
                                    {hw.classroom?.name} {hw.classroom?.section}
                                </span>
                            </div>
                        </Card>
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
