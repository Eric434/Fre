import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Circle,
  MapPin,
  Clock,
  Bell,
  BellOff,
  Wifi,
  Battery,
  Gauge,
  ChevronRight,
  Download,
  Share2,
  Play,
  Pause,
  RotateCcw,
  Navigation,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PkgData {
  status: string;
  eta: string;
  startProgress: number;   // 0–1, where the dot starts on load
  from: string;
  to: string;
  carrier: string;
  weight: string;
  route: [number, number][];
  events: { time: string; label: string; location: string; done: boolean }[];
  speedKph: number;         // simulated speed label
}

// ─── Package database ─────────────────────────────────────────────────────────

const PACKAGE_DATA: Record<string, PkgData> = {
  "TSL-2847-XK": {
    status: "Out for Delivery",
    eta: "Today, 4–7 PM",
    startProgress: 0.55,
    from: "San Jose, CA",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "2.4 kg",
    speedKph: 72,
    route: [
      [37.3382, -121.8863],
      [37.4000, -121.9200],
      [37.4500, -121.9500],
      [37.5100, -121.9700],
      [37.5500, -121.9800],
      [37.5900, -122.0500],
      [37.6300, -122.1200],
      [37.6800, -122.1900],
      [37.7200, -122.2700],
      [37.7500, -122.3500],
      [37.7749, -122.4194],
    ],
    events: [
      { time: "10:42 AM", label: "Out for delivery", location: "SF Distribution Hub", done: true },
      { time: "07:18 AM", label: "Arrived at local facility", location: "Oakland, CA", done: true },
      { time: "Yesterday 11:30 PM", label: "Departed origin facility", location: "San Jose, CA", done: true },
      { time: "Yesterday 6:00 PM", label: "Package received", location: "San Jose, CA", done: true },
      { time: "2 days ago", label: "Order dispatched", location: "Merchant", done: true },
    ],
  },
  "TSL-9031-MZ": {
    status: "In Transit",
    eta: "Tomorrow, 9 AM–12 PM",
    startProgress: 0.32,
    from: "Los Angeles, CA",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "5.1 kg",
    speedKph: 105,
    route: [
      [34.0522, -118.2437],
      [34.6000, -118.6000],
      [35.2000, -119.0000],
      [35.6500, -119.3000],
      [35.9000, -119.5000],
      [36.3000, -119.8000],
      [36.7000, -120.1000],
      [37.1000, -120.6000],
      [37.4000, -121.1000],
      [37.6000, -121.9000],
      [37.7749, -122.4194],
    ],
    events: [
      { time: "2:15 PM", label: "In transit — on schedule", location: "Bakersfield, CA", done: true },
      { time: "9:00 AM", label: "Departed facility", location: "Los Angeles, CA", done: true },
      { time: "Yesterday 8:00 PM", label: "Package received", location: "Los Angeles, CA", done: true },
      { time: "3 days ago", label: "Order placed", location: "Merchant", done: true },
      { time: "", label: "Out for delivery", location: "San Francisco, CA", done: false },
      { time: "", label: "Delivered", location: "San Francisco, CA", done: false },
    ],
  },
  "TSL-5512-BR": {
    status: "Delivered",
    eta: "Delivered at 2:34 PM",
    startProgress: 1.0,
    from: "Portland, OR",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "0.8 kg",
    speedKph: 0,
    route: [
      [45.5051, -122.675],
      [44.0000, -122.3000],
      [42.8000, -122.0000],
      [41.5000, -122.1500],
      [40.3000, -122.3000],
      [39.2000, -122.4000],
      [38.5000, -122.5000],
      [38.0000, -122.4800],
      [37.7749, -122.4194],
    ],
    events: [
      { time: "2:34 PM", label: "Delivered — front door", location: "San Francisco, CA", done: true },
      { time: "9:12 AM", label: "Out for delivery", location: "SF Distribution Hub", done: true },
      { time: "Yesterday 5:00 AM", label: "Arrived at local facility", location: "SF, CA", done: true },
      { time: "2 days ago", label: "In transit", location: "Redding, CA", done: true },
      { time: "3 days ago", label: "Departed origin", location: "Portland, OR", done: true },
    ],
  },
};

