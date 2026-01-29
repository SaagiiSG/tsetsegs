import { Toaster } from "@/components/ui/toaster";
import { Navigate } from "react-router-dom";
import TeacherStudentProfile from "./pages/TeacherStudentProfile";
import TeacherAllStudents from "./pages/TeacherAllStudents";
import TeacherClassAnalytics from "./pages/TeacherClassAnalytics";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { TeacherAuthProvider } from "./contexts/TeacherAuthContext";
import { StudentAuthProvider } from "./contexts/StudentAuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { TeacherProtectedRoute } from "./components/TeacherProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import StudentReveal from "./pages/StudentReveal";
import StudentPortal from "./pages/StudentPortal";
import StudentQuestion from "./pages/StudentQuestion";
import NotFound from "./pages/NotFound";

import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherChangePassword from "./pages/TeacherChangePassword";
import TeacherClassAttendance from "./pages/TeacherClassAttendance";
import TeacherStudentCards from "./pages/TeacherStudentCards";
import TeacherSettings from "./pages/TeacherSettings";

// Student Practice Portal Pages
import { StudentLayout } from "./components/student/StudentLayout";
import StudentDashboardHome from "./pages/student/StudentDashboardHome";
import StudentPractice from "./pages/student/StudentPractice";
import StudentSpeedMode from "./pages/student/StudentSpeedMode";
import StudentSpeedSession from "./pages/student/StudentSpeedSession";
import StudentReview from "./pages/student/StudentReview";
import StudentStats from "./pages/student/StudentStats";
import StudentLeaderboard from "./pages/student/StudentLeaderboard";
import StudentSettings from "./pages/student/StudentSettings";
import StudentShareProfile from "./pages/student/StudentShareProfile";
import StudentVocabulary from "./pages/student/StudentVocabulary";
import StudentEnglishPractice from "./pages/student/StudentEnglishPractice";
import StudentEnglishQuestion from "./pages/student/StudentEnglishQuestion";
import StudentBluebook from "./pages/student/StudentBluebook";
import StudentBluebookTest from "./pages/student/StudentBluebookTest";
import NewYearCard from "./pages/NewYearCard";

// Registration Pages
import ReviewRegistration from "./pages/ReviewRegistration";
import ReviewRegistrationAdmin from "./pages/ReviewRegistrationAdmin";

const queryClient = new QueryClient();

// Apply saved color theme on app load
const savedColorTheme = localStorage.getItem("color-theme") || "rose";
document.documentElement.classList.add(`theme-${savedColorTheme}`);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <TeacherAuthProvider>
              <StudentAuthProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route 
                    path="/admin/*" 
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    } 
                  />
                  
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
                    path="/teacher/settings" 
                    element={
                      <TeacherProtectedRoute>
                        <TeacherSettings />
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
                  <Route 
                    path="/teacher/students" 
                    element={
                      <TeacherProtectedRoute>
                        <TeacherAllStudents />
                      </TeacherProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/teacher/student/:studentId" 
                    element={
                      <TeacherProtectedRoute>
                        <TeacherStudentProfile />
                      </TeacherProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/teacher/analytics/:batchId" 
                    element={
                      <TeacherProtectedRoute>
                        <TeacherClassAnalytics />
                      </TeacherProtectedRoute>
                    } 
                  />
                  
                  {/* Student Practice Portal */}
                  <Route path="/practice" element={<StudentPortal />} />
                  <Route path="/practice" element={<StudentLayout />}>
                    <Route path="home" element={<StudentDashboardHome />} />
                    <Route path="dashboard" element={<StudentPractice />} />
                    <Route path="bluebook" element={<StudentBluebook />} />
                    <Route path="speed" element={<StudentSpeedMode />} />
                    <Route path="speed/session" element={<StudentSpeedSession />} />
                    <Route path="review" element={<StudentReview />} />
                    <Route path="stats" element={<StudentStats />} />
                    <Route path="leaderboard" element={<StudentLeaderboard />} />
                    <Route path="settings" element={<StudentSettings />} />
                    <Route path="vocabulary" element={<StudentVocabulary />} />
                    <Route path="question/:questionId" element={<StudentQuestion />} />
                    <Route path="english" element={<Navigate to="/practice/dashboard" replace />} />
                    <Route path="english/question/:questionId" element={<StudentEnglishQuestion />} />
                  </Route>
                  {/* Bluebook test-taking - outside StudentLayout for full screen */}
                  <Route path="/practice/bluebook/test/:attemptId" element={<StudentBluebookTest />} />
                  
                  <Route path="/student/:id" element={<StudentReveal />} />
                  <Route path="/student/share/:shareToken" element={<StudentShareProfile />} />
                  <Route path="/batch/:id" element={<StudentReveal />} />
                  <Route path="/teacher/newyear/:teachername" element={<NewYearCard />} />
                  
                  {/* Review Registration */}
                  <Route path="/register" element={<ReviewRegistration />} />
                  <Route 
                    path="/register/admin" 
                    element={
                      <ProtectedRoute requireTeacherOrAdmin>
                        <ReviewRegistrationAdmin />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </StudentAuthProvider>
            </TeacherAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
