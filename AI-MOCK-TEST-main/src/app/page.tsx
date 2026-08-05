import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrainCircuit, ShieldCheck, TrendingUp, Zap, ArrowRight } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-white/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">BankMaster</span>
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium text-foreground hover:text-primary transition-colors" href="#features">Features</Link>
          <Link className="text-sm font-medium text-foreground hover:text-primary transition-colors" href="/auth/login">Login</Link>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background via-blue-50 to-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight text-foreground">
                  Master Bank Exams with AI-Powered Preparation
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-lg font-normal">
                  Get personalized mock exams focused on your weakest topics. Smart AI generates adaptive practice tests to help you improve faster and score higher.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button asChild size="lg" className="h-12 px-8 bg-accent hover:bg-accent/90 text-white text-base font-medium">
                  <Link href="/auth/signup">Start Your Free Test <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 border-primary text-primary hover:bg-primary/5 text-base font-medium">
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-blue-50/50">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Why Choose BankMaster?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to ace your bank exams</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-lg border border-border bg-white hover:shadow-md transition-all group">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Dynamic Generation</h3>
                <p className="text-sm text-muted-foreground">
                  AI generates fresh, unique bank exam questions every time. No more repeating old papers.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-lg border border-border bg-white hover:shadow-md transition-all group">
                <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Adaptive Difficulty</h3>
                <p className="text-sm text-muted-foreground">
                  Tests grow harder as you improve, ensuring you stay in the optimal learning zone.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-lg border border-border bg-white hover:shadow-md transition-all group">
                <div className="p-3 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Weak Topic Focus</h3>
                <p className="text-sm text-muted-foreground">
                  Our algorithm identifies your weakest areas and prioritizes them in your next mock exam.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-lg border border-border bg-white hover:shadow-md transition-all group">
                <div className="p-3 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                  <BrainCircuit className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground">AI Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed, constructive feedback on why you missed a mark and how to solve it next time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 bg-white border-t border-border">
        <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <nav className="flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">Terms of Service</Link>
            <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
