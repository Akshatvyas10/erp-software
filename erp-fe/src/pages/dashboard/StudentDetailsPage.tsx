import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Pencil, GraduationCap, Phone, Mail, MapPin,
    Fingerprint, Bus, BadgeDollarSign, Droplets, AlertTriangle,
    BookOpen, Users, CalendarDays, Hash, School, Loader2,
    ShieldCheck, HeartPulse,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import AdmissionFormDialog from "./AdmissionFormDialog";
import type { Student, StudentStatus, TransportMode, FeeQuota } from "@/types/erp";
import { SectionCard, DetailRow } from "@/components/shared/DetailCards";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5000";

const STATUS_STYLES: Record<StudentStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    SUSPENDED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    GRADUATED: "bg-accent text-accent-foreground border-border",
    TRANSFERRED: "bg-muted text-muted-foreground border-border",
};

const TRANSPORT_LABEL: Record<TransportMode, string> = {
    SCHOOL_BUS: "School Bus",
    PRIVATE_TRANSPORT: "Private Transport",
    WALKER: "Walker",
};

const FEE_LABEL: Record<FeeQuota, string> = {
    REGULAR: "Regular",
    STAFF_CHILD: "Staff Child",
    SCHOLARSHIP_HALF: "Scholarship (50%)",
    SCHOLARSHIP_FULL: "Full Scholarship",
};

