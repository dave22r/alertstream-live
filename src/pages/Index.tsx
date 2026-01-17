import { Link } from "react-router-dom";
import { Shield, Radio, Eye, ArrowRight, Zap, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emergency/5" />
        
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">SafeStream</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/police">Police Dashboard</Link>
            </Button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-16 text-center lg:px-12 lg:pt-24">
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium">
              <Zap className="h-4 w-4 text-warning" />
              <span>Zero-friction emergency response</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Real-time situational
              <br />
              <span className="bg-gradient-to-r from-emergency to-emergency-glow bg-clip-text text-transparent">
                awareness for responders
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
              Instantly share live video, audio, and location with verified law
              enforcement during emergencies. No login. No delays. Just one tap.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="emergency" size="xl" asChild className="animate-emergency-pulse">
                <Link to="/stream">
                  <Radio className="h-5 w-5" />
                  Start Emergency Stream
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/police">
                  View Police Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="border-t border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Designed for speed and safety when every second counts
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emergency/10">
                <Radio className="h-6 w-6 text-emergency" />
              </div>
              <h3 className="text-lg font-semibold">One-Tap Activation</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                No login, no verification, no delays. Open the link and tap to
                start streaming immediately.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Lock className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold">Police-Only Access</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Streams are only visible to verified law enforcement through a
                secure, authenticated dashboard.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Live Metadata</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                GPS coordinates, timestamps, and user notes are transmitted
                alongside the video for full context.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-12">
          <div className="rounded-2xl border border-border bg-card p-8 lg:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Eye className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Try the Demo</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Experience both perspectives: start a stream as a caller, or view
              incoming streams as an officer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="emergency" size="lg" asChild>
                <Link to="/stream">
                  <Radio className="h-4 w-4" />
                  Open Streamer View
                </Link>
              </Button>
              <Button variant="default" size="lg" asChild>
                <Link to="/police">
                  <Shield className="h-4 w-4" />
                  Open Police Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>SafeStream — Emergency Situational Awareness</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for nwHacks 2025
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
