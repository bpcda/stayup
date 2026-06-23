import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AdminGuard from "@/components/AdminGuard";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import GrillContest from "./pages/GrillContest";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminShuttle from "./pages/admin/AdminShuttle";
import AdminEventi from "./pages/admin/AdminEventi";
import AdminEventoIscritti from "./pages/admin/AdminEventoIscritti";
import AdminImpostazioni from "./pages/admin/AdminImpostazioni";
import AdminPrenotazioni from "./pages/admin/AdminPrenotazioni";
import AdminUtenti from "./pages/admin/AdminUtenti";
import AdminCheckin from "./pages/admin/AdminCheckin";
import AdminEmailLogs from "./pages/admin/AdminEmailLogs";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import ChiSiamo from "./pages/ChiSiamo";
import Contatti from "./pages/Contatti";
import Eventi from "./pages/Eventi";
import EventoDettaglio from "./pages/EventoDettaglio";
import Profilo from "./pages/Profilo";
import NotFound from "./pages/NotFound";
import UserGuard from "@/components/UserGuard";

const queryClient = new QueryClient();

const Admin = ({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) => (
  <AdminGuard requireRole={adminOnly ? "admin" : "organizer"}>
    <AdminLayout>{children}</AdminLayout>
  </AdminGuard>
);

const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/chi-siamo" element={<ChiSiamo />} />
      <Route path="/contatti" element={<Contatti />} />
      <Route path="/eventi" element={<Eventi />} />
      <Route path="/eventi/:slug" element={<EventoDettaglio />} />
      <Route path="/profilo" element={<UserGuard><Profilo /></UserGuard>} />
      <Route path="/grill-contest" element={<GrillContest />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<Admin><AdminOverview /></Admin>} />
      <Route path="/admin/eventi" element={<Admin><AdminEventi /></Admin>} />
      <Route path="/admin/eventi/:id/iscritti" element={<Admin><AdminEventoIscritti /></Admin>} />
      <Route path="/admin/eventi/:eventId/shuttle" element={<Admin adminOnly><AdminShuttle /></Admin>} />
      <Route path="/admin/prenotazioni" element={<Admin><AdminPrenotazioni /></Admin>} />
      <Route path="/admin/checkin" element={<Admin><AdminCheckin /></Admin>} />
      <Route path="/admin/utenti" element={<Admin adminOnly><AdminUtenti /></Admin>} />
      <Route path="/admin/email-logs" element={<Admin adminOnly><AdminEmailLogs /></Admin>} />
      <Route path="/admin/shuttle" element={<Admin adminOnly><AdminShuttle /></Admin>} />
      <Route path="/admin/impostazioni" element={<Admin adminOnly><AdminImpostazioni /></Admin>} />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
