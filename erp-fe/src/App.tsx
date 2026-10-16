import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Auth
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RequestAccess from "./pages/RequestAccess";

// Guards
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";

// Layout
import DashboardLayout from "./layouts/DashboardLayout";

// Dashboard pages
import DashboardHome from "./pages/dashboard/DashboardHome";
import UsersPage from "./pages/dashboard/UsersPage";
import UserDetailPage from "./pages/dashboard/UserDetailPage";
import TeachersPage from "./pages/dashboard/TeachersPage";
import TeacherDetailPage from "./pages/dashboard/TeacherDetailPage";
import DepartmentsPage from "./pages/dashboard/DepartmentsPage";
import RolesPage from "./pages/dashboard/RolesPage";
import PermissionsPage from "./pages/dashboard/PermissionsPage";
import ClassroomList from "./pages/dashboard/ClassroomList";
import ClassroomDetails from "./pages/dashboard/ClassroomDetails";
import SubjectsPage from "./pages/dashboard/SubjectsPage";
import StudentDirectory from "./pages/dashboard/StudentDirectory";
import StudentDetailsPage from "./pages/dashboard/StudentDetailsPage";
import HomeworkPage from "./pages/dashboard/HomeworkPage";
import HomeworkDetailsPage from "./pages/dashboard/HomeworkDetailsPage";
import CalendarPage from "./pages/dashboard/CalendarPage";

// Admissions
import { PublicAdmissionFormPage } from "./features/admissions/pages/PublicAdmissionFormPage";
import { GenerateFormPage } from "./features/admissions/pages/GenerateFormPage";
import { ApplicationsListPage } from "./features/admissions/pages/ApplicationsListPage";

// School Config
import SchoolConfigPage from "./features/school-config/pages/SchoolConfigPage";

import "./App.css";

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
            {/* Home */}
            <Route path="/dashboard" element={<DashboardHome />} />

            {/* Users */}
            <Route path="/dashboard/users" element={<UsersPage />} />
            <Route path="/dashboard/users/:id" element={<UserDetailPage />} />

            {/* Teachers */}
            <Route path="/dashboard/teachers" element={<TeachersPage />} />
            <Route path="/dashboard/teachers/:id" element={<TeacherDetailPage />} />

            {/* Departments */}
            <Route path="/dashboard/departments" element={<DepartmentsPage />} />

            {/* Roles & Permissions */}
            <Route path="/dashboard/roles" element={<RolesPage />} />
            <Route path="/dashboard/permissions" element={<PermissionsPage />} />

            {/* Classrooms */}
            <Route path="/dashboard/classrooms" element={<ClassroomList />} />
            <Route path="/dashboard/classrooms/:id" element={<ClassroomDetails />} />
            <Route path="/dashboard/subjects" element={<SubjectsPage />} />

            {/* Students */}
            <Route path="/dashboard/students" element={<StudentDirectory />} />
            <Route path="/dashboard/students/:id" element={<StudentDetailsPage />} />

            {/* Homework */}
            <Route path="/dashboard/homework" element={<HomeworkPage />} />
            <Route path="/dashboard/homework/:id" element={<HomeworkDetailsPage />} />

            {/* Calendar */}
            <Route path="/dashboard/calendar" element={<CalendarPage />} />

            {/* Admissions */}
            <Route path="/dashboard/admissions" element={<ApplicationsListPage />} />
            <Route path="/dashboard/admissions/generate" element={<GenerateFormPage />} />
            
            {/* School Config */}
            <Route path="/dashboard/school-config" element={<SchoolConfigPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
