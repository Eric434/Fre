import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  ArrowLeft, Package, CheckCircle2, Circle, MapPin, Clock,
  Bell, BellOff, Play, Pause, RotateCcw, Navigation,
  Loader2, AlertCircle, Wifi, ChevronRight, Gauge,
  X, List, FileText, Download, Compass, Lock, CheckSquare,
} from "lucide-react";
import { fetchPackage, subscribeToAlerts, notifyDelivered, type Package as Pkg, type FetchPackageResult } from "@/lib/api";

// ─── Route normalization + interpolation ──────────────────────────────────────

type WaypointRaw = [number, number] | { lat: number; lng: number } | unknown;

function normalizeRoute(route: unknown): [number, number][] {
  if (!Array.isArray(route) || route.length === 0) return [];
  return route.map((wp): [number, number] => {
    if (Array.isArray(wp) && wp.length >= 2) return [Number(wp[0]), Number(wp[1])];
    if (wp && typeof wp === "object" && "lat" in wp && "lng" in wp)
      return [Number((wp as { lat: unknown }).lat), Number((wp as { lng: unknown }).lng)];
    return [0, 0];
  });
}

function interpolateRoute(waypoints: [number, number][], n: number): [number, number][] {
  if (waypoints.length < 2) return waypoints.length === 1 ? [waypoints[0], waypoints[0]] : [[0, 0], [0, 0]];
  const dists: number[] = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const [a, b] = waypoints[i - 1];
    const [c, d] = waypoints[i];
    dists.push(dists[i - 1] + Math.sqrt((c - a) ** 2 + (d - b) ** 2));
  }
  const total = dists[dists.length - 1];
  if (total === 0) return Array(n).fill(waypoints[0]) as [number, number][];
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * total;
    let seg = 0;
    for (let j = 1; j < dists.length; j++) { if (dists[j] >= t) { seg = j - 1; break; } seg = j - 1; }
    const len = (dists[seg + 1] ?? dists[seg]) - dists[seg];
    const f = len > 0 ? (t - dists[seg]) / len : 0;
    const [a, b] = waypoints[seg];
    const [c, d] = waypoints[Math.min(seg + 1, waypoints.length - 1)];
    return [a + f * (c - a), b + f * (d - b)] as [number, number];
  });
}

function getBearing(from: [number, number], to: [number, number]): number {
  const dLng = to[1] - from[1];
  const dLat = to[0] - from[0];
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
}

function bearingToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function vehicleMarkerHtml(moving: boolean, bearing: number): string {
  const glow = moving
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(220,38,38,0.22);animation:ping-live 1.4s ease-in-out infinite;pointer-events:none;"></div>
       <div style="position:absolute;inset:-2px;border-radius:50%;background:rgba(220,38,38,0.10);pointer-events:none;"></div>`
    : "";
  const headlightOpacity = moving ? "1" : "0.35";
  const bodyColor = moving ? "#dc2626" : "#b91c1c";
  return `<div style="position:relative;width:28px;height:44px;transform:rotate(${bearing}deg);transform-origin:14px 22px;">
    ${glow}
    <svg viewBox="0 0 28 44" width="28" height="44" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:1;filter:drop-shadow(0 2px 8px rgba(220,38,38,0.5));">
      <rect x="4" y="8" width="20" height="28" rx="5" fill="${bodyColor}"/>
      <rect x="7" y="14" width="14" height="13" rx="3" fill="#991b1b"/>
      <rect x="8" y="11" width="12" height="4" rx="1.5" fill="rgba(147,210,255,0.55)"/>
      <rect x="8" y="29" width="12" height="4" rx="1.5" fill="rgba(147,210,255,0.35)"/>
      <rect x="1" y="10" width="5" height="8" rx="2" fill="#111"/><rect x="2.5" y="11.5" width="2" height="5" rx="1" fill="#333"/>
      <rect x="22" y="10" width="5" height="8" rx="2" fill="#111"/><rect x="23.5" y="11.5" width="2" height="5" rx="1" fill="#333"/>
      <rect x="1" y="26" width="5" height="8" rx="2" fill="#111"/><rect x="2.5" y="27.5" width="2" height="5" rx="1" fill="#333"/>
      <rect x="22" y="26" width="5" height="8" rx="2" fill="#111"/><rect x="23.5" y="27.5" width="2" height="5" rx="1" fill="#333"/>
      <rect x="7" y="8" width="5" height="2.5" rx="1" fill="#fde68a" opacity="${headlightOpacity}"/>
      <rect x="16" y="8" width="5" height="2.5" rx="1" fill="#fde68a" opacity="${headlightOpacity}"/>
      <rect x="7" y="33" width="5" height="2.5" rx="1" fill="#ef4444" opacity="0.85"/>
      <rect x="16" y="33" width="5" height="2.5" rx="1" fill="#ef4444" opacity="0.85"/>
    </svg>
  </div>`;
}

// ─── Milestone data ───────────────────────────────────────────────────────────

const MILESTONES = [
  { label: "Booking Confirmed", sub: "Shipment registered" },
  { label: "Picked Up", sub: "Carrier collected from origin" },
  { label: "In Transit", sub: "En route to destination" },
  { label: "Customs Clearance", sub: "Documentation verified" },
  { label: "Out for Delivery", sub: "Last-mile dispatch" },
  { label: "Delivered", sub: "Shipment complete" },
];

function getMilestoneIndex(status: string): number {
  if (status === "Delivered") return 5;
  if (status === "Out for Delivery") return 4;
  if (status === "Customs Clearance") return 3;
  if (status === "In Transit") return 2;
  if (status === "Picked Up" || status === "Dispatched") return 1;
  return 0;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL = 200;
const STEP_MS = 4500;

type DrawerTab = "timeline" | "alerts" | "docs";
interface Props { code: string; onBack: () => void; onAdmin: () => void; }

// ─── Loading / Error screens ──────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#080808] text-white items-center justify-center gap-4">
      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      <p className="text-xs text-white/30">Looking up tracking code…</p>
    </div>
  );
}

function NotFoundScreen({ code, onBack }: { code: string; onBack: () => void }) {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#080808] text-white items-center justify-center gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
        <Package className="w-6 h-6 text-white/20" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/70 mb-1">Tracking code not found</p>
        <code className="text-xs font-mono text-white/30">{code}</code>
        <p className="text-xs text-white/25 mt-2 max-w-xs">Check your confirmation email and try again.</p>
      </div>
      <button onClick={onBack}
        className="flex items-center gap-2 px-5 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-all">
        <ArrowLeft className="w-3.5 h-3.5" /> Go back
      </button>
    </div>
  );
}

function ErrorScreen({ code, reason, onBack, onRetry }: {
  code: string; reason: "server_error" | "network_error"; onBack: () => void; onRetry: () => void;
}) {
  const isNetwork = reason === "network_error";
  return (
    <div className="flex flex-col h-[100dvh] bg-[#080808] text-white items-center justify-center gap-5 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400/60" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/70 mb-1">
          {isNetwork ? "No connection" : "Server error"}
        </p>
        <code className="text-xs font-mono text-white/30">{code}</code>
        <p className="text-xs text-white/25 mt-2 max-w-xs">
          {isNetwork
            ? "Could not reach the tracking server. Check your connection and try again."
            : "Something went wrong on our end. Please try again in a moment."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-5 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-all">
          <ArrowLeft className="w-3.5 h-3.5" /> Go back
        </button>
        <button onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function TrackingResult({ code, onBack, onAdmin }: Props) {
  const [result, setResult] = useState<FetchPackageResult | "loading">("loading");

  const load = useCallback(() => {
    setResult("loading");
    fetchPackage(code).then(setResult);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  if (result === "loading") return <LoadingScreen />;
  if (!result.ok && result.reason === "not_found") return <NotFoundScreen code={code} onBack={onBack} />;
  if (!result.ok) return <ErrorScreen code={code} reason={result.reason as "server_error" | "network_error"} onBack={onBack} onRetry={load} />;
  return <TrackingView pkg={result.pkg} code={code} onBack={onBack} onAdmin={onAdmin} />;
}

// ─── Milestone stepper panel ──────────────────────────────────────────────────

function TimelinePanel({ pkg, code, progress, simSpeed, secsAgo, bearing, getProgressGradient }: {
  pkg: Pkg; code: string; progress: number; simSpeed: number; secsAgo: number; bearing: number;
  getProgressGradient: () => string;
}) {
  const currentMilestone = getMilestoneIndex(pkg.status);

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ETA + route header */}
      <div className="p-5 border-b border-white/6 flex-shrink-0">
        <div className="mb-3">
          <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Estimated Arrival</div>
          <div className="text-sm font-semibold text-white/90">{pkg.eta}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/35 mb-4 flex-wrap">
          <MapPin className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
          <span className="truncate max-w-[90px]">{pkg.origin}</span>
          <ChevronRight className="w-3 h-3 text-white/12 flex-shrink-0" />
          <MapPin className="w-2.5 h-2.5 text-blue-500/50 flex-shrink-0" />
          <span className="truncate max-w-[90px]">{pkg.destination}</span>
        </div>
        <div>
          <div className="flex justify-between text-[9px] text-white/25 mb-1.5">
            <span>Origin</span>
            <span className="text-white/50 font-mono font-medium">{progress}%</span>
            <span>Destination</span>
          </div>
          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${getProgressGradient()} rounded-full`}
              style={{ width: `${progress}%`, transition: "width 1.6s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
      </div>

      {/* Live telemetry row */}
      <div className="px-5 py-3 border-b border-white/6 flex-shrink-0 grid grid-cols-4 gap-1">
        {[
          { icon: Gauge, val: `${simSpeed}`, sub: "km/h" },
          { icon: Clock, val: `${secsAgo}s`, sub: "ping" },
          { icon: Compass, val: bearingToCardinal(bearing), sub: "hdg" },
          { icon: Navigation, val: `${Math.round(bearing)}°`, sub: "bear" },
        ].map(({ icon: Icon, val, sub }) => (
          <div key={sub} className="text-center bg-white/3 rounded-lg py-2">
            <Icon className="w-2.5 h-2.5 text-white/20 mx-auto mb-0.5" />
            <div className="text-[10px] font-mono text-white/65 tabular-nums">{val}</div>
            <div className="text-[8px] text-white/20">{sub}</div>
          </div>
        ))}
      </div>

      {/* Milestone stepper */}
      <div className="p-5 border-b border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Logistics Milestones</div>
        <div className="relative">
          {MILESTONES.map((ms, i) => {
            const done = i < currentMilestone;
            const active = i === currentMilestone;
            const pending = i > currentMilestone;
            return (
              <div key={i} className="flex gap-3 relative">
                {/* Connector line */}
                {i < MILESTONES.length - 1 && (
                  <div className={`absolute left-[10px] top-5 w-0.5 h-full -mb-1 ${done ? "bg-green-500/40" : "bg-white/6"}`} />
                )}
                {/* Circle */}
                <div className="flex-shrink-0 z-10 mt-0.5">
                  {done ? (
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                  ) : active ? (
                    <div className="w-5 h-5 rounded-full bg-red-600/25 border border-red-500/60 flex items-center justify-center"
                      style={{ boxShadow: "0 0 8px rgba(220,38,38,0.4)" }}>
                      <div className="w-2 h-2 rounded-full bg-red-500"
                        style={{ animation: "pulse-live 1.4s ease-in-out infinite" }} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/4 border border-white/10 flex items-center justify-center">
                      <Circle className="w-2.5 h-2.5 text-white/15" />
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className={`pb-4 min-w-0 ${i === MILESTONES.length - 1 ? "pb-0" : ""}`}>
                  <div className={`text-xs font-medium leading-tight ${
                    done ? "text-green-400/80" : active ? "text-white/90" : pending ? "text-white/25" : ""
                  }`}>
                    {ms.label}
                    {active && (
                      <span className="ml-2 text-[8px] text-red-400 bg-red-600/15 border border-red-600/25 rounded-full px-1.5 py-0.5">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${
                    done ? "text-green-400/40" : active ? "text-white/35" : "text-white/15"
                  }`}>{ms.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Package info */}
      <div className="p-4 border-b border-white/6 flex-shrink-0 grid grid-cols-2 gap-3">
        {[
          { label: "Carrier", value: pkg.carrier },
          { label: "Code", value: code },
          { label: "Weight", value: pkg.weight },
          { label: "Status", value: pkg.status },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-[10px] text-white/55 truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Event log */}
      <div className="flex-1 p-5">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Event Log</div>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/6" />
          <div className="space-y-4">
            {pkg.events.map((ev, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="flex-shrink-0 mt-0.5">
                  {ev.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 bg-[#0c0c0c]" />
                    : <Circle className="w-3.5 h-3.5 text-white/12 bg-[#0c0c0c]" />}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs mb-0.5 ${ev.done ? "text-white/65" : "text-white/18"}`}>{ev.label}</div>
                  <div className="text-[9px] text-white/22">{ev.location}</div>
                  {ev.time_label && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2 h-2 text-white/15" />
                      <span className="text-[9px] font-mono text-white/20">{ev.time_label}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications panel ──────────────────────────────────────────────────────

function NotificationsPanel({ pkg, trackingCode, simSpeed, secsAgo, playing }: {
  pkg: Pkg; trackingCode: string; simSpeed: number; secsAgo: number; playing: boolean;
}) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setLoading(true); setApiError(null);
    const result = await subscribeToAlerts({
      email, trackingCode, status: pkg.status, eta: pkg.eta, from: pkg.origin, to: pkg.destination,
    });
    setLoading(false);
    if (result.success) setSubscribed(true);
    else setApiError(result.error ?? "Something went wrong");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Email Notifications</div>
        {!subscribed ? (
          <>
            <p className="text-[10px] text-white/30 leading-relaxed mb-4">
              Get notified the moment your package status changes.
            </p>
            {!showInput ? (
              <button onClick={() => setShowInput(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium transition-all">
                <Bell className="w-3.5 h-3.5" /> Enable Alerts
              </button>
            ) : (
              <div className="space-y-2">
                <input type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setApiError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                  placeholder="your@email.com" disabled={loading}
                  className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-red-600/40 disabled:opacity-50" />
                {apiError && (
                  <div className="flex items-start gap-1.5 text-[10px] text-red-400">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{apiError}</span>
                  </div>
                )}
                <button onClick={handleSubscribe} disabled={!email.includes("@") || loading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-medium transition-all">
                  {loading ? <><Loader2 className="w-3 h-3 animate-spin" />Sending…</> : "Subscribe"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-1">
            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-[10px] text-green-400 font-medium">Alerts enabled!</p>
            <p className="text-[9px] text-white/35 mt-1 break-all">{email}</p>
            <p className="text-[9px] text-white/20 mt-1">Confirmation email sent.</p>
            <button onClick={() => { setSubscribed(false); setShowInput(false); setEmail(""); setApiError(null); }}
              className="mt-3 flex items-center gap-1 text-[9px] text-white/18 hover:text-white/40 transition-colors mx-auto">
              <BellOff className="w-2.5 h-2.5" /> Unsubscribe
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Recent Events</div>
        <div className="space-y-2">
          {pkg.events.filter((e) => e.done).slice(0, 5).map((ev, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-white/3 border border-white/5">
              <div className="text-[10px] text-white/55 mb-0.5">{ev.label}</div>
              <div className="text-[9px] text-white/22">{ev.location}{ev.time_label ? ` · ${ev.time_label}` : ""}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/20 uppercase tracking-widest mb-3">Live Stats</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Gauge, label: "Speed", value: `${simSpeed} km/h` },
            { icon: Wifi, label: "Signal", value: playing ? "Live" : "Paused" },
            { icon: CheckSquare, label: "Completed", value: pkg.events.filter((e) => e.done).length.toString() },
            { icon: Clock, label: "Updated", value: `${secsAgo}s` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/3 rounded-lg p-2 text-center">
              <Icon className="w-3 h-3 text-white/18 mx-auto mb-1" />
              <div className="text-[10px] font-mono text-white/55">{value}</div>
              <div className="text-[8px] text-white/20">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Document Vault panel ─────────────────────────────────────────────────────

const DOCUMENTS = [
  {
    name: "Bill of Lading",
    desc: "Master transport document issued by carrier",
    status: "available" as const,
    pages: 2,
    ref: "BOL",
  },
  {
    name: "Commercial Invoice",
    desc: "Declared value and goods description",
    status: "available" as const,
    pages: 1,
    ref: "INV",
  },
  {
    name: "Customs Declaration",
    desc: "Import/export regulatory filing",
    status: "pending" as const,
    pages: 3,
    ref: "CUST",
  },
  {
    name: "Packing List",
    desc: "Itemized list of shipment contents",
    status: "available" as const,
    pages: 1,
    ref: "PKL",
  },
  {
    name: "Insurance Certificate",
    desc: "Cargo insurance documentation",
    status: "processing" as const,
    pages: 2,
    ref: "INS",
  },
];

function DocumentsPanel({ code }: { code: string }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-5 border-b border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Document Vault</div>
        <p className="text-[10px] text-white/30 leading-relaxed">
          Secure shipment documentation for tracking code <span className="font-mono text-white/45">{code}</span>.
        </p>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {DOCUMENTS.map((doc) => (
          <div key={doc.ref} className={`rounded-xl border p-3.5 transition-all ${
            doc.status === "available"
              ? "bg-white/3 border-white/8 hover:border-white/15"
              : doc.status === "pending"
              ? "bg-yellow-500/4 border-yellow-500/15"
              : "bg-white/2 border-white/5"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  doc.status === "available" ? "bg-blue-600/15 border border-blue-600/20" :
                  doc.status === "pending"   ? "bg-yellow-500/15 border border-yellow-500/20" :
                                              "bg-white/5 border border-white/8"
                }`}>
                  <FileText className={`w-4 h-4 ${
                    doc.status === "available" ? "text-blue-400" :
                    doc.status === "pending"   ? "text-yellow-400" : "text-white/25"
                  }`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate">{doc.name}</div>
                  <div className="text-[9px] text-white/30 mt-0.5 leading-relaxed">{doc.desc}</div>
                  <div className="text-[8px] text-white/18 mt-1 font-mono">{doc.pages}p · REF: {doc.ref}-{code.slice(-3)}</div>
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <span className={`text-[8px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide ${
                  doc.status === "available"  ? "text-green-400 border-green-500/30 bg-green-500/10" :
                  doc.status === "pending"    ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                                               "text-white/25 border-white/10 bg-white/4"
                }`}>
                  {doc.status}
                </span>
                {doc.status === "available" ? (
                  <button
                    className="flex items-center gap-1 text-[9px] text-blue-400/70 hover:text-blue-400 transition-colors"
                    onClick={() => alert(`Document download requires a production deployment. Ref: ${doc.ref}-${code.slice(-3)}`)}>
                    <Download className="w-2.5 h-2.5" /> PDF
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-[9px] text-white/18">
                    <Lock className="w-2.5 h-2.5" />
                    {doc.status === "pending" ? "Pending" : "Processing"}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/6 flex-shrink-0">
        <div className="flex items-center gap-2 text-[9px] text-white/18">
          <Lock className="w-3 h-3" />
          <span>Documents are encrypted and access-controlled per tracking code.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main TrackingView ────────────────────────────────────────────────────────

function TrackingView({ pkg, code, onBack, onAdmin }: { pkg: Pkg; code: string; onBack: () => void; onAdmin: () => void }) {
  const route = normalizeRoute(pkg.route);
  const fullPath = interpolateRoute(route, TOTAL);
  const startIdx = Math.min(Math.floor(pkg.start_progress * (TOTAL - 1)), TOTAL - 1);

  const [posIdx, setPosIdx] = useState(startIdx);
  const [playing, setPlaying] = useState(pkg.status !== "Delivered");
  const [secsAgo, setSecsAgo] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bearing, setBearing] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("timeline");
  const deliveryFiredRef = useRef(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const donePolyRef = useRef<L.Polyline | null>(null);
  const remainPolyRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const t = setInterval(() => { setCurrentTime(new Date()); setSecsAgo((s) => s + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!playing || posIdx >= TOTAL - 1) return;
    const t = setInterval(() => {
      setPosIdx((i) => {
        const next = Math.min(i + 1, TOTAL - 1);
        if (next >= TOTAL - 1 && !deliveryFiredRef.current) {
          deliveryFiredRef.current = true;
          notifyDelivered(code);
        }
        return next;
      });
      setSecsAgo(0);
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing, posIdx, code]);

  useEffect(() => {
    const pos = fullPath[posIdx];
    if (!pos) return;
    vehicleMarkerRef.current?.setLatLng(pos);
    donePolyRef.current?.setLatLngs(fullPath.slice(0, posIdx + 1));
    remainPolyRef.current?.setLatLngs(fullPath.slice(posIdx));
    const next = fullPath[Math.min(posIdx + 1, TOTAL - 1)];
    const prev = fullPath[Math.max(posIdx - 1, 0)];
    const b = posIdx < TOTAL - 1 ? getBearing(pos, next) : getBearing(prev, pos);
    setBearing(b);
    const isMoving = playing && posIdx < TOTAL - 1;
    vehicleMarkerRef.current?.setIcon(
      L.divIcon({ html: vehicleMarkerHtml(isMoving, b), className: "", iconSize: [28, 44], iconAnchor: [14, 22] })
    );
  }, [posIdx, playing]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const pos = fullPath[posIdx];
    if (pos) mapInstanceRef.current.panTo(pos, { animate: true, duration: 1.5, easeLinearity: 0.1 });
  }, [posIdx]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const initPos = fullPath[startIdx];
    const map = L.map(mapRef.current, { center: initPos, zoom: 9, zoomControl: false });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Force dark background while tiles load
    const pane = map.getPane("tilePane");
    if (pane) pane.style.filter = "brightness(0.92) saturate(0.8)";

    L.control.zoom({ position: "bottomright" }).addTo(map);

    donePolyRef.current = L.polyline(fullPath.slice(0, startIdx + 1), {
      color: "#ef4444", weight: 3, opacity: 0.9,
    }).addTo(map);

    remainPolyRef.current = L.polyline(fullPath.slice(startIdx), {
      color: "#60a5fa", weight: 2, opacity: 0.45, dashArray: "8 6",
    }).addTo(map);

    L.marker(fullPath[0], {
      icon: L.divIcon({
        html: `<div style="width:10px;height:10px;background:#555;border:2px solid #888;border-radius:50%;box-shadow:0 0 6px rgba(255,255,255,0.2);"></div>`,
        className: "", iconSize: [10, 10], iconAnchor: [5, 5],
      }),
    }).addTo(map).bindPopup(`<b>Origin</b><br>${pkg.origin}`);

    L.marker(fullPath[TOTAL - 1], {
      icon: L.divIcon({
        html: `<div style="width:13px;height:13px;background:#3b82f6;border:2px solid #60a5fa;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8);"></div>`,
        className: "", iconSize: [13, 13], iconAnchor: [6.5, 6.5],
      }),
    }).addTo(map).bindPopup(`<b>Destination</b><br>${pkg.destination}`);

    const initNext = fullPath[Math.min(startIdx + 1, TOTAL - 1)];
    const initBearing = startIdx < TOTAL - 1 ? getBearing(initPos, initNext) : 0;
    setBearing(initBearing);

    vehicleMarkerRef.current = L.marker(initPos, {
      icon: L.divIcon({
        html: vehicleMarkerHtml(pkg.status !== "Delivered", initBearing),
        className: "", iconSize: [28, 44], iconAnchor: [14, 22],
      }),
      zIndexOffset: 1000,
    }).addTo(map).bindPopup(`<b>${pkg.status}</b>`);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      vehicleMarkerRef.current = null;
      donePolyRef.current = null;
      remainPolyRef.current = null;
    };
  }, []);

  const handleReset = useCallback(() => {
    setPosIdx(startIdx); setSecsAgo(0); setPlaying(true);
    deliveryFiredRef.current = false;
  }, [startIdx]);

  const progress = Math.round((posIdx / (TOTAL - 1)) * 100);
  const isDelivered = posIdx >= TOTAL - 1 || pkg.status === "Delivered";
  const simSpeed = isDelivered ? 0 : playing ? pkg.speed_kph : 0;

  const getStatusColor = () => {
    if (isDelivered) return "text-green-400 bg-green-500/10 border-green-500/20";
    if (pkg.status === "Out for Delivery") return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };
  const getProgressGradient = () => {
    if (isDelivered) return "from-green-600 to-green-400";
    if (pkg.status === "Out for Delivery") return "from-red-600 via-orange-500 to-blue-500";
    return "from-red-600 to-yellow-500";
  };

  return (
    <div className="relative bg-[#080808] text-white overflow-hidden animate-fade-in" style={{ height: "100dvh", width: "100vw" }}>

      {/* ══ FULL-SCREEN MAP ══════════════════════════════════════════════════════ */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* ══ FLOATING HEADER ═════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="mx-3 mt-3 pointer-events-auto">
          <div className="flex items-center justify-between bg-black/85 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors flex-shrink-0 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="w-px h-4 bg-white/10 flex-shrink-0" />
              <img src="/tesla-logo.png" alt="TeslaTrack" className="logo-spin w-8 h-8 object-contain flex-shrink-0" />
              <code className="text-[11px] font-mono text-white/50 truncate max-w-[120px] sm:max-w-none">{code}</code>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border ${getStatusColor()}`}>
                {!isDelivered && playing && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"
                    style={{ animation: "pulse-live 1.5s ease-in-out infinite" }} />
                )}
                <span>{isDelivered ? "Delivered" : pkg.status}</span>
              </div>
              <span className="text-[10px] font-mono text-white/30 tabular-nums hidden sm:inline">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FLOATING SIDE MENU BUTTON ════════════════════════════════════════════ */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
        <div className="flex flex-col gap-0 mr-0">
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="group flex flex-col items-center justify-center gap-1.5 w-10 py-4 bg-black/85 backdrop-blur-md border border-white/10 border-r-0 rounded-tl-2xl shadow-xl transition-all hover:bg-black/95"
          >
            {drawerOpen
              ? <X className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
              : <List className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
            }
          </button>

          {(["timeline", "alerts", "docs"] as DrawerTab[]).map((tab, i) => {
            const icons = { timeline: List, alerts: Bell, docs: FileText };
            const labels = { timeline: "Track", alerts: "Alerts", docs: "Docs" };
            const Icon = icons[tab];
            const isLast = i === 2;
            return (
              <button key={tab}
                onClick={() => { setDrawerTab(tab); setDrawerOpen(true); }}
                className={`group flex flex-col items-center justify-center gap-1 w-10 py-3.5 backdrop-blur-md border border-white/10 border-r-0 border-t-0 shadow-xl transition-all ${
                  isLast ? "rounded-bl-2xl" : ""
                } ${
                  drawerOpen && drawerTab === tab
                    ? "bg-red-600/25 border-red-600/30 text-red-400"
                    : "bg-black/75 hover:bg-black/90 text-white/30 hover:text-white/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[7px] tracking-wide"
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                  {labels[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ SLIDE-IN DRAWER ══════════════════════════════════════════════════════ */}
      {drawerOpen && (
        <div className="absolute inset-0 z-[25] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setDrawerOpen(false)} />
      )}

      <div
        className="absolute top-0 right-0 bottom-0 z-30 w-80 max-w-[85vw] bg-[#0b0b0b] border-l border-white/8 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ transform: drawerOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-1 bg-white/4 rounded-xl border border-white/8 p-0.5">
            {(["timeline", "alerts", "docs"] as DrawerTab[]).map((tab) => {
              const icons = { timeline: List, alerts: Bell, docs: FileText };
              const labels = { timeline: "Timeline", alerts: "Alerts", docs: "Docs" };
              const Icon = icons[tab];
              return (
                <button key={tab} onClick={() => setDrawerTab(tab)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    drawerTab === tab
                      ? "bg-red-600/20 text-red-400 border border-red-600/30"
                      : "text-white/35 hover:text-white/60"
                  }`}>
                  <Icon className="w-3 h-3" /> {labels[tab]}
                </button>
              );
            })}
          </div>
          <button onClick={() => setDrawerOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/4 hover:bg-white/10 border border-white/8 text-white/40 hover:text-white/70 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Drawer content */}
        <div className="flex-1 overflow-hidden">
          {drawerTab === "timeline" && (
            <TimelinePanel
              pkg={pkg} code={code} progress={progress} simSpeed={simSpeed}
              secsAgo={secsAgo} bearing={bearing} getProgressGradient={getProgressGradient}
            />
          )}
          {drawerTab === "alerts" && (
            <NotificationsPanel
              pkg={pkg} trackingCode={code} simSpeed={simSpeed}
              secsAgo={secsAgo} playing={playing}
            />
          )}
          {drawerTab === "docs" && <DocumentsPanel code={code} />}
        </div>

        <div className="px-5 py-3 border-t border-white/6 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tesla-logo.png" alt="TeslaTrack" className="logo-spin w-6 h-6 object-contain opacity-50" />
            <span className="text-[9px] text-white/20 uppercase tracking-widest font-semibold">TeslaTrack</span>
          </div>
          <button onClick={onAdmin}
            className="text-[9px] text-white/20 hover:text-white/45 transition-colors px-2 py-1 rounded border border-white/6 hover:border-white/15">
            Admin
          </button>
        </div>
      </div>

      {/* ══ MAP OVERLAYS ════════════════════════════════════════════════════════ */}

      {/* Live badge — top left */}
      <div className="absolute top-20 left-3 z-20">
        <div className="bg-black/90 border border-white/8 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0"
            style={{
              boxShadow: playing && !isDelivered ? "0 0 8px rgba(220,38,38,0.9)" : "none",
              animation: playing && !isDelivered ? "pulse-live 1.4s ease-in-out infinite" : "none",
            }} />
          <span className="text-xs text-white/55">
            {isDelivered ? "Delivered" : playing ? `Live · ${simSpeed} km/h` : "Paused"}
          </span>
        </div>
      </div>

      {/* Play/Pause/Reset controls */}
      {!isDelivered && (
        <div className="absolute top-32 left-3 z-20">
          <div className="flex flex-col gap-0 bg-black/90 border border-white/8 rounded-xl overflow-hidden">
            <button onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/8 transition-colors text-white/50 hover:text-white/80">
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="text-[10px]">{playing ? "Pause" : "Play"}</span>
            </button>
            <div className="h-px bg-white/6" />
            <button onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/8 transition-colors text-white/50 hover:text-white/80">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Route legend */}
      <div className="absolute left-3 z-20 hidden sm:flex flex-col gap-1.5"
        style={{ top: isDelivered ? "5rem" : "13rem" }}>
        <div className="bg-black/90 border border-white/8 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-red-500 rounded" />
          <span className="text-[9px] text-white/30">Completed</span>
        </div>
        <div className="bg-black/90 border border-white/8 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded"
            style={{ backgroundImage: "repeating-linear-gradient(to right,#60a5fa 0,#60a5fa 4px,transparent 4px,transparent 8px)" }} />
          <span className="text-[9px] text-white/30">Remaining</span>
        </div>
      </div>

      {/* Bottom telemetry bar */}
      {!isDelivered && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3">
          <div className="overflow-x-auto max-w-full rounded-2xl">
            <div className="bg-black/95 border border-white/10 rounded-2xl shadow-2xl flex items-center w-max">
              {/* Mobile: 3 core stats; Desktop: all 5 */}
              {[
                { label: "Speed", value: `${simSpeed} km/h`, hi: true, mobile: true },
                { label: "Heading", value: `${bearingToCardinal(bearing)} ${Math.round(bearing)}°`, hi: false, mobile: true },
                { label: "ETA", value: pkg.eta, hi: false, mobile: true },
                { label: "Progress", value: `${progress}%`, hi: false, mobile: false },
                { label: "Last Ping", value: `${secsAgo}s ago`, hi: false, mobile: false },
              ].map(({ label, value, hi, mobile }, i, arr) => (
                <div
                  key={label}
                  className={`flex items-center gap-3 ${!mobile ? "hidden sm:flex" : "flex"}`}
                >
                  <div className="px-4 py-2.5 text-center">
                    <div className="text-[9px] text-white/25 mb-0.5 whitespace-nowrap">{label}</div>
                    <div className={`text-xs font-mono font-semibold whitespace-nowrap ${hi ? "text-red-400" : "text-white/75"}`}>{value}</div>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-5 bg-white/8 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delivered banner */}
      {isDelivered && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3">
          <div className="bg-[#0d2010] border border-green-500/30 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-green-300">Package Delivered</div>
              <div className="text-[10px] text-green-400/60">{pkg.eta}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