const BLOOD_COLORS: Record<string, string> = {
    "A+": "bg-destructive/10 text-destructive border-destructive/20",
    "A−": "bg-destructive/10 text-destructive border-destructive/20",
    "B+": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    "B−": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    "AB+": "bg-primary/10 text-primary border-primary/20",
    "AB−": "bg-primary/10 text-primary border-primary/20",
    "O+": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "O−": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

// =============================================================================
// Main Page Component
// =============================================================================
export default function StudentDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();

    const [editOpen, setEditOpen] = useState(false);

    const { data: student, isLoading, error: fetchError } = useQuery<Student>({
        queryKey: ["student", id],
        queryFn: async () => {
            const { data } = await api.get(`/students/${id}`);
            return data.data.student as Student;
        },
        enabled: !!id && can("students", "read"),
        staleTime: 30_000,
    });

    if (!can("students", "read")) return <AccessDenied />;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (fetchError || !student) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold text-sm text-foreground">Student not found</p>
                <Button variant="outline" size="sm" className="rounded-xl hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const { account } = student;
    const fullName = `${account.firstName} ${account.lastName}`;
    const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase();
    const photoUrl = student.profilePhotoUrl
        ? `${API_BASE}${student.profilePhotoUrl}`
        : null;

    // First active classroom enrollment
    const enrollment = student.classroomEnrollments?.[0];
    const classroom = enrollment?.classroom;

    const handleEditSuccess = () => {
        qc.invalidateQueries({ queryKey: ["student", id] });
        qc.invalidateQueries({ queryKey: ["students"] });
    };

    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-6 text-foreground transition-colors duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >


            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* HEADER PANEL                                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Card className="border border-border/60 rounded-2xl overflow-hidden shadow-md bg-card">
                {/* Top gradient ribbon */}
                <div className="h-2 w-full bg-primary" />

                <CardContent className="p-6 relative backdrop-blur-sm bg-card/50">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* ── Profile photo ── */}
                        <div className="relative shrink-0">
                            <div className="h-28 w-28 rounded-full border-4 border-background shadow-sm overflow-hidden
                                            bg-primary/10 flex items-center justify-center">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={fullName}
                                        className="h-full w-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                ) : (
                                    <Avatar className="h-full w-full">
                                        <AvatarFallback className="bg-transparent text-primary text-3xl font-black">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-background
                                             ${student.status === "ACTIVE"
                                    ? "bg-emerald-500"
                                    : student.status === "SUSPENDED"
                                        ? "bg-amber-500"
                                        : "bg-muted-foreground"}`}
                            />
                        </div>

                        {/* ── Name / meta ── */}
                        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                                    {fullName}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${STATUS_STYLES[student.status]}`}
                                >
                                    {student.status}
                                </Badge>
                            </div>

                            {/* Admission number chip */}
                            {student.admissionNumber && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                    <Hash className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-mono font-bold text-primary">
                                        {student.admissionNumber}
                                    </span>
                                </div>
                            )}

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {account.email}
                                </span>
                                {student.gender && (
                                    <span className="text-xs text-muted-foreground font-semibold">
                                        {student.gender}
                                    </span>
                                )}
                                {student.dateOfBirth && (
                                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />
                                        {new Date(student.dateOfBirth).toLocaleDateString("en-IN", {
                                            day: "2-digit", month: "short", year: "numeric",
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Edit button ── */}
                        {can("students", "update") && (
                            <Button
                                onClick={() => setEditOpen(true)}
                                className="gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md
                                           w-full sm:w-auto shrink-0 sm:self-start hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* GRID LAYOUT                                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* ── 1. Academic Matrix ─────────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <SectionCard title="Academic Matrix" icon={BookOpen} accent="primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Hash} label="Roll Number" value={student.rollNumber} mono />
                            <DetailRow icon={School} label="Classroom"
                                value={classroom
                                    ? `${classroom.name} – ${classroom.section} (${classroom.academicYear})`
                                    : undefined}
                            />
                            <DetailRow icon={Users} label="Section" value={student.section} />
                            <DetailRow icon={GraduationCap} label="Grade" value={student.grade} />
                            <DetailRow icon={Hash} label="Student ID" value={student.studentId} mono />
                            {student.previousSchoolDetails && (
                                <DetailRow icon={BookOpen} label="Previous School" value={student.previousSchoolDetails} />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── 2. Logistical & Legal ──────────────────────────────────── */}
                <div className="lg:col-span-1">
                    <SectionCard title="Logistical & Legal" icon={Fingerprint} accent="emerald">
                        <DetailRow
                            icon={Fingerprint} label="Government ID"
                            value={student.governmentId} mono
                        />
                        <DetailRow
                            icon={Bus} label="Transportation"
                            value={student.transportationMode
                                ? TRANSPORT_LABEL[student.transportationMode]
                                : undefined}
                        />
                        <DetailRow
                            icon={BadgeDollarSign} label="Fee Quota"
                            value={FEE_LABEL[student.feeQuota]}
                        />
                        {student.transferCertificateUrl && (
                            <DetailRow
                                icon={ShieldCheck} label="Transfer Certificate"
                                value="View Document"
                                href={student.transferCertificateUrl}
                            />
                        )}
                    </SectionCard>
                </div>

                {/* ── 3. Guardian Details ────────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <SectionCard title="Guardian Details" icon={Users} accent="accent">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Users} label="Guardian Name" value={student.guardianName} />
                            <DetailRow icon={ShieldCheck} label="Relationship" value={student.guardianRelationship} />
                            {student.guardianPhone && (
                                <DetailRow
                                    icon={Phone} label="Phone"
                                    value={student.guardianPhone}
                                    href={`tel:${student.guardianPhone}`}
                                />
                            )}
                            {student.guardianEmail && (
                                <DetailRow
                                    icon={Mail} label="Email"
                                    value={student.guardianEmail}
                                    href={`mailto:${student.guardianEmail}`}
                                />
                            )}
                            {student.permanentAddress && (
                                <DetailRow icon={MapPin} label="Permanent Address" value={student.permanentAddress} />
                            )}
                            {student.currentAddress && student.currentAddress !== student.permanentAddress && (
                                <DetailRow icon={MapPin} label="Current Address" value={student.currentAddress} />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── 4. Emergency & Medical ─────────────────────────────────── */}
                <div className="lg:col-span-1">
                    <SectionCard title="Emergency & Medical" icon={HeartPulse} accent="destructive">
                        {/* Blood group — high-visibility badge */}
                        <div className="flex items-start gap-3 py-2.5 border-b border-border/60">
                            <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Droplets className="h-3.5 w-3.5 text-destructive" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Blood Group
                                </span>
                                {student.bloodGroup ? (
                                    <Badge
                                        variant="outline"
                                        className={`text-sm font-black w-fit px-3 py-0.5 rounded-lg ${BLOOD_COLORS[student.bloodGroup] ?? "bg-background text-foreground border-border"}`}
                                    >
                                        {student.bloodGroup}
                                    </Badge>
                                ) : (
                                    <span className="text-[13px] text-muted-foreground font-normal italic">
                                        Not recorded
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Medical notes — alert-styled if present */}
                        <div className="flex items-start gap-3 py-2.5">
                            <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Medical Notes
                                </span>
                                {student.medicalNotes ? (
                                    <div className="mt-0.5 px-3 py-2 rounded-xl bg-destructive/5
                                                    border border-destructive/20 text-[12px]
                                                    font-medium text-destructive leading-relaxed">
                                        {student.medicalNotes}
                                    </div>
                                ) : (
                                    <span className="text-[13px] text-muted-foreground font-normal italic">
                                        No medical notes on record
                                    </span>
                                )}
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* ── Edit dialog ─────────────────────────────────────────────── */}
            <AdmissionFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                editTarget={student}
                onSuccess={handleEditSuccess}
            />
        </motion.div>
    );
}
