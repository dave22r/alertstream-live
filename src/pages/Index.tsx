import { Link } from "react-router-dom";
import { Shield, Radio, ArrowRight, Zap, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-zinc-950 to-blue-950/20" />
        
        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between border-b border-zinc-800 px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SafeStream</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <Link to="/police">Police Dashboard</Link>
            </Button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-16 text-center lg:px-12 lg:pt-24">
          <div>
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-300">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Zero-friction emergency response</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Real-time situational
              <br />
              <span className="bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                awareness for responders
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 lg:text-xl">
              Instantly share live video, audio, and location with verified law
              enforcement during emergencies. No login. No delays. Just one tap.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold gap-2">
                <Link to="/stream">
                  <Radio className="h-5 w-5" />
                  Start Emergency Stream
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 px-6 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-2">
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
      <section className="border-t border-zinc-800 bg-zinc-900 py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
            <p className="mt-3 text-zinc-400">
              Designed for speed and safety when every second counts
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 transition-all hover:border-red-500/50 hover:bg-zinc-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600/10 border border-red-500/20">
                <Radio className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">One-Tap Activation</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                No login, no verification, no delays. Open the link and tap to
                start streaming immediately.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 transition-all hover:border-emerald-500/50 hover:bg-zinc-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/10 border border-emerald-500/20">
                <Lock className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Police-Only Access</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Streams are only visible to verified law enforcement through a
                secure, authenticated dashboard.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 transition-all hover:border-blue-500/50 hover:bg-zinc-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20">
                <MapPin className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Live Metadata</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                GPS coordinates, timestamps, and user notes are transmitted
                alongside the video for full context.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
