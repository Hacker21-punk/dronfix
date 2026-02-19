import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { LayoutShell } from "@/components/layout-shell";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import InventoryPage from "@/pages/inventory";
import ServiceRequestsPage from "@/pages/service-requests/index";
import ServiceRequestDetail from "@/pages/service-requests/detail";
import UsersPage from "@/pages/users";
import BillingPage from "@/pages/billing";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  return (
    <LayoutShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/requests" component={ServiceRequestsPage} />
        <Route path="/requests/:id" component={ServiceRequestDetail} />
        <Route path="/users" component={UsersPage} />
        <Route path="/billing" component={BillingPage} />
        <Route component={NotFound} />
      </Switch>
    </LayoutShell>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <ProtectedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
