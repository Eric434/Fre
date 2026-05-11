import { useRef, useState } from "react";
import {
  Search, MapPin, Bell, TrendingUp, ArrowUp,
  ChevronRight, Zap, Clock, Shield, ExternalLink,
} from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    title: "Live Satellite Map",
    desc: "Real-time vehicle positioning updated every 15 seconds on a high-resolution satellite map layer.",
    color: "from-blue-600/20 to-blue-800/5",
    border: "border-blue-600/20",
    iconBg: "bg-blue-600/15",
    iconColor: "text-blue-400",
    tag: "Powered by OpenStreetMap",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Progress",
    desc: "Full event timeline from dispatch to delivery, with ETA predictions and live status updates.",
    color: "from-red-600/15 to-red-900/5",
    border: "border-red-600/20",
    iconBg: "bg-red-600/15",
    iconColor: "text-red-400",
    tag: "15s refresh rate",
  },
  {
    icon: Bell,
    title: "Email Alerts",
    desc: "Instant notifications at every milestone — departed, in transit, out for delivery, and delivered.",
    color: "from-violet-600/15 to-violet-900/5",
    border: "border-violet-600/20",
    iconBg: "bg-violet-600/15",
    iconColor: "text-violet-400",
    tag: "< 5s delivery",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Enter your code",
    desc: "Paste the tracking number from your confirmation email into the search bar above.",
  },
  {
    n: "02",
    title: "See live location",
    desc: "The map loads instantly with your shipment's current position and route path.",
  },
  {
    n: "03",
    title: "Track every event",
    desc: "A full timeline shows every scan, transfer, and status update in real time.",
  },
  {
    n: "04",
    title: "Get notified",
    desc: "Enter your email and receive alerts the moment your package status changes.",
  },
];

interface Props {
  onTrack: (code: string) => void;
  onAdmin: () => void;
}

