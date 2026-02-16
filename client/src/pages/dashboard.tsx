import { useDashboardStats } from "@/hooks/use-service-requests";
import { StatCard } from "@/components/stat-card";
import { Package, AlertTriangle, CheckCircle2, Clock, Wrench, Users, FileText, Timer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-users";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: profile } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const role = profile?.role || 'engineer';

  // Engineer-only view filters or content changes can go here
  const isAdmin = role === 'admin';
  const isEngineer = role === 'engineer';
  const isAccount = role === 'account';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-foreground">
          Welcome back, {profile?.name?.split(' ')[0]}
        </h2>
        <p className="text-muted-foreground mt-1">
          {isEngineer ? "Focus on your assigned service requests and inventory." : "Here's what's happening in the service centre today."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(!isAccount) && (
          <StatCard 
            title="Total Stock Value" 
            value={formatCurrency(Number(stats?.totalStockValue || 0))} 
            icon={Package}
            className="bg-gradient-to-br from-background to-blue-50/50 dark:to-blue-900/10"
          />
        )}
        <StatCard 
          title="Pending Requests" 
          value={stats?.pendingRequests || 0} 
          icon={Clock}
          className="bg-gradient-to-br from-background to-orange-50/50 dark:to-orange-900/10"
        />
        <StatCard 
          title="Completed Jobs" 
          value={stats?.completedRequests || 0} 
          icon={CheckCircle2}
          className="bg-gradient-to-br from-background to-green-50/50 dark:to-green-900/10"
        />
        {isAdmin && (
          <StatCard 
            title="Low Stock Items" 
            value={stats?.lowStockItems?.length || 0} 
            icon={AlertTriangle}
            className="bg-gradient-to-br from-background to-red-50/50 dark:to-red-900/10"
          />
        )}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Average Aging of Open Cases (Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg" data-testid="stat-aging-l1">
              <Timer className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-aging-l1-value">{stats?.avgAgingL1 ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">L1 Service</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg" data-testid="stat-aging-l2">
              <Timer className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-aging-l2-value">{stats?.avgAgingL2 ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">L2 Service</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-muted/30 rounded-lg" data-testid="stat-aging-l3">
              <Timer className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-aging-l3-value">{stats?.avgAgingL3 ?? 0}</p>
              <p className="text-sm text-muted-foreground mt-1">L3 Service</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isAdmin && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
                <div className="space-y-4">
                  {stats.lowStockItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 dark:text-red-400">{item.quantity} left</p>
                        <p className="text-xs text-muted-foreground">Critical Level: {item.criticalLevel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-20" />
                  <p>Inventory levels are healthy</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {isAdmin && (
              <>
                <a href="/requests" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/60 rounded-xl border border-dashed border-border transition-colors">
                  <Clock className="h-8 w-8 mb-2 text-primary" />
                  <span className="font-medium">New Request</span>
                </a>
                <a href="/users" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/60 rounded-xl border border-dashed border-border transition-colors">
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <span className="font-medium">Team</span>
                </a>
              </>
            )}
            {(isAdmin || isEngineer) && (
              <a href="/inventory" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/60 rounded-xl border border-dashed border-border transition-colors">
                <Package className="h-8 w-8 mb-2 text-primary" />
                <span className="font-medium">Inventory</span>
              </a>
            )}
             {isEngineer && (
              <a href="/requests" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/60 rounded-xl border border-dashed border-border transition-colors">
                <Wrench className="h-8 w-8 mb-2 text-primary" />
                <span className="font-medium">My Jobs</span>
              </a>
            )}
            {isAccount && (
              <a href="/requests" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/60 rounded-xl border border-dashed border-border transition-colors">
                <FileText className="h-8 w-8 mb-2 text-primary" />
                <span className="font-medium">Billing</span>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
