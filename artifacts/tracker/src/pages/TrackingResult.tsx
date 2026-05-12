import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  ArrowLeft, Package, CheckCircle2, Circle, MapPin, Clock,
  Bell, BellOff, Play, Pause, RotateCcw, Navigation,
  Loader2, AlertCircle, Wifi, ChevronRight, Gauge, Battery,
  Download, Share2, Map as MapIcon, List,
} from "lucide-react";
import { fetchPackage, subscribeToAlerts, notifyDelivered, type Package as Pkg } from "@/lib/api";

// ─── Route interpolation ──────────────────────────────────────────────────────

function interpolateRoute(waypoints: [number, number][], n: number): [number, number][] {
  if (waypoints.length < 2) return waypoints;
  const dists: number[] = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const [a, b] = waypoints[i - 1], [c, d] = waypoints[i];
    dists.push(dists[i - 1] + Math.sqrt((c - a) ** 2 + (d - b) ** 2));
  }
  const total = dists[dists.length - 1];
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * total;
    let seg = 0;
    for (let j = 1; j < dists.length; j++) { if (dists[j] >= t) { seg = j - 1; break; } seg = j - 1; }
    const len = (dists[seg + 1] ?? dists[seg]) - dists[seg];
    const f = len > 0 ? (t - dists[seg]) / len : 0;
    const [a, b] = waypoints[seg], [c, d] = waypoints[Math.min(seg + 1, waypoints.length - 1)];
    return [a + f * (c - a), b + f * (d - b)] as [number, number];
  });
}