export default function LandingPage({ onTrack, onAdmin }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    const val = query.trim().toUpperCase();
    if (val) onTrack(val);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" ref={topRef}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/6 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 100 120" className="w-5 h-6 text-red-600" fill="none">
            <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
              stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-semibold tracking-widest uppercase text-white/90">
            Tesla<span className="text-red-500">Track</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs text-white/40 hover:text-white/70 transition-colors">Features</a>
          <a href="#how-it-works" className="text-xs text-white/40 hover:text-white/70 transition-colors">How it works</a>
          <button
            onClick={onAdmin}
            className="text-xs px-4 py-1.5 border border-white/10 rounded-full text-white/50 hover:text-white hover:border-white/30 transition-all"
          >
            Admin Portal
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-24 pb-16 overflow-hidden">
        <div className="hero-glow w-[700px] h-[500px] bg-blue-600/10 animate-glow-blue top-20 left-1/2 -translate-x-1/2" />
        <div className="hero-glow w-[300px] h-[300px] bg-red-600/8 bottom-40 left-1/4" />
        <div className="hero-glow w-[250px] h-[250px] bg-blue-500/6 bottom-20 right-1/4" />

        {/* Live badge */}
        <div className="relative flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-blue-500/25 bg-blue-500/6 backdrop-blur-sm animate-slide-up">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"
              style={{ animation: "ping-live 1.4s cubic-bezier(0,0,0.2,1) infinite" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <span className="text-[11px] text-blue-300 tracking-widest uppercase font-medium">
            Live Tracking Active
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative text-center font-bold leading-[1.1] mb-6 animate-slide-up"
          style={{ animationDelay: "0.1s", fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
          <span className="gradient-text">Know exactly where</span>
          <br />
          <span className="text-white/90">your shipment is.</span>
        </h1>

        <p className="text-center text-white/40 max-w-md mb-10 text-sm leading-relaxed animate-slide-up"
          style={{ animationDelay: "0.2s" }}>
          Precision tracking with live satellite maps, real-time status updates, and
          instant email alerts — from dispatch to your doorstep.
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-xl animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className={`flex items-center gap-3 bg-[#111] border rounded-xl px-4 py-3.5 transition-all duration-300 ${
            focused ? "border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.12)]" : "border-white/10"
          }`}>
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your tracking code"
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none font-mono"
            />
            <button
              onClick={handleSubmit}
              disabled={!query.trim()}
              className="flex-shrink-0 px-5 py-2 rounded-lg text-sm font-medium transition-all
                bg-red-600 hover:bg-red-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Track
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-live">
          <span className="text-[9px] text-white/20 tracking-widest uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="border-y border-white/6 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-3 divide-x divide-white/6">
          {[
            { icon: Zap, value: "99.9%", label: "Uptime SLA" },
            { icon: Clock, value: "15s", label: "Refresh Rate" },
            { icon: Shield, value: "24 / 7", label: "Live Support" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center justify-center gap-3 px-6">
              <Icon className="w-4 h-4 text-red-500/70" />
              <div>
                <div className="text-lg font-semibold text-white/90">{value}</div>
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] text-red-500/70 tracking-[0.3em] uppercase mb-3">Capabilities</p>
            <h2 className="text-3xl font-bold text-white/90">Everything you need to track.</h2>
            <p className="text-white/35 text-sm mt-3 max-w-md mx-auto">
              Built for precision. Designed for clarity. Delivered in real time.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, border, iconBg, iconColor, tag }) => (
              <div key={title}
                className={`feature-card relative rounded-2xl border ${border} bg-gradient-to-b ${color} p-6 overflow-hidden`}>
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-5`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-2">{title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-[9px] text-white/20 border border-white/6 rounded-full px-2.5 py-1">
                  <span className="w-1 h-1 rounded-full bg-green-400" />
                  {tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#0d0d0d] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] text-blue-400/60 tracking-[0.3em] uppercase mb-3">Process</p>
            <h2 className="text-3xl font-bold text-white/90">Simple as four steps.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="space-y-3">
              {STEPS.map(({ n, title, desc }) => (
                <div key={n} className="step-card flex gap-4 p-5 rounded-xl border border-white/6 bg-white/2">
                  <span className="text-2xl font-bold text-white/8 font-mono flex-shrink-0 w-10 text-right leading-tight">
                    {n}
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white/80 mb-1">{title}</h4>
                    <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Info card replacing demo card */}
            <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden shadow-2xl p-8 flex flex-col items-center justify-center text-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                <svg viewBox="0 0 100 120" className="w-7 h-8 text-red-500" fill="none">
                  <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                    stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white/90 mb-2">Track your shipment</h3>
                <p className="text-xs text-white/35 leading-relaxed max-w-xs">
                  Enter the tracking code from your confirmation email above to see your package's live location on the map.
                </p>
              </div>
              <button
                onClick={() => {
                  topRef.current?.scrollIntoView({ behavior: "smooth" });
                  setTimeout(() => topRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 400);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all group"
              >
                Enter tracking code
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="hero-glow w-[500px] h-[300px] bg-blue-600/8 animate-glow-blue top-0 left-1/2 -translate-x-1/2" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Start tracking now.</span>
          </h2>
          <p className="text-white/35 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Enter your tracking code and get instant, real-time results.
          </p>
          <button
            onClick={() => {
              topRef.current?.scrollIntoView({ behavior: "smooth" });
              topRef.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all shadow-lg shadow-red-900/30 group"
          >
            <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Enter a tracking code
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/6 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 120" className="w-4 h-5 text-red-600" fill="none">
              <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/50">
              Tesla<span className="text-red-500/70">Track</span>
            </span>
            <span className="text-[10px] text-white/20 ml-2">© 2026 · All rights reserved</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">Features</a>
            <a href="#how-it-works" className="text-[10px] text-white/25 hover:text-white/50 transition-colors">How it works</a>
            <button
              onClick={onAdmin}
              className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              Admin Portal <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
