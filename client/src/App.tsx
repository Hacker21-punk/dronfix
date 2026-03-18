import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { Suspense } from "react";

// Lazy-load all pages to prevent module-level errors from crashing the entire app
const AuthPage = React.lazy(() => import("./pages/auth"));
const DashboardPage = React.lazy(() => import("./pages/dashboard"));
const InventoryPage = React.lazy(() => import("./pages/inventory"));
const ServiceRequestsPage = React.lazy(() => import("./pages/service-requests"));
const ServiceRequestDetailPage = React.lazy(() => import("./pages/service-requests/detail"));
const UsersPage = React.lazy(() => import("./pages/users"));
const BillingPage = React.lazy(() => import("./pages/billing"));

// Dynamic import for layout shell
const LayoutShell = React.lazy(() => import("@/components/layout-shell").then(m => ({ default: m.LayoutShell })));

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#888" }}>
      Loading...
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message || "Unknown error" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "monospace", color: "#ef4444", background: "#1a1a1a", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 24, marginBottom: 16, color: "#fff" }}>Application Error</h1>
          <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{this.state.error}</pre>
          <button 
            onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
            style={{ marginTop: 20, padding: "10px 20px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ 
  component: Component, 
  allowedRoles,
  ...rest 
}: { 
  component: React.ComponentType<any>; 
  allowedRoles?: string[];
  path: string;
}) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    return <Redirect to="/auth" />;
  }

  // Check role-based access
  if (allowedRoles) {
    const profileStr = localStorage.getItem("profile");
    const profile = profileStr ? JSON.parse(profileStr) : null;
    const role = profile?.role;
    
    if (role && !allowedRoles.includes(role) && role !== "admin") {
      return <Redirect to="/" />;
    }
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LayoutShell>
        <Component {...rest} />
      </LayoutShell>
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth">
        <Suspense fallback={<LoadingSpinner />}>
          <AuthPage />
        </Suspense>
      </Route>
      
      <Route path="/">
        <ProtectedRoute component={DashboardPage} path="/" />
      </Route>

      <Route path="/requests">
        <ProtectedRoute component={ServiceRequestsPage} path="/requests" />
      </Route>

      <Route path="/requests/:id">
        <ProtectedRoute 
          component={ServiceRequestDetailPage} 
          path="/requests/:id" 
        />
      </Route>

      <Route path="/inventory">
        <ProtectedRoute 
          component={InventoryPage} 
          path="/inventory" 
          allowedRoles={["admin"]} 
        />
      </Route>

      <Route path="/users">
        <ProtectedRoute 
          component={UsersPage} 
          path="/users" 
          allowedRoles={["admin"]} 
        />
      </Route>

      <Route path="/billing">
        <ProtectedRoute 
          component={BillingPage} 
          path="/billing" 
          allowedRoles={["admin", "account"]} 
        />
      </Route>

      {/* Fallback: redirect to dashboard */}
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
