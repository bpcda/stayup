import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AdminGuard from "@/components/AdminGuard";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import GrillContest from "./pages/GrillContest";
import AdminLayout from "@/components/admin/AdminLayout";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import WaitlistAccept from "./pages/WaitlistAccept";
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
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminShuttle = lazy(() => import("./pages/admin/AdminShuttle"));
const AdminEventi = lazy(() => import("./pages/admin/AdminEventi"));
const AdminEventoEditor = lazy(() => import("./pages/admin/AdminEventoEditor"));
const AdminEventoIscritti = lazy(() => import("./pages/admin/AdminEventoIscritti"));
const AdminImpostazioni = lazy(() => import("./pages/admin/AdminImpostazioni"));
const AdminPrenotazioni = lazy(() => import("./pages/admin/AdminPrenotazioni"));
const AdminUtenti = lazy(() => import("./pages/admin/AdminUtenti"));
const AdminCheckin = lazy(() => import("./pages/admin/AdminCheckin"));
const AdminCheckinScan = lazy(() => import("./pages/admin/AdminCheckinScan"));
const AdminEmailLogs = lazy(() => import("./pages/admin/AdminEmailLogs"));
const AdminSponsors = lazy(() => import("./pages/admin/AdminSponsors"));
const AdminEventoWaitlist = lazy(() => import("./pages/admin/AdminEventoWaitlist"));

const Admin = ({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) => (
  <AdminGuard requireRole={adminOnly ? "admin" : "organizer"}>
    <AdminLayout>{children}</AdminLayout>
  </AdminGuard>
);

const AppRoutes = () => (
  <AppLayout>
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chi-siamo" element={<ChiSiamo />} />
        <Route path="/contatti" element={<Contatti />} />
        <Route path="/eventi" element={<Eventi />} />
        <Route path="/eventi/:slug" element={<EventoDettaglio />} />
        <Route path="/profilo" element={<UserGuard><Profilo /></UserGuard>} />
        <Route path="/grill-contest" element={<GrillContest />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/waitlist/accept" element={<WaitlistAccept />} />
        <Route path="/admin" element={<Admin><AdminOverview /></Admin>} />
        <Route path="/admin/eventi" element={<Admin><AdminEventi /></Admin>} />
        <Route path="/admin/eventi/nuovo" element={<Admin><AdminEventoEditor /></Admin>} />
        <Route path="/admin/eventi/:id/modifica" element={<Admin><AdminEventoEditor /></Admin>} />
        <Route path="/admin/eventi/:id/iscritti" element={<Admin><AdminEventoIscritti /></Admin>} />
        <Route path="/admin/eventi/:id/waitlist" element={<Admin><AdminEventoWaitlist /></Admin>} />
        <Route path="/admin/eventi/:eventId/shuttle" element={<Admin adminOnly><AdminShuttle /></Admin>} />
        <Route path="/admin/prenotazioni" element={<Admin><AdminPrenotazioni /></Admin>} />
        <Route path="/admin/checkin" element={<Admin><AdminCheckin /></Admin>} />
        <Route path="/admin/checkin/scan" element={<Admin><AdminCheckinScan /></Admin>} />
        <Route path="/admin/utenti" element={<Admin adminOnly><AdminUtenti /></Admin>} />
        <Route path="/admin/email-logs" element={<Admin adminOnly><AdminEmailLogs /></Admin>} />
        <Route path="/admin/shuttle" element={<Admin adminOnly><AdminShuttle /></Admin>} />
        <Route path="/admin/sponsor" element={<Admin adminOnly><AdminSponsors /></Admin>} />
        <Route path="/admin/impostazioni" element={<Admin adminOnly><AdminImpostazioni /></Admin>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/termini" element={<TermsConditions />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </AppLayout>
);

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
