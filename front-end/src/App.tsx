import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import AppLayout from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import MyLearning from "./pages/MyLearning";
import Reports from "./pages/Reports";
import LmsSettings from "./pages/LmsSettings";
import CourseDetail from "./pages/CourseDetail";
import AdminPanel from "./pages/AdminPanel";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AssignTraining from "./pages/AssignTraining";
import TeamTraining from "./pages/TeamTraining";
import FAQ from "./pages/FAQ";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import TrainingHistory from "./pages/TrainingHistory";
import Leaderboard from "./pages/Leaderboard";
import RoleRoute from "./components/RoleRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/forgot" element={<ForgotPassword />} />
              <Route path="/auth/reset" element={<ResetPassword />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/learning/:programSlug" element={<Courses />} />
                <Route path="/courses/:courseId" element={<CourseDetail />} />
                <Route path="/my-learning" element={<MyLearning />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route
                  path="/reports"
                  element={
                    <RoleRoute allow={["sysadmin", "instructor", "manager"]}>
                      <Reports />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/employees"
                  element={
                    <RoleRoute allow={["sysadmin", "manager"]}>
                      <Navigate to="/admin" replace />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/assign-training"
                  element={
                    <RoleRoute allow={["sysadmin", "instructor", "manager"]}>
                      <AssignTraining />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/team"
                  element={
                    <RoleRoute allow={["sysadmin", "instructor", "manager"]}>
                      <TeamTraining />
                    </RoleRoute>
                  }
                />
                <Route path="/faq" element={<FAQ />} />
                <Route
                  path="/audit-logs"
                  element={
                    <RoleRoute allow={["sysadmin"]}>
                      <AuditLogs />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RoleRoute allow={["sysadmin", "instructor", "manager", "learner"]}>
                      <LmsSettings />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RoleRoute allow={["sysadmin", "instructor", "manager"]}>
                      <AdminPanel />
                    </RoleRoute>
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/training-history" element={<TrainingHistory />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
