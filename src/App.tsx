
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import IncomeExpense from "./pages/IncomeExpense";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import AdminView from "./pages/AdminView";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <AdminProvider>
            <Toaster />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/income-expense" element={<AppLayout><IncomeExpense /></AppLayout>} />
              <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
              <Route path="/admin-view" element={<AppLayout><AdminView /></AppLayout>} />
              <Route path="/account" element={<AppLayout><Account /></AppLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