function getBearing(from: [number, number], to: [number, number]): number {
  const dLng = to[1] - from[1];
  const dLat = to[0] - from[0];
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
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
    <svg viewBox="0 0 28 44" width="28" height="44" xmlns="http://www.w3.org/2000/svg" style="position:relative;z-index:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));">
      <!-- body -->
      <rect x="4" y="8" width="20" height="28" rx="5" fill="${bodyColor}"/>
      <!-- cabin roof -->
      <rect x="7" y="14" width="14" height="13" rx="3" fill="#991b1b"/>
      <!-- front windshield -->
      <rect x="8" y="11" width="12" height="4" rx="1.5" fill="rgba(147,210,255,0.55)"/>
      <!-- rear windshield -->
      <rect x="8" y="29" width="12" height="4" rx="1.5" fill="rgba(147,210,255,0.35)"/>
      <!-- front-left wheel -->
      <rect x="1" y="10" width="5" height="8" rx="2" fill="#111"/>
      <rect x="2.5" y="11.5" width="2" height="5" rx="1" fill="#333"/>
      <!-- front-right wheel -->
      <rect x="22" y="10" width="5" height="8" rx="2" fill="#111"/>
      <rect x="23.5" y="11.5" width="2" height="5" rx="1" fill="#333"/>
      <!-- rear-left wheel -->
      <rect x="1" y="26" width="5" height="8" rx="2" fill="#111"/>
      <rect x="2.5" y="27.5" width="2" height="5" rx="1" fill="#333"/>
      <!-- rear-right wheel -->
      <rect x="22" y="26" width="5" height="8" rx="2" fill="#111"/>
      <rect x="23.5" y="27.5" width="2" height="5" rx="1" fill="#333"/>
      <!-- headlights -->
      <rect x="7" y="8" width="5" height="2.5" rx="1" fill="#fde68a" opacity="${headlightOpacity}"/>
      <rect x="16" y="8" width="5" height="2.5" rx="1" fill="#fde68a" opacity="${headlightOpacity}"/>
      <!-- tail lights -->
      <rect x="7" y="33" width="5" height="2.5" rx="1" fill="#ef4444" opacity="0.85"/>
      <rect x="16" y="33" width="5" height="2.5" rx="1" fill="#ef4444" opacity="0.85"/>
      <!-- center hood line -->
      <line x1="14" y1="8" x2="14" y2="14" stroke="#991b1b" stroke-width="0.8" opacity="0.6"/>
      <!-- Tesla T emblem -->
      <rect x="11.5" y="6" width="5" height="1.5" rx="0.7" fill="white" opacity="0.55"/>
      <rect x="13.5" y="7.5" width="1" height="2" rx="0.5" fill="white" opacity="0.55"/>
    </svg>
  </div>`;
}

const TOTAL = 200;
const STEP_MS = 1800;

type MobileTab = "map" | "timeline" | "alerts";

interface Props { code: string; onBack: () => void; onAdmin: () => void; }

// ─── Loading / Not Found ──────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white items-center justify-center gap-4">
      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
      <p className="text-xs text-white/30">Looking up tracking code…</p>
    </div>
  );
}

function NotFoundScreen({ code, onBack }: { code: string; onBack: () => void }) {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-white items-center justify-center gap-5 px-6 text-center">
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

// ─── Shell (async fetch wrapper) ──────────────────────────────────────────────

export default function TrackingResult({ code, onBack, onAdmin }: Props) {
  const [pkg, setPkg] = useState<Pkg | null | "loading">("loading");
  useEffect(() => { fetchPackage(code).then(setPkg); }, [code]);
  if (pkg === "loading") return <LoadingScreen />;
  if (pkg === null) return <NotFoundScreen code={code} onBack={onBack} />;
  return <TrackingView pkg={pkg} code={code} onBack={onBack} onAdmin={onAdmin} />;
}

// ─── Timeline panel content ───────────────────────────────────────────────────

function TimelinePanel({ pkg, code, progress, simSpeed, secsAgo, getProgressGradient }: {
  pkg: Pkg; code: string; progress: number; simSpeed: number; secsAgo: number;
  getProgressGradient: () => string;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ETA + route */}
      <div className="p-5 border-b border-white/6 flex-shrink-0">
        <div className="mb-3">
          <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Estimated Arrival</div>
          <div className="text-sm font-semibold text-white/90">{pkg.eta}</div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/35 mb-4 flex-wrap">
          <MapPin className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
          <span>{pkg.origin}</span>
          <ChevronRight className="w-3 h-3 text-white/12 flex-shrink-0" />
          <MapPin className="w-2.5 h-2.5 text-blue-500/50 flex-shrink-0" />
          <span>{pkg.destination}</span>
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

      {/* Live mini-stats */}
      <div className="p-4 border-b border-white/6 grid grid-cols-3 gap-2 flex-shrink-0">
        {[
          { icon: Navigation, val: `${simSpeed}`, sub: "km/h", color: "text-red-500/70" },
          { icon: Clock, val: `${secsAgo}s`, sub: "ago", color: "text-white/20" },
          { icon: Gauge, val: pkg.weight, sub: "weight", color: "text-white/20" },
        ].map(({ icon: Icon, val, sub, color }) => (
          <div key={sub} className="text-center">
            <Icon className={`w-3 h-3 ${color} mx-auto mb-1`} />
            <div className="text-xs font-mono text-white/70 tabular-nums">{val}</div>
            <div className="text-[8px] text-white/20">{sub}</div>
          </div>
        ))}
      </div>

      {/* Package meta */}
      <div className="p-4 border-b border-white/6 grid grid-cols-2 gap-3 flex-shrink-0">
        {[
          { label: "Carrier", value: pkg.carrier },
          { label: "Code", value: code },
          { label: "From", value: pkg.origin },
          { label: "To", value: pkg.destination },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">{label}</div>
            <div className="text-[10px] text-white/55 truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 p-5">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Event Timeline</div>
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

// ─── Notifications panel content ──────────────────────────────────────────────

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
      {/* Email subscribe */}
      <div className="p-4 border-b border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Notifications</div>
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

      {/* Recent alerts */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Recent Alerts</div>
        <div className="space-y-2">
          {pkg.events.filter((e) => e.done).slice(0, 4).map((ev, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-white/3 border border-white/5">
              <div className="text-[10px] text-white/55 mb-0.5">{ev.label}</div>
              <div className="text-[9px] text-white/22">{ev.location}{ev.time_label ? ` · ${ev.time_label}` : ""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live stats */}
      <div className="p-4 border-t border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/20 uppercase tracking-widest mb-3">Live Stats</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Gauge, label: "Speed", value: `${simSpeed} km/h` },
            { icon: Wifi, label: "Signal", value: playing ? "Live" : "Paused" },
            { icon: Battery, label: "Events", value: pkg.events.filter((e) => e.done).length.toString() },
            { icon: Clock, label: "Updated", value: `${secsAgo}s` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/3 rounded-lg p-2 text-center">
              <Icon className="w-3 h-3 text-white/18 mx-auto mb-1" />
              <div className="text-[10px] font-light text-white/55 tabular-nums">{value}</div>
              <div className="text-[8px] text-white/18">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/6 space-y-2 flex-shrink-0">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
          <Download className="w-3.5 h-3.5" /> Download receipt
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
          <Share2 className="w-3.5 h-3.5" /> Share tracking
        </button>
      </div>
    </div>
  );
}

// ─── Main tracking view ───────────────────────────────────────────────────────

function TrackingView({ pkg, code, onBack, onAdmin }: { pkg: Pkg; code: string; onBack: () => void; onAdmin: () => void }) {
  const route = pkg.route as [number, number][];
  const fullPath = interpolateRoute(route, TOTAL);
  const startIdx = Math.min(Math.floor(pkg.start_progress * (TOTAL - 1)), TOTAL - 1);

  const [posIdx, setPosIdx] = useState(startIdx);
  const [playing, setPlaying] = useState(pkg.status !== "Delivered");
  const [secsAgo, setSecsAgo] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const deliveryFiredRef = useRef(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const donePolyRef = useRef<L.Polyline | null>(null);
  const remainPolyRef = useRef<L.Polyline | null>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => { setCurrentTime(new Date()); setSecsAgo((s) => s + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  // Advance position + auto-fire delivery email
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

  // Update map overlays + rotate car to face direction of travel
  useEffect(() => {
    const pos = fullPath[posIdx];
    if (!pos) return;
    vehicleMarkerRef.current?.setLatLng(pos);
    donePolyRef.current?.setLatLngs(fullPath.slice(0, posIdx + 1));
    remainPolyRef.current?.setLatLngs(fullPath.slice(posIdx));

    // Recalculate bearing and refresh icon
    const next = fullPath[Math.min(posIdx + 1, TOTAL - 1)];
    const prev = fullPath[Math.max(posIdx - 1, 0)];
    const bearing = posIdx < TOTAL - 1 ? getBearing(pos, next) : getBearing(prev, pos);
    const isMoving = playing && posIdx < TOTAL - 1;
    vehicleMarkerRef.current?.setIcon(
      L.divIcon({ html: vehicleMarkerHtml(isMoving, bearing), className: "", iconSize: [28, 44], iconAnchor: [14, 22] })
    );
  }, [posIdx, playing]);

  // Pan map
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const pos = fullPath[posIdx];
    if (pos) mapInstanceRef.current.panTo(pos, { animate: true, duration: 1.5, easeLinearity: 0.1 });
  }, [posIdx]);

  // Invalidate map size when tab switches to map
  useEffect(() => {
    if (mobileTab === "map" && mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
    }
  }, [mobileTab]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const initPos = fullPath[startIdx];
    const map = L.map(mapRef.current, { center: initPos, zoom: 9, zoomControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    donePolyRef.current = L.polyline(fullPath.slice(0, startIdx + 1), { color: "#dc2626", weight: 3, opacity: 0.85 }).addTo(map);
    remainPolyRef.current = L.polyline(fullPath.slice(startIdx), { color: "#3b82f6", weight: 2.5, opacity: 0.35, dashArray: "8 6" }).addTo(map);

    L.marker(fullPath[0], {
      icon: L.divIcon({ html: `<div style="width:10px;height:10px;background:#444;border:2px solid #777;border-radius:50%;"></div>`, className: "", iconSize: [10, 10], iconAnchor: [5, 5] }),
    }).addTo(map).bindPopup(`<b>Origin</b><br>${pkg.origin}`);

    L.marker(fullPath[TOTAL - 1], {
      icon: L.divIcon({ html: `<div style="width:13px;height:13px;background:#3b82f6;border:2px solid #60a5fa;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.7);"></div>`, className: "", iconSize: [13, 13], iconAnchor: [6.5, 6.5] }),
    }).addTo(map).bindPopup(`<b>Destination</b><br>${pkg.destination}`);

    const initNext = fullPath[Math.min(startIdx + 1, TOTAL - 1)];
    const initBearing = startIdx < TOTAL - 1 ? getBearing(initPos, initNext) : 0;
    vehicleMarkerRef.current = L.marker(initPos, {
      icon: L.divIcon({
        html: vehicleMarkerHtml(pkg.status !== "Delivered", initBearing),
        className: "",
        iconSize: [28, 44],
        iconAnchor: [14, 22],
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
    <div className="flex flex-col bg-[#0a0a0a] text-white overflow-hidden animate-fade-in" style={{ height: "100dvh" }}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════════ */}
      <header className="flex-shrink-0 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm z-20">

        {/* Top row — always visible */}
        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Left: back + logo */}
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex-shrink-0 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-4 bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <svg viewBox="0 0 100 120" className="w-4 h-5 text-red-600 flex-shrink-0" fill="none">
                <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                  stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-semibold tracking-widest uppercase text-white/70 hidden sm:inline">
                Tesla<span className="text-red-500">Track</span>
              </span>
            </div>
            <div className="w-px h-4 bg-white/10 flex-shrink-0 hidden sm:block" />
            <code className="text-xs font-mono text-white/40 truncate max-w-[120px] sm:max-w-none">{code}</code>
          </div>

          {/* Right: status + clock + admin */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${getStatusColor()}`}>
              {!isDelivered && playing && (
                <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"
                  style={{ animation: "pulse-live 1.5s ease-in-out infinite" }} />
              )}
              <span className="hidden xs:inline">{isDelivered ? "Delivered" : pkg.status}</span>
              <span className="xs:hidden">{isDelivered ? "✓" : "●"}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-white/25">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-xs font-mono tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <button onClick={onAdmin}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors px-2 py-1 rounded border border-white/6 hover:border-white/12">
              Admin
            </button>
          </div>
        </div>

        {/* Controls row — visible when on map tab or on desktop */}
        {pkg.status !== "Delivered" && (
          <div className={`px-4 pb-2 flex items-center gap-2 ${mobileTab !== "map" ? "hidden md:flex" : "flex"}`}>
            <div className="flex items-center gap-1 bg-white/4 rounded-lg border border-white/8 p-0.5">
              <button onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/8 transition-colors text-white/50 hover:text-white/80">
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="text-[10px]">{playing ? "Pause" : "Play"}</span>
              </button>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/8 transition-colors text-white/50 hover:text-white/80">
                <RotateCcw className="w-3 h-3" />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>
            <div className="h-4 w-px bg-white/8" />
            <div className="flex items-center gap-3 text-[10px] text-white/30">
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-red-400/60" />{simSpeed} km/h
              </span>
              <span>{progress}% complete</span>
              <span className="hidden sm:inline">ETA: {pkg.eta}</span>
            </div>
          </div>
        )}
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─ Desktop left panel (timeline) — hidden on mobile ─ */}
        <aside className="hidden md:flex w-72 bg-[#0c0c0c] border-r border-white/6 flex-col flex-shrink-0">
          <TimelinePanel pkg={pkg} code={code} progress={progress} simSpeed={simSpeed}
            secsAgo={secsAgo} getProgressGradient={getProgressGradient} />
        </aside>

        {/* ─ Map — always rendered, hidden by display when mobile non-map tab ─ */}
        <div className={`flex-1 relative ${mobileTab !== "map" ? "hidden md:block" : "block"}`}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Live badge */}
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-1.5 flex items-center gap-2">
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

          {/* Legend */}
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className="w-5 h-0.5 bg-red-600 rounded" />
              <span className="text-[9px] text-white/35">Done</span>
            </div>
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <div className="w-5 h-0.5 rounded" style={{ backgroundImage: "repeating-linear-gradient(to right,#3b82f6 0,#3b82f6 4px,transparent 4px,transparent 8px)" }} />
              <span className="text-[9px] text-white/35">Remaining</span>
            </div>
          </div>

          {/* Progress ticker */}
          {!isDelivered && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-max max-w-[calc(100vw-2rem)]">
              <div className="bg-black/85 backdrop-blur border border-white/8 rounded-xl px-4 py-2 flex items-center gap-3 flex-wrap justify-center">
                {[
                  { label: "Progress", value: `${progress}%`, cls: "text-white/80" },
                  { label: "Speed", value: `${simSpeed} km/h`, cls: "text-red-400" },
                  { label: "Updated", value: `${secsAgo}s ago`, cls: "text-white/80" },
                  { label: "ETA", value: pkg.eta, cls: "text-white/80" },
                ].map(({ label, value, cls }, i, arr) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-[9px] text-white/25 mb-0.5">{label}</div>
                      <div className={`text-xs font-mono font-semibold ${cls}`}>{value}</div>
                    </div>
                    {i < arr.length - 1 && <div className="w-px h-6 bg-white/8 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivered banner */}
          {isDelivered && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-green-600/15 backdrop-blur border border-green-500/30 rounded-xl px-5 py-2.5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-green-300">Package Delivered</div>
                  <div className="text-[10px] text-green-400/60">{pkg.eta}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─ Mobile: Timeline tab content ─ */}
        {mobileTab === "timeline" && (
          <div className="md:hidden flex-1 bg-[#0c0c0c] overflow-hidden">
            <TimelinePanel pkg={pkg} code={code} progress={progress} simSpeed={simSpeed}
              secsAgo={secsAgo} getProgressGradient={getProgressGradient} />
          </div>
        )}

        {/* ─ Mobile: Alerts tab content ─ */}
        {mobileTab === "alerts" && (
          <div className="md:hidden flex-1 bg-[#0c0c0c] overflow-hidden">
            <NotificationsPanel pkg={pkg} trackingCode={code} simSpeed={simSpeed}
              secsAgo={secsAgo} playing={playing} />
          </div>
        )}

        {/* ─ Desktop right panel (notifications) — hidden on mobile ─ */}
        <aside className="hidden md:flex w-60 bg-[#0c0c0c] border-l border-white/6 flex-col flex-shrink-0">
          <NotificationsPanel pkg={pkg} trackingCode={code} simSpeed={simSpeed}
            secsAgo={secsAgo} playing={playing} />
        </aside>
      </div>

      {/* ══ MOBILE BOTTOM TAB BAR ════════════════════════════════════════════════ */}
      <nav className="md:hidden flex-shrink-0 flex items-stretch border-t border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm">
        {([
          { id: "map", label: "Map", icon: MapIcon },
          { id: "timeline", label: "Timeline", icon: List },
          { id: "alerts", label: "Alerts", icon: Bell },
        ] as { id: MobileTab; label: string; icon: typeof MapIcon }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              mobileTab === id
                ? "text-red-400 border-t-2 border-red-600 -mt-px"
                : "text-white/25 hover:text-white/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] tracking-wide">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
