import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-users";
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Users, 
  Receipt,
  LogOut,
  Menu,
  ChevronRight,
  Truck
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import hanronLogo from "@assets/hanron_logo_1771243986590.png";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { data: profile } = useCurrentUser();
  const [location] = useLocation();
  const role = profile?.role;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLogistics = role === 'logistics';
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'engineer', 'account', 'logistics'] },
    { name: isLogistics ? 'Shipping & Logistics' : 'Service Requests', href: '/requests', icon: isLogistics ? Truck : Wrench, roles: ['admin', 'engineer', 'account', 'logistics'] },
    { name: 'Billing Data', href: '/billing', icon: Receipt, roles: ['admin', 'account'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
  ];

  if (!profile) {
    return <div className="p-6">Loading...</div>;
  }

  const filteredNav = role
    ? navigation.filter(item => item.roles.includes(role))
    : [];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <img src={hanronLogo} alt="Hanron" className="h-8 w-auto dark:brightness-0 dark:invert" data-testid="img-hanron-logo" />
        </div>
        <div className="mb-6">
          <h1 className="font-display font-bold text-xl tracking-tight text-foreground" data-testid="text-app-title">DroneFix</h1>
          <p className="text-xs text-muted-foreground font-medium">by Hanron</p>
        </div>

        <nav className="space-y-1">
          {filteredNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} className="block group">
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'}
                `}>
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {item.name}
                  {isActive && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-muted/50 rounded-xl p-4 border border-border/50 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Currency</span>
            <select 
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
              value={localStorage.getItem('app_currency') || 'INR'}
              onChange={(e) => {
                localStorage.setItem('app_currency', e.target.value);
                window.location.reload();
              }}
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
              <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.name || 'Loading...'}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border bg-card/30 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={hanronLogo} alt="Hanron" className="h-6 w-auto dark:brightness-0 dark:invert" />
          <div>
            <span className="font-display font-bold text-lg leading-none">DroneFix</span>
            <p className="text-[10px] text-muted-foreground leading-none">by Hanron</p>
          </div>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-0 pt-20 lg:pt-0 min-w-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10 animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