const FALLBACK: PkgData = {
  status: "Processing",
  eta: "Estimating…",
  startProgress: 0.02,
  from: "Origin",
  to: "Destination",
  carrier: "Tesla Express",
  weight: "—",
  speedKph: 0,
  route: [[37.3382, -121.8863], [37.7749, -122.4194]],
  events: [
    { time: "Just now", label: "Tracking code activated", location: "System", done: true },
    { time: "", label: "Processing at origin", location: "TBD", done: false },
    { time: "", label: "In transit", location: "TBD", done: false },
    { time: "", label: "Out for delivery", location: "TBD", done: false },
    { time: "", label: "Delivered", location: "TBD", done: false },
  ],
};

// ─── Route interpolation ──────────────────────────────────────────────────────

/** Generate N evenly-spaced points along a polyline of waypoints */
function interpolateRoute(waypoints: [number, number][], totalPoints: number): [number, number][] {
  if (waypoints.length < 2) return waypoints;

  // Compute cumulative segment lengths
  const dists: number[] = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const [lat1, lng1] = waypoints[i - 1];
    const [lat2, lng2] = waypoints[i];
    const d = Math.sqrt((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2);
    dists.push(dists[i - 1] + d);
  }
  const total = dists[dists.length - 1];

  const result: [number, number][] = [];
  for (let i = 0; i < totalPoints; i++) {
    const target = (i / (totalPoints - 1)) * total;
    // Find which segment we're in
    let seg = 0;
    for (let j = 1; j < dists.length; j++) {
      if (dists[j] >= target) { seg = j - 1; break; }
      seg = j - 1;
    }
    const segStart = dists[seg];
    const segEnd = dists[seg + 1] ?? dists[seg];
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (target - segStart) / segLen : 0;
    const [lat1, lng1] = waypoints[seg];
    const [lat2, lng2] = waypoints[Math.min(seg + 1, waypoints.length - 1)];
    result.push([lat1 + t * (lat2 - lat1), lng1 + t * (lng2 - lng1)]);
  }
  return result;
}

// ─── Marker HTML ──────────────────────────────────────────────────────────────

