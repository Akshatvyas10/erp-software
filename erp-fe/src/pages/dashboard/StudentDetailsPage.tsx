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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import AdmissionFormDialog from "./AdmissionFormDialog";
import type { Student, StudentStatus, TransportMode, FeeQuota } from "@/types/erp";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5000";

const STATUS_STYLES: Record<StudentStatus, string> = {
    ACTIVE: "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    SUSPENDED: "bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    GRADUATED: "bg-sky-50 dark:bg-sky-900/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
    TRANSFERRED: "bg-zinc-50 dark:bg-zinc-900/20 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
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
    "A+": "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    "A−": "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    "B+": "bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    "B−": "bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    "AB+": "bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    "AB−": "bg-violet-50 dark:bg-violet-900/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    "O+": "bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    "O−": "bg-teal-50 dark:bg-teal-900/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
};

// ─── Detail row sub-component ─────────────────────────────────────────────────
function DetailRow({
    icon: Icon, label, value, href, mono = false,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    href?: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-purple-100/60 dark:border-zinc-800/60 last:border-0">
            <div className="h-7 w-7 rounded-lg bg-purple-600/8 dark:bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900/40 dark:text-zinc-600">
                    {label}
                </span>
                {href ? (
                    <a href={href}
                        className="text-[13px] font-semibold text-purple-700 dark:text-purple-400 hover:underline underline-offset-2 truncate">
                        {value}
                    </a>
                ) : (
                    <span className={`text-[13px] font-semibold text-purple-950 dark:text-zinc-200 break-words ${mono ? "font-mono" : ""}`}>
                        {value ?? <span className="text-purple-900/30 dark:text-zinc-600 font-normal italic">Not provided</span>}
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
    title, icon: Icon, accent = "purple", children,
}: {
    title: string;
    icon: React.ElementType;
    accent?: "purple" | "sky" | "emerald" | "rose";
    children: React.ReactNode;
}) {
    const accents = {
        purple: "text-purple-700 dark:text-purple-400 bg-purple-600/8 dark:bg-purple-500/10",
        sky: "text-sky-700 dark:text-sky-400 bg-sky-500/8 dark:bg-sky-500/10",
        emerald: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/8 dark:bg-emerald-500/10",
        rose: "text-rose-700 dark:text-rose-400 bg-rose-500/8 dark:bg-rose-500/10",
    };
    return (
        <Card className="border border-purple-100 dark:border-zinc-800
                         shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)]
                         rounded-2xl bg-white dark:bg-zinc-900/60">
            <CardHeader className="pb-1 pt-5 px-5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-extrabold uppercase tracking-wide text-purple-950 dark:text-zinc-100">
                    <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${accents[accent]}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
                {children}
            </CardContent>
        </Card>
    );
}

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
                <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
        );
    }

    if (fetchError || !student) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <GraduationCap className="h-10 w-10 text-purple-400/40" />
                <p className="font-semibold text-sm">Student not found</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate(-1)}>
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
            className="mx-auto space-y-6 text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* ── Back nav ───────────────────────────────────────────────────── */}
            <button
                onClick={() => navigate("/dashboard/students")}
                className="flex items-center gap-2 text-sm font-semibold text-purple-900/60 dark:text-zinc-400
                           hover:text-purple-800 dark:hover:text-purple-300 transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Student Directory
            </button>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* HEADER PANEL                                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Card className="border border-purple-100 dark:border-zinc-800 rounded-2xl overflow-hidden
                             shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)]
                             bg-white dark:bg-zinc-900/60">
                {/* Top gradient ribbon */}
                <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-400" />

                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* ── Profile photo ── */}
                        <div className="relative shrink-0">
                            <div className="h-28 w-28 rounded-full border-4 border-white dark:border-zinc-800
                                            shadow-[0_0_0_3px_rgba(124,58,237,0.25)] overflow-hidden
                                            bg-purple-600/10 dark:bg-purple-500/20 flex items-center justify-center">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={fullName}
                                        className="h-full w-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                ) : (
                                    <span className="text-3xl font-black text-purple-700 dark:text-purple-300 select-none">
                                        {initials}
                                    </span>
                                )}
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2
                                             border-white dark:border-zinc-800
                                             ${student.status === "ACTIVE"
                                    ? "bg-emerald-500"
                                    : student.status === "SUSPENDED"
                                        ? "bg-amber-500"
                                        : "bg-zinc-400"}`}
                            />
                        </div>

                        {/* ── Name / meta ── */}
                        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-extrabold tracking-tight text-purple-950 dark:text-zinc-50">
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
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full
                                                bg-purple-600/8 dark:bg-purple-500/10
                                                border border-purple-200/60 dark:border-purple-500/20">
                                    <Hash className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                                    <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-300">
                                        {student.admissionNumber}
                                    </span>
                                </div>
                            )}

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-purple-900/50 dark:text-zinc-500 font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {account.email}
                                </span>
                                {student.gender && (
                                    <span className="text-xs text-purple-900/50 dark:text-zinc-500 font-semibold">
                                        {student.gender}
                                    </span>
                                )}
                                {student.dateOfBirth && (
                                    <span className="text-xs text-purple-900/50 dark:text-zinc-500 font-semibold flex items-center gap-1">
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
                                className="gap-2 h-10 px-5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                           dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md
                                           shrink-0 sm:self-start hover:scale-[1.02] active:scale-[0.98] transition-transform"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4-COLUMN DASHBOARD GRID                                         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── 1. Academic Matrix ─────────────────────────────────────── */}
                <SectionCard title="Academic Matrix" icon={BookOpen} accent="purple">
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
                </SectionCard>

                {/* ── 2. Guardian Details ────────────────────────────────────── */}
                <SectionCard title="Guardian Details" icon={Users} accent="sky">
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
                </SectionCard>

                {/* ── 3. Logistical & Legal ──────────────────────────────────── */}
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

                {/* ── 4. Emergency & Medical ─────────────────────────────────── */}
                <SectionCard title="Emergency & Medical" icon={HeartPulse} accent="rose">
                    {/* Blood group — high-visibility badge */}
                    <div className="flex items-start gap-3 py-2.5 border-b border-purple-100/60 dark:border-zinc-800/60">
                        <div className="h-7 w-7 rounded-lg bg-rose-500/8 dark:bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Droplets className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900/40 dark:text-zinc-600">
                                Blood Group
                            </span>
                            {student.bloodGroup ? (
                                <Badge
                                    variant="outline"
                                    className={`text-sm font-black w-fit px-3 py-0.5 rounded-lg ${BLOOD_COLORS[student.bloodGroup] ?? "bg-zinc-50 text-zinc-700 border-zinc-200"}`}
                                >
                                    {student.bloodGroup}
                                </Badge>
                            ) : (
                                <span className="text-[13px] text-purple-900/30 dark:text-zinc-600 font-normal italic">
                                    Not recorded
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Medical notes — alert-styled if present */}
                    <div className="flex items-start gap-3 py-2.5">
                        <div className="h-7 w-7 rounded-lg bg-rose-500/8 dark:bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900/40 dark:text-zinc-600">
                                Medical Notes
                            </span>
                            {student.medicalNotes ? (
                                <div className="mt-0.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/10
                                                border border-rose-200 dark:border-rose-800/40 text-[12px]
                                                font-medium text-rose-800 dark:text-rose-300 leading-relaxed">
                                    {student.medicalNotes}
                                </div>
                            ) : (
                                <span className="text-[13px] text-purple-900/30 dark:text-zinc-600 font-normal italic">
                                    No medical notes on record
                                </span>
                            )}
                        </div>
                    </div>
                </SectionCard>
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
