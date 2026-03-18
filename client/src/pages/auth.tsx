import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle, MapPin, Mail, Phone, FileText } from "lucide-react";
import hanronLogo from "@assets/hanron_logo_1771243986590.png";

export default function AuthPage() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    login({ email, password });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      
      {/* Left Panel — Branding */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(174,58%,25%)] via-zinc-900 to-zinc-900" />
        
        <div className="relative z-10">
          <div className="mb-10">
            <img
              src={hanronLogo}
              alt="Hanron"
              className="h-10 w-auto mb-6 brightness-0 invert"
              data-testid="img-login-logo"
            />

            <h1
              className="font-display font-bold text-4xl leading-tight mb-2"
              data-testid="text-login-title"
            >
              DroneFix
            </h1>

            <p className="text-sm text-zinc-400 mb-8">by Hanron</p>
          </div>

          <h2 className="font-display font-bold text-5xl leading-tight mb-6">
            Advanced Field Operations <br />
            <span className="text-[hsl(174,58%,55%)]">Simplified.</span>
          </h2>

          <p className="text-lg text-zinc-400 max-w-md">
            The complete operating system for modern drone service centers.
            Manage inventory, track repairs, and streamline your workflow.
          </p>
        </div>

        {/* Company Details Footer */}
        <div className="relative z-10 space-y-4">
          <div className="border-t border-zinc-700 pt-4">
            <p className="text-xs font-semibold text-zinc-300 mb-2">
              M/s HANRON TECH INNOVATIONS PRIVATE LIMITED
            </p>
            <div className="flex items-start gap-2 text-xs text-zinc-500 mb-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-zinc-500" />
              <span>Shed No. 23-B, Sector-D, Govindpura Industrial Area, Near CIPET, JK Road, Bhopal, Madhya Pradesh - 462023, India.</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                23AAFCH4659A1ZX
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                business@hanron.in
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                0755-4331833
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">

          <div className="text-center lg:text-left space-y-4">
            <img
              src={hanronLogo}
              alt="Hanron"
              className="h-8 w-auto lg:hidden mx-auto"
            />

            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back
            </h2>

            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {loginError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@dronefix.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-login-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-login-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base shadow-lg shadow-primary/25"
                  disabled={isLoggingIn || !email || !password}
                  data-testid="button-login"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Default admin: admin@dronefix.com / Admin@123
          </p>

          {/* Mobile company info */}
          <div className="lg:hidden text-center text-[10px] text-muted-foreground space-y-0.5 pt-4 border-t">
            <p className="font-medium text-foreground/70">M/s Hanron Tech Innovations Pvt. Ltd.</p>
            <p>Bhopal, Madhya Pradesh - 462023</p>
            <p>business@hanron.in · 0755-4331833</p>
          </div>

        </div>
      </div>
    </div>
  );
}
