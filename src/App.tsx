import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TeacherAuthProvider } from "@/contexts/TeacherAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TeacherProtectedRoute } from "@/components/TeacherProtectedRoute";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherChangePassword from "./pages/TeacherChangePassword";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherClassAttendance from "./pages/TeacherClassAttendance";
import TeacherStudentCards from "./pages/TeacherStudentCards";
import StudentReveal from "./pages/StudentReveal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TeacherAuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher/change-password" element={<TeacherChangePassword />} />
              <Route 
                path="/teacher/dashboard" 
                element={
                  <TeacherProtectedRoute>
                    <TeacherDashboard />
                  </TeacherProtectedRoute>
                } 
              />
              <Route 
                path="/teacher/class/:batchId" 
                element={
                  <TeacherProtectedRoute>
                    <TeacherClassAttendance />
                  </TeacherProtectedRoute>
                } 
              />
              <Route 
                path="/teacher/students/:batchId" 
                element={
                  <TeacherProtectedRoute>
                    <TeacherStudentCards />
                  </TeacherProtectedRoute>
                } 
              />
              <Route path="/student/:id" element={<StudentReveal />} />
              <Route path="/batch/:id" element={<StudentReveal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TeacherAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
