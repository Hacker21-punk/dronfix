import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AuthPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-zinc-900 text-white overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 via-zinc-900/90 to-transparent" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <Wrench className="h-6 w-6" />
            </div>
            <span className="font-display font-bold text-2xl">DroneFix</span>
          </div>
          
          <h1 className="font-display font-bold text-5xl leading-tight mb-6">
            Advanced Field Operations <br/>
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-md">
            The complete operating system for modern drone service centers. 
            Manage inventory, track repairs, and streamline your workflow.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © 2024 DroneFix Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="pt-6">
              <Button className="w-full h-12 text-base shadow-lg shadow-primary/25" asChild>
                <a href="/api/login">
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
