import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

// Auth (eagerly loaded for fast first paint)
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RequestAccess from "./pages/RequestAccess";

// Guards
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";

// Layout
import DashboardLayout from "./layouts/DashboardLayout";

// Admissions Public Form (eagerly loaded)
import { PublicAdmissionFormPage } from "./features/admissions/pages/PublicAdmissionFormPage";

// Lazy-Loaded Dashboard Pages (Dynamic Code-Splitting)
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/dashboard/UserDetailPage"));
const TeachersPage = lazy(() => import("./pages/dashboard/TeachersPage"));
const TeacherDetailPage = lazy(() => import("./pages/dashboard/TeacherDetailPage"));
const DepartmentsPage = lazy(() => import("./pages/dashboard/DepartmentsPage"));
const RolesPage = lazy(() => import("./pages/dashboard/RolesPage"));
const PermissionsPage = lazy(() => import("./pages/dashboard/PermissionsPage"));
const ClassroomList = lazy(() => import("./pages/dashboard/ClassroomList"));
const ClassroomDetails = lazy(() => import("./pages/dashboard/ClassroomDetails"));
const SubjectsPage = lazy(() => import("./pages/dashboard/SubjectsPage"));
const StudentDirectory = lazy(() => import("./pages/dashboard/StudentDirectory"));
const StudentDetailsPage = lazy(() => import("./pages/dashboard/StudentDetailsPage"));
const HomeworkPage = lazy(() => import("./pages/dashboard/HomeworkPage"));
const HomeworkDetailsPage = lazy(() => import("./pages/dashboard/HomeworkDetailsPage"));
const CalendarPage = lazy(() => import("./pages/dashboard/CalendarPage"));

// Admissions & Config Lazy Pages
const ApplicationsListPage = lazy(() =>
    import("./features/admissions/pages/ApplicationsListPage").then((m) => ({ default: m.ApplicationsListPage }))
);
const GenerateFormPage = lazy(() =>
    import("./features/admissions/pages/GenerateFormPage").then((m) => ({ default: m.GenerateFormPage }))
);
const SchoolConfigPage = lazy(() => import("./features/school-config/pages/SchoolConfigPage"));

import "./App.css";

function PageLoader() {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-xs font-medium text-muted-foreground animate-pulse">Loading view...</p>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" richColors closeButton duration={3000} />
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Public Admission Form (Standalone, no dashboard) */}
                <Route path="/public/admissions/:token" element={<PublicAdmissionFormPage />} />

                {/* Public — redirect to dashboard if already logged in */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/request-access" element={<RequestAccess />} />
                </Route>

                {/* Protected — requires valid JWT */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route
                            path="/dashboard"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <DashboardHome />
                                </Suspense>
                            }
                        />

                        {/* Users */}
                        <Route
                            path="/dashboard/users"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <UsersPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/users/:id"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <UserDetailPage />
                                </Suspense>
                            }
                        />

                        {/* Teachers */}
                        <Route
                            path="/dashboard/teachers"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <TeachersPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/teachers/:id"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <TeacherDetailPage />
                                </Suspense>
                            }
                        />

                        {/* Departments */}
                        <Route
                            path="/dashboard/departments"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <DepartmentsPage />
                                </Suspense>
                            }
                        />

                        {/* Roles & Permissions */}
                        <Route
                            path="/dashboard/roles"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <RolesPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/permissions"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <PermissionsPage />
                                </Suspense>
                            }
                        />

                        {/* Classrooms */}
                        <Route
                            path="/dashboard/classrooms"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <ClassroomList />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/classrooms/:id"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <ClassroomDetails />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/subjects"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <SubjectsPage />
                                </Suspense>
                            }
                        />

                        {/* Students */}
                        <Route
                            path="/dashboard/students"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <StudentDirectory />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/students/:id"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <StudentDetailsPage />
                                </Suspense>
                            }
                        />

                        {/* Homework */}
                        <Route
                            path="/dashboard/homework"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <HomeworkPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/homework/:id"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <HomeworkDetailsPage />
                                </Suspense>
                            }
                        />

                        {/* Calendar */}
                        <Route
                            path="/dashboard/calendar"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <CalendarPage />
                                </Suspense>
                            }
                        />

                        {/* Admissions */}
                        <Route
                            path="/dashboard/admissions"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <ApplicationsListPage />
                                </Suspense>
                            }
                        />
                        <Route
                            path="/dashboard/admissions/generate"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <GenerateFormPage />
                                </Suspense>
                            }
                        />

                        {/* School Config */}
                        <Route
                            path="/dashboard/school-config"
                            element={
                                <Suspense fallback={<PageLoader />}>
                                    <SchoolConfigPage />
                                </Suspense>
                            }
                        />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
