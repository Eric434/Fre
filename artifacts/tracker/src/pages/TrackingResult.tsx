import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

const PACKAGE_DATA: Record<string, {
  status: string;
  eta: string;
  progress: number;
  from: string;
  to: string;
  carrier: string;
  weight: string;
  coords: [number, number];
  route: [number, number][];
  events: { time: string; label: string; location: string; done: boolean }[];
}> = {
  "TSL-2847-XK": {
    status: "Out for Delivery",
    eta: "Today, 4–7 PM",
    progress: 78,
    from: "San Jose, CA",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "2.4 kg",
    coords: [37.55, -121.98],
    route: [
      [37.3382, -121.8863],
      [37.42, -121.93],
      [37.51, -121.97],
      [37.55, -121.98],
      [37.62, -122.1],
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
    progress: 45,
    from: "Los Angeles, CA",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "5.1 kg",
    coords: [35.9, -119.5],
    route: [
      [34.0522, -118.2437],
      [35.2, -119.0],
      [35.9, -119.5],
      [36.7, -120.1],
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
    progress: 100,
    from: "Portland, OR",
    to: "San Francisco, CA",
    carrier: "Tesla Express",
    weight: "0.8 kg",
    coords: [37.7749, -122.4194],
    route: [
      [45.5051, -122.675],
      [42.8, -122.0],
      [40.3, -122.3],
      [38.5, -122.5],
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

const FALLBACK = {
  status: "Processing",
  eta: "Estimating…",
  progress: 5,
  from: "Origin",
  to: "Destination",
  carrier: "Tesla Express",
  weight: "—",
  coords: [37.7749, -122.4194] as [number, number],
  route: [[37.7749, -122.4194]] as [number, number][],
  events: [
    { time: "Just now", label: "Tracking code activated", location: "System", done: true },
    { time: "", label: "Processing at origin", location: "TBD", done: false },
    { time: "", label: "In transit", location: "TBD", done: false },
    { time: "", label: "Out for delivery", location: "TBD", done: false },
    { time: "", label: "Delivered", location: "TBD", done: false },
  ],
};

interface Props {
  code: string;
  onBack: () => void;
}

export default function TrackingResult({ code, onBack }: Props) {
  const pkg = PACKAGE_DATA[code] ?? FALLBACK;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [notifEmail, setNotifEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: pkg.coords,
      zoom: 9,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    if (pkg.route.length > 1) {
      const done = pkg.route.slice(0, Math.ceil(pkg.route.length * (pkg.progress / 100)));
      const remaining = pkg.route.slice(Math.ceil(pkg.route.length * (pkg.progress / 100)) - 1);

      if (done.length > 1) {
        L.polyline(done, {
          color: "#dc2626",
          weight: 3,
          opacity: 0.85,
        }).addTo(map);
      }

      if (remaining.length > 1) {
        L.polyline(remaining, {
          color: "#3b82f6",
          weight: 2.5,
          opacity: 0.4,
          dashArray: "8 6",
        }).addTo(map);
      }
    }

    const origin = pkg.route[0];
    const dest = pkg.route[pkg.route.length - 1];

    L.marker(origin, {
      icon: L.divIcon({
        html: `<div style="width:10px;height:10px;background:#555;border:2px solid #888;border-radius:50%;"></div>`,
        className: "",
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    }).addTo(map).bindPopup(`<b>Origin</b><br>${pkg.from}`);

    L.marker(dest, {
      icon: L.divIcon({
        html: `<div style="width:12px;height:12px;background:#3b82f6;border:2px solid #60a5fa;border-radius:50%;"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    }).addTo(map).bindPopup(`<b>Destination</b><br>${pkg.to}`);

    L.marker(pkg.coords, {
      icon: L.divIcon({
        html: `<div style="
          width:16px;height:16px;
          background:#dc2626;
          border:2.5px solid #ff4444;
          border-radius:50%;
          box-shadow:0 0 12px rgba(220,38,38,0.8);
          animation: pulse-red 2s infinite;
        "></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    }).addTo(map).bindPopup(`<b>${pkg.status}</b>`);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const getStatusColor = () => {
    if (pkg.status === "Delivered") return "text-green-400 bg-green-500/10 border-green-500/20";
    if (pkg.status === "Out for Delivery") return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
  };

  const getProgressColor = () => {
    if (pkg.status === "Delivered") return "from-green-600 to-green-400";
    if (pkg.status === "Out for Delivery") return "from-red-600 via-orange-500 to-blue-500";
    return "from-red-600 to-yellow-500";
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm z-20 flex-shrink-0">
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-white/30" />
            <code className="text-xs font-mono text-white/50">{code}</code>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border ${getStatusColor()}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {pkg.status}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/25">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="font-mono">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Timeline */}
        <aside className="w-72 bg-[#0c0c0c] border-r border-white/6 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Package info */}
          <div className="p-5 border-b border-white/6">
            <div className="mb-4">
              <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Estimated Arrival</div>
              <div className="text-base font-semibold text-white/90">{pkg.eta}</div>
            </div>
            <div className="flex gap-3 text-[10px] text-white/40 mb-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-white/25" />
                {pkg.from}
              </div>
              <ChevronRight className="w-3 h-3 text-white/15" />
              <div className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-blue-500/60" />
                {pkg.to}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[9px] text-white/25 mb-1.5">
                <span>Origin</span>
                <span>{pkg.progress}%</span>
                <span>Destination</span>
              </div>
              <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${getProgressColor()} rounded-full transition-all duration-1000`}
                  style={{ width: `${pkg.progress}%` }} />
              </div>
            </div>
          </div>

          {/* Package details */}
          <div className="p-5 border-b border-white/6 grid grid-cols-2 gap-3">
            {[
              { label: "Carrier", value: pkg.carrier },
              { label: "Weight", value: pkg.weight },
              { label: "From", value: pkg.from },
              { label: "To", value: pkg.to },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[9px] text-white/20 uppercase tracking-wider mb-0.5">{label}</div>
                <div className="text-[10px] text-white/60">{value}</div>
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
                        <Circle className="w-3.5 h-3.5 text-white/15 bg-[#0c0c0c]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs mb-0.5 ${ev.done ? "text-white/70" : "text-white/20"}`}>
                        {ev.label}
                      </div>
                      <div className="text-[9px] text-white/25">{ev.location}</div>
                      {ev.time && (
                        <div className="flex items-center gap-1 mt-1">
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

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {/* Map overlay labels */}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
              <span className="text-xs text-white/60">Live position · {pkg.status}</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-[9px] text-white/40">Route completed</span>
            </div>
            <div className="bg-black/80 backdrop-blur border border-white/8 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-4 h-px bg-blue-500/50" style={{ borderStyle: "dashed" }} />
              <span className="text-[9px] text-white/40">Remaining</span>
            </div>
          </div>
        </div>

        {/* Right panel — Notifications */}
        <aside className="w-60 bg-[#0c0c0c] border-l border-white/6 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-white/6">
            <div className="text-[9px] text-white/25 uppercase tracking-widest mb-4">Notifications</div>

            {!subscribed ? (
              <>
                <p className="text-[10px] text-white/35 leading-relaxed mb-4">
                  Get notified the moment your package status changes.
                </p>
                {!showEmailInput ? (
                  <button
                    onClick={() => setShowEmailInput(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-medium transition-all"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Enable Alerts
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-white/4 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-red-600/40"
                    />
                    <button
                      onClick={() => setSubscribed(true)}
                      disabled={!notifEmail.includes("@")}
                      className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-medium transition-all"
                    >
                      Subscribe
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2">
                <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-[10px] text-green-400 font-medium">Alerts enabled!</p>
                <p className="text-[9px] text-white/25 mt-1 break-all">{notifEmail}</p>
                <button
                  onClick={() => { setSubscribed(false); setShowEmailInput(false); setNotifEmail(""); }}
                  className="mt-3 flex items-center gap-1 text-[9px] text-white/20 hover:text-white/40 transition-colors mx-auto"
                >
                  <BellOff className="w-2.5 h-2.5" /> Unsubscribe
                </button>
              </div>
            )}
          </div>

          {/* Alert log */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-[9px] text-white/25 uppercase tracking-widest mb-3">Recent Alerts</div>
            <div className="space-y-2.5">
              {pkg.events.filter((e) => e.done).slice(0, 3).map((ev, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-[10px] text-white/60 mb-0.5">{ev.label}</div>
                  <div className="text-[9px] text-white/25">{ev.location} · {ev.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-white/6 space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
              <Download className="w-3.5 h-3.5" /> Download receipt
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 text-xs text-white/40 hover:text-white/70 transition-all">
              <Share2 className="w-3.5 h-3.5" /> Share tracking
            </button>
          </div>

          {/* Live stats */}
          <div className="p-4 border-t border-white/6">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Gauge, label: "Refresh", value: "15s" },
                { icon: Wifi, label: "Signal", value: "Live" },
                { icon: Battery, label: "Updates", value: pkg.events.filter((e) => e.done).length.toString() },
                { icon: Clock, label: "ETA", value: pkg.eta.split(",")[0] },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/3 rounded-lg p-2 text-center">
                  <Icon className="w-3 h-3 text-white/20 mx-auto mb-1" />
                  <div className="text-[10px] font-light text-white/60">{value}</div>
                  <div className="text-[8px] text-white/20">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