function vehicleMarkerHtml(size = 18) {
  return `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        position:absolute;inset:0;
        background:rgba(220,38,38,0.25);
        border-radius:50%;
        animation:ping-live 1.6s cubic-bezier(0,0,0.2,1) infinite;
      "></div>
      <div style="
        position:absolute;inset:3px;
        background:#dc2626;
        border:2px solid #ff6666;
        border-radius:50%;
        box-shadow:0 0 10px rgba(220,38,38,0.9);
      "></div>
    </div>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TOTAL_POINTS = 200;
const STEP_INTERVAL_MS = 1800; // advance every 1.8 s

interface Props {
  code: string;
  onBack: () => void;
}

export default function TrackingResult({ code, onBack }: Props) {
  const pkg = PACKAGE_DATA[code] ?? FALLBACK;

  // Dense interpolated path
  const fullPath = interpolateRoute(pkg.route, TOTAL_POINTS);
  const startIdx = Math.min(
    Math.floor(pkg.startProgress * (TOTAL_POINTS - 1)),
    TOTAL_POINTS - 1
  );

  // Simulator state
  const [posIdx, setPosIdx] = useState(startIdx);
  const [playing, setPlaying] = useState(pkg.status !== "Delivered");
  const [secsAgo, setSecsAgo] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const donePolylineRef = useRef<L.Polyline | null>(null);
  const remainPolylineRef = useRef<L.Polyline | null>(null);

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date());
      setSecsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Advance position ──
  useEffect(() => {
    if (!playing || posIdx >= TOTAL_POINTS - 1) return;
    const t = setInterval(() => {
      setPosIdx((i) => {
        const next = Math.min(i + 1, TOTAL_POINTS - 1);
        return next;
      });
      setSecsAgo(0);
    }, STEP_INTERVAL_MS);
    return () => clearInterval(t);
  }, [playing, posIdx]);

  // ── Update map elements when posIdx changes ──
  useEffect(() => {
    const pos = fullPath[posIdx];
    if (!pos) return;

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng(pos);
    }

    const done = fullPath.slice(0, posIdx + 1);
    const remain = fullPath.slice(posIdx);

    if (donePolylineRef.current) donePolylineRef.current.setLatLngs(done);
    if (remainPolylineRef.current) remainPolylineRef.current.setLatLngs(remain);
  }, [posIdx]);

  // ── Initialise map once ──
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initPos = fullPath[startIdx];
    const map = L.map(mapRef.current, {
      center: initPos,
      zoom: 9,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Done polyline (red solid)
    const done = fullPath.slice(0, startIdx + 1);
    const donePolyline = L.polyline(done, {
      color: "#dc2626",
      weight: 3,
      opacity: 0.85,
    }).addTo(map);
    donePolylineRef.current = donePolyline;

    // Remaining polyline (blue dashed)
    const remain = fullPath.slice(startIdx);
    const remainPolyline = L.polyline(remain, {
      color: "#3b82f6",
      weight: 2.5,
      opacity: 0.35,
      dashArray: "8 6",
    }).addTo(map);
    remainPolylineRef.current = remainPolyline;

    // Origin marker
    L.marker(fullPath[0], {
      icon: L.divIcon({
        html: `<div style="width:10px;height:10px;background:#444;border:2px solid #777;border-radius:50%;"></div>`,
        className: "",
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    }).addTo(map).bindPopup(`<b>Origin</b><br>${pkg.from}`);

    // Destination marker
    L.marker(fullPath[TOTAL_POINTS - 1], {
      icon: L.divIcon({
        html: `<div style="width:13px;height:13px;background:#3b82f6;border:2px solid #60a5fa;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.7);"></div>`,
        className: "",
        iconSize: [13, 13],
        iconAnchor: [6.5, 6.5],
      }),
    }).addTo(map).bindPopup(`<b>Destination</b><br>${pkg.to}`);

    // Vehicle marker
    const vehicleMarker = L.marker(initPos, {
      icon: L.divIcon({
        html: vehicleMarkerHtml(22),
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      zIndexOffset: 1000,
    }).addTo(map).bindPopup(`<b>${pkg.status}</b>`);
    vehicleMarkerRef.current = vehicleMarker;

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      vehicleMarkerRef.current = null;
      donePolylineRef.current = null;
      remainPolylineRef.current = null;
    };
  }, []);

  // ── Pan map to follow vehicle ──
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const pos = fullPath[posIdx];
    if (pos) {
      mapInstanceRef.current.panTo(pos, { animate: true, duration: 1.5, easeLinearity: 0.1 });
    }
  }, [posIdx]);

  const handleReset = useCallback(() => {
    setPosIdx(startIdx);
    setSecsAgo(0);
    setPlaying(true);
  }, [startIdx]);

  const progress = Math.round((posIdx / (TOTAL_POINTS - 1)) * 100);
  const isDelivered = posIdx >= TOTAL_POINTS - 1;
  const simSpeed = isDelivered ? 0 : playing ? pkg.speedKph : 0;

  const getStatusColor = () => {
    if (isDelivered || pkg.status === "Delivered") return "text-green-400 bg-green-500/10 border-green-500/20";
    if (pkg.status === "Out for Delivery") return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };

  const getProgressGradient = () => {
    if (isDelivered || pkg.status === "Delivered") return "from-green-600 to-green-400";
    if (pkg.status === "Out for Delivery") return "from-red-600 via-orange-500 to-blue-500";
    return "from-red-600 to-yellow-500";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden animate-fade-in">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 120" className="w-4 h-5 text-red-600" fill="none">
              <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/70">
              Tesla<span className="text-red-500">Track</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-white/25" />
            <code className="text-xs font-mono text-white/45">{code}</code>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border ${getStatusColor()}`}>
            {!isDelivered && playing && (
              <span className="w-1.5 h-1.5 rounded-full bg-current"
                style={{ animation: "pulse-live 1.5s ease-in-out infinite" }} />
            )}
            {isDelivered ? "Delivered" : pkg.status}
          </div>

          {/* Playback controls */}
          {pkg.status !== "Delivered" && (
            <div className="flex items-center gap-1 bg-white/4 rounded-lg border border-white/8 p-0.5">
              <button
                onClick={() => setPlaying((p) => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/8 transition-colors text-white/50 hover:text-white/80"
                title={playing ? "Pause" : "Play"}
              >
                {playing
                  ? <Pause className="w-3 h-3" />
                  : <Play className="w-3 h-3" />}
                <span className="text-[10px]">{playing ? "Pause" : "Play"}</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/8 transition-colors text-white/50 hover:text-white/80"
                title="Restart"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-white/25">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs font-mono">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel — Timeline ── */}
        <aside className="w-72 bg-[#0c0c0c] border-r border-white/6 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-5 border-b border-white/6">
            <div className="mb-3">
              <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Estimated Arrival</div>
              <div className="text-sm font-semibold text-white/90">{pkg.eta}</div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/35 mb-4">
              <MapPin className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
              {pkg.from}
              <ChevronRight className="w-3 h-3 text-white/12 flex-shrink-0" />
              <MapPin className="w-2.5 h-2.5 text-blue-500/50 flex-shrink-0" />
              {pkg.to}
            </div>

            {/* Live progress bar */}
            <div>
              <div className="flex justify-between text-[9px] text-white/25 mb-1.5">
                <span>Origin</span>
                <span className="text-white/50 font-mono font-medium">{progress}%</span>
                <span>Destination</span>
              </div>
              <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getProgressGradient()} rounded-full`}
                  style={{ width: `${progress}%`, transition: "width 1.6s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </div>
            </div>
          </div>

          {/* Live position stats */}
          <div className="p-4 border-b border-white/6 grid grid-cols-3 gap-2">
            <div className="text-center">
              <Navigation className="w-3 h-3 text-red-500/70 mx-auto mb-1" />
              <div className="text-xs font-mono text-white/70 tabular-nums">{simSpeed}</div>
              <div className="text-[8px] text-white/20">km/h</div>
            </div>
            <div className="text-center">
              <Clock className="w-3 h-3 text-white/20 mx-auto mb-1" />
              <div className="text-xs font-mono text-white/70 tabular-nums">{secsAgo}s</div>
              <div className="text-[8px] text-white/20">ago</div>
            </div>
            <div className="text-center">
              <Gauge className="w-3 h-3 text-white/20 mx-auto mb-1" />
              <div className="text-xs font-mono text-white/70">{pkg.weight}</div>
              <div className="text-[8px] text-white/20">weight</div>
            </div>
          </div>

          {/* Package meta */}
          <div className="p-4 border-b border-white/6 grid grid-cols-2 gap-3">
            {[
              { label: "Carrier", value: pkg.carrier },
              { label: "Code", value: code },
              { label: "From", value: pkg.from },
              { label: "To", value: pkg.to },
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
                      {ev.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 bg-[#0c0c0c]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-white/12 bg-[#0c0c0c]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs mb-0.5 ${ev.done ? "text-white/65" : "text-white/18"}`}>
                        {ev.label}
                      </div>
                      <div className="text-[9px] text-white/22">{ev.location}</div>
                      {ev.time && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-2 h-2 text-white/15" />
                          <span className="text-[9px] font-mono text-white/20">{ev.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Top-left: live badge */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full bg-red-600"
                style={{
                  boxShadow: playing && !isDelivered ? "0 0 8px rgba(220,38,38,0.9)" : "none",
                  animation: playing && !isDelivered ? "pulse-live 1.4s ease-in-out infinite" : "none",
                }}
              />
              <span className="text-xs text-white/55">
                {isDelivered ? "Delivered" : playing ? `Live · ${simSpeed} km/h` : "Paused"}
              </span>
            </div>
          </div>

          {/* Top-right: legend */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-600 rounded" />
              <span className="text-[9px] text-white/35">Completed</span>
            </div>
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-500/50 rounded" style={{ backgroundImage: "repeating-linear-gradient(to right, #3b82f6 0, #3b82f6 4px, transparent 4px, transparent 8px)" }} />
              <span className="text-[9px] text-white/35">Remaining</span>
            </div>
          </div>

          {/* Bottom-center: progress ticker */}
          {!isDelivered && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-black/85 backdrop-blur border border-white/8 rounded-xl px-5 py-2.5 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[9px] text-white/25 mb-0.5">Progress</div>
                  <div className="text-sm font-mono font-semibold text-white/80">{progress}%</div>
                </div>
                <div className="w-px h-8 bg-white/8" />
                <div className="text-center">
                  <div className="text-[9px] text-white/25 mb-0.5">Speed</div>
                  <div className="text-sm font-mono font-semibold text-red-400">{simSpeed} km/h</div>
                </div>
                <div className="w-px h-8 bg-white/8" />
                <div className="text-center">
                  <div className="text-[9px] text-white/25 mb-0.5">Updated</div>
                  <div className="text-sm font-mono font-semibold text-white/80">{secsAgo}s ago</div>
                </div>
                <div className="w-px h-8 bg-white/8" />
                <div className="text-center">
                  <div className="text-[9px] text-white/25 mb-0.5">ETA</div>
                  <div className="text-sm font-semibold text-white/80">{pkg.eta}</div>
                </div>
              </div>
            </div>
          )}

          {/* Delivered banner */}
          {isDelivered && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-green-600/15 backdrop-blur border border-green-500/30 rounded-xl px-6 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-300">Package Delivered</div>
                  <div className="text-[10px] text-green-400/60">{pkg.eta}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel — Notifications ── */}
        <aside className="w-60 bg-[#0c0c0c] border-l border-white/6 flex flex-col flex-shrink-0">
          {/* Email alerts */}
          <NotificationPanel pkg={pkg} events={pkg.events} />

          {/* Actions */}
          <div className="p-4 border-t border-white/6 space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
              <Download className="w-3.5 h-3.5" /> Download receipt
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share tracking
            </button>
          </div>

          {/* Live stats grid */}
          <div className="p-4 border-t border-white/6">
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
        </aside>
      </div>
    </div>
  );
}

// ─── Notification sub-component (keeps parent clean) ──────────────────────────

function NotificationPanel({ events }: { pkg: PkgData; events: PkgData["events"] }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [showInput, setShowInput] = useState(false);

  return (
    <>
      <div className="p-4 border-b border-white/6 flex-shrink-0">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Notifications</div>
        {!subscribed ? (
          <>
            <p className="text-[10px] text-white/30 leading-relaxed mb-4">
              Get notified the moment your package status changes.
            </p>
            {!showInput ? (
              <button
                onClick={() => setShowInput(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium transition-all"
              >
                <Bell className="w-3.5 h-3.5" /> Enable Alerts
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-red-600/40"
                />
                <button
                  onClick={() => setSubscribed(true)}
                  disabled={!email.includes("@")}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-medium transition-all"
                >
                  Subscribe
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-1">
            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-[10px] text-green-400 font-medium">Alerts enabled!</p>
            <p className="text-[9px] text-white/25 mt-1 break-all">{email}</p>
            <button
              onClick={() => { setSubscribed(false); setShowInput(false); setEmail(""); }}
              className="mt-3 flex items-center gap-1 text-[9px] text-white/18 hover:text-white/40 transition-colors mx-auto"
            >
              <BellOff className="w-2.5 h-2.5" /> Unsubscribe
            </button>
          </div>
        )}
      </div>

      {/* Alert log */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Recent Alerts</div>
        <div className="space-y-2">
          {events.filter((e) => e.done).slice(0, 4).map((ev, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-white/3 border border-white/5">
              <div className="text-[10px] text-white/55 mb-0.5">{ev.label}</div>
              <div className="text-[9px] text-white/22">{ev.location}{ev.time ? ` · ${ev.time}` : ""}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
