import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import hanronLogo from "@assets/hanron_logo_1771243986590.png";

export default function AuthPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-zinc-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(174,58%,25%)] via-zinc-900 to-zinc-900" />
        
        <div className="relative z-10">
          <div className="mb-10">
            <img src={hanronLogo} alt="Hanron" className="h-10 w-auto mb-6 brightness-0 invert" data-testid="img-login-logo" />
            <h1 className="font-display font-bold text-4xl leading-tight mb-2" data-testid="text-login-title">
              DroneFix
            </h1>
            <p className="text-sm text-zinc-400 mb-8">by Hanron</p>
          </div>
          
          <h2 className="font-display font-bold text-5xl leading-tight mb-6">
            Advanced Field Operations <br/>
            <span className="text-[hsl(174,58%,55%)]">Simplified.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-md">
            The complete operating system for modern drone service centers. 
            Manage inventory, track repairs, and streamline your workflow.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          Powered by Hanron
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-4">
            <img src={hanronLogo} alt="Hanron" className="h-8 w-auto lg:hidden mx-auto" />
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <Button className="w-full h-12 text-base shadow-lg shadow-primary/25" asChild>
                <a href="/api/login" data-testid="button-sign-in">
                  Sign in with Replit
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
