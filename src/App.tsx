import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AdminGuard from "@/components/AdminGuard";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import GrillContest from "./pages/GrillContest";
import AdminHome from "./pages/admin/AdminHome";
import AdminShuttle from "./pages/admin/AdminShuttle";
import AdminEventi from "./pages/admin/AdminEventi";
import AdminEventoIscritti from "./pages/admin/AdminEventoIscritti";
import Auth from "./pages/Auth";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import ChiSiamo from "./pages/ChiSiamo";
import Contatti from "./pages/Contatti";
import Eventi from "./pages/Eventi";
import Profilo from "./pages/Profilo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/chi-siamo" element={<ChiSiamo />} />
      <Route path="/contatti" element={<Contatti />} />
      <Route path="/eventi" element={<Eventi />} />
      <Route path="/profilo" element={<Profilo />} />
      <Route path="/grill-contest" element={<GrillContest />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/admin" element={<AdminGuard><AdminHome /></AdminGuard>} />
      <Route path="/admin/shuttle" element={<AdminGuard><AdminShuttle /></AdminGuard>} />
      <Route path="/admin/eventi" element={<AdminGuard><AdminEventi /></AdminGuard>} />
      <Route path="/admin/eventi/:id/iscritti" element={<AdminGuard><AdminEventoIscritti /></AdminGuard>} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/termini" element={<TermsConditions />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <Analytics />
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
