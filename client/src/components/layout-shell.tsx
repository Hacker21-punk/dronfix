import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-users";
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Users, 
  FileText, 
  LogOut,
  Menu,
  X,
  Settings,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Separator } from "./ui/separator";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useCurrentUser();
  const [location] = useLocation();
  const role = profile?.role || "engineer"; 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'engineer', 'account'] },
    { name: 'Service Requests', href: '/requests', icon: Wrench, roles: ['admin', 'engineer', 'account'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'engineer'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(role));

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight text-foreground">DroneFix</h1>
            <p className="text-xs text-muted-foreground font-medium">Service Centre OS</p>
          </div>
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
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>{profile?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.name || 'Loading...'}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20" asChild>
            <a href="/api/logout">
              <LogOut className="h-3 w-3 mr-2" />
              Sign Out
            </a>
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
           <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-lg">DroneFix</span>
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
