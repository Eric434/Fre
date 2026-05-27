import { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock, Plus, Trash2, LogOut, Package, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, RefreshCw, X, Eye, LayoutDashboard, CreditCard, FileText,
  MessageSquare, Settings, Truck, User, MapPin, Phone, Mail, Scale,
  DollarSign, Shield, Globe, Zap, Bell, Clock, TrendingUp, BarChart3,
  Download, ChevronDown, ChevronUp, Send, HelpCircle,
  Wifi, Star, QrCode, Languages, Search,
  Plane, Ship, Pencil, AlertTriangle, Anchor, PauseCircle, PlayCircle,
  StickyNote, History,
} from "lucide-react";
import {
  adminLogin, adminListPackages, adminCreatePackage,
  adminDeletePackage, adminUpdatePackage, type Package as Pkg,
} from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = "dashboard" | "shipments" | "payments" | "customs" | "support" | "settings";

// ─── Route presets ────────────────────────────────────────────────────────────

type RoutePreset = { label: string; route: [number, number][]; origin: string; destination: string; cargoHint?: "air" | "sea" | "road" };
const ROUTE_PRESETS: Record<string, RoutePreset> = {
  // ── Ground / Domestic ──────────────────────────────────────────────────────
  sj_sf: {
    label: "🚛 San Jose → San Francisco",
    origin: "San Jose, CA", destination: "San Francisco, CA",
    route: [[37.3382,-121.8863],[37.4,-121.92],[37.45,-121.95],[37.51,-121.97],[37.55,-121.98],[37.59,-122.05],[37.63,-122.12],[37.68,-122.19],[37.72,-122.27],[37.75,-122.35],[37.7749,-122.4194]],
  },
  la_sf: {
    label: "🚛 Los Angeles → San Francisco",
    origin: "Los Angeles, CA", destination: "San Francisco, CA",
    route: [[34.0522,-118.2437],[34.6,-118.6],[35.2,-119.0],[35.65,-119.3],[35.9,-119.5],[36.3,-119.8],[36.7,-120.1],[37.1,-120.6],[37.4,-121.1],[37.6,-121.9],[37.7749,-122.4194]],
  },
  portland_sf: {
    label: "🚛 Portland → San Francisco",
    origin: "Portland, OR", destination: "San Francisco, CA",
    route: [[45.5051,-122.675],[44.0,-122.3],[42.8,-122.0],[41.5,-122.15],[40.3,-122.3],[39.2,-122.4],[38.5,-122.5],[38.0,-122.48],[37.7749,-122.4194]],
  },
  seattle_la: {
    label: "🚛 Seattle → Los Angeles",
    origin: "Seattle, WA", destination: "Los Angeles, CA",
    route: [[47.6062,-122.3321],[46.2,-122.0],[44.5,-121.5],[42.5,-121.0],[40.5,-120.5],[38.5,-119.8],[36.5,-119.0],[35.0,-118.5],[34.0522,-118.2437]],
  },
  ny_la: {
    label: "🚛 New York → Los Angeles",
    origin: "New York, NY", destination: "Los Angeles, CA",
    route: [[40.7128,-74.006],[39.9,-76.5],[38.5,-79.0],[36.5,-82.0],[35.2,-86.0],[33.5,-89.5],[32.0,-93.5],[31.5,-97.5],[32.0,-101.5],[33.0,-106.0],[34.0522,-118.2437]],
  },
  miami_chicago: {
    label: "🚛 Miami → Chicago",
    origin: "Miami, FL", destination: "Chicago, IL",
    route: [[25.7617,-80.1918],[27.5,-81.5],[29.5,-82.0],[31.5,-83.0],[33.5,-84.4],[35.5,-85.5],[37.0,-86.5],[39.0,-87.5],[41.8781,-87.6298]],
  },
  // ── Air Cargo ─────────────────────────────────────────────────────────────
  nyc_london_air: {
    label: "✈ New York → London (Air)",
    origin: "New York, USA", destination: "London, United Kingdom",
    cargoHint: "air",
    route: [[40.64,-73.78],[43,-65],[46,-55],[49,-44],[51,-32],[52,-18],[52,-8],[51.47,-0.45]],
  },
  lax_tokyo_air: {
    label: "✈ Los Angeles → Tokyo (Air)",
    origin: "Los Angeles, USA", destination: "Tokyo, Japan",
    cargoHint: "air",
    route: [[33.94,-118.41],[38,-135],[43,-155],[47,-170],[50,175],[48,160],[43,148],[35.76,140.39]],
  },
  dubai_london_air: {
    label: "✈ Dubai → London (Air)",
    origin: "Dubai, UAE", destination: "London, United Kingdom",
    cargoHint: "air",
    route: [[25.25,55.37],[30,50],[35,42],[38,32],[42,22],[46,12],[50,2],[51.47,-0.45]],
  },
  miami_paris_air: {
    label: "✈ Miami → Paris (Air)",
    origin: "Miami, USA", destination: "Paris, France",
    cargoHint: "air",
    route: [[25.76,-80.19],[28,-70],[32,-58],[36,-48],[40,-36],[44,-25],[47,-13],[48.86,2.35]],
  },
  sg_london_air: {
    label: "✈ Singapore → London (Air)",
    origin: "Singapore", destination: "London, United Kingdom",
    cargoHint: "air",
    route: [[1.36,103.82],[8,96],[14,82],[20,68],[26,54],[32,40],[38,26],[44,14],[50,4],[51.47,-0.45]],
  },
  // ── Sea Cargo ─────────────────────────────────────────────────────────────
  la_shanghai_sea: {
    label: "🚢 Los Angeles → Shanghai (Sea)",
    origin: "Los Angeles, USA", destination: "Shanghai, China",
    cargoHint: "sea",
    route: [[33.7,-118.3],[28,-120],[22,-125],[15,-130],[5,-140],[5,160],[12,145],[22,133],[31.23,121.47]],
  },
  rotterdam_nyc_sea: {
    label: "🚢 Rotterdam → New York (Sea)",
    origin: "Rotterdam, Netherlands", destination: "New York, USA",
    cargoHint: "sea",
    route: [[51.92,4.48],[50,-5],[47,-15],[45,-25],[43,-35],[42,-45],[42,-57],[42,-65],[40.69,-74.04]],
  },
  singapore_dubai_sea: {
    label: "🚢 Singapore → Dubai (Sea)",
    origin: "Singapore", destination: "Dubai, UAE",
    cargoHint: "sea",
    route: [[1.36,103.8],[5,100],[8,90],[10,80],[12,72],[18,65],[22,60],[25.25,55.37]],
  },
  miami_london_sea: {
    label: "🚢 Miami → London (Sea)",
    origin: "Miami, USA", destination: "London, United Kingdom",
    cargoHint: "sea",
    route: [[25.76,-80.19],[28,-76],[32,-70],[36,-63],[40,-54],[44,-40],[47,-25],[49,-12],[51.47,-0.45]],
  },
  dubai_la_sea: {
    label: "🚢 Dubai → Los Angeles (Sea)",
    origin: "Dubai, UAE", destination: "Los Angeles, USA",
    cargoHint: "sea",
    route: [[25.25,55.37],[22,62],[18,68],[12,75],[5,80],[2,95],[5,110],[3,125],[-2,140],[-5,155],[-2,170],[5,-175],[12,-160],[20,-145],[28,-130],[33.7,-118.3]],
  },
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "0123456789";
  const r = (s: string, n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `TSL-${r(nums, 4)}-${r(chars, 2)}`;
}

const ALL_STATUSES = [
  "Pending","Processing","In Transit","At Airport","At Seaport",
  "Customs Clearance","Out for Delivery","Delivered","Delayed","On Hold","Cancelled",
];

const CARGO_TYPES = [
  { value: "road", label: "🚛 Ground / Road", icon: "🚛" },
  { value: "air",  label: "✈ Air Cargo",      icon: "✈" },
  { value: "sea",  label: "🚢 Sea Freight",    icon: "🚢" },
];

function blankForm() {
  return {
    code: generateCode(),
    status: "Processing",
    eta: "",
    origin: "",
    destination: "",
    carrier: "Tesla Express",
    weight: "",
    speed_kph: 85,
    start_progress: 0.05,
    delivery_method: "Standard",
    shipping_cost: 49.99,
    customs_status: "Pending",
    customs_fee: 0,
    cargo_type: "road",
    notes: "",
    paused: false,
    sender_name: "",
    sender_email: "",
    sender_phone: "",
    sender_address: "",
    receiver_name: "",
    receiver_email: "",
    receiver_phone: "",
    receiver_address: "",
    routePreset: "sj_sf",
    events: [
      { time_label: "", label: "Order Received", location: "Merchant", done: true, sort_order: 0 },
      { time_label: "", label: "Processing", location: "Warehouse", done: false, sort_order: 1 },
      { time_label: "", label: "In Transit", location: "", done: false, sort_order: 2 },
      { time_label: "", label: "Customs Clearance", location: "Port of Entry", done: false, sort_order: 3 },
      { time_label: "", label: "Out for Delivery", location: "", done: false, sort_order: 4 },
      { time_label: "", label: "Delivered", location: "", done: false, sort_order: 5 },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusCls(status: string) {
  const s = status.toLowerCase();
  return s === "delivered"         ? "text-green-400 bg-green-500/10 border-green-500/25" :
         s === "out for delivery"  ? "text-orange-400 bg-orange-500/10 border-orange-500/25" :
         s === "in transit"        ? "text-blue-400 bg-blue-500/10 border-blue-500/25" :
         s === "at airport"        ? "text-sky-400 bg-sky-500/10 border-sky-500/25" :
         s === "at seaport"        ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/25" :
         s === "customs clearance" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" :
         s === "delayed"           ? "text-red-400 bg-red-500/10 border-red-500/25" :
         s === "on hold"           ? "text-purple-400 bg-purple-500/10 border-purple-500/25" :
         s === "cancelled"         ? "text-red-300 bg-red-500/8 border-red-500/20 line-through" :
         s === "processing"        ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/25" :
         "text-white/40 bg-white/5 border-white/10";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusCls(status)}`}>
      {status}
    </span>
  );
}

function CargoBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.FC<{ className?: string }> }> = {
    air:  { label: "Air Cargo",    cls: "text-sky-400 bg-sky-500/10 border-sky-500/20",    Icon: Plane  },
    sea:  { label: "Sea Freight",  cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", Icon: Ship   },
    road: { label: "Ground",       cls: "text-white/40 bg-white/5 border-white/10",        Icon: Truck  },
  };
  const { label, cls, Icon } = map[type] ?? map["road"];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${cls}`}>
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  );
}

function CustomsBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "cleared" ? "text-green-400 bg-green-500/10 border-green-500/25" :
    s === "held" ? "text-red-400 bg-red-500/10 border-red-500/25" :
    s === "in review" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" :
    "text-white/35 bg-white/4 border-white/8";
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.FC<{ className?: string }> }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/4 last:border-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-xs text-white/70 truncate">{value || "—"}</div>
      </div>
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!pw) return;
    setLoading(true); setError("");
    const ok = await adminLogin(pw);
    setLoading(false);
    if (ok) onLogin(pw);
    else setError("Invalid password");
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <img src="/tesla-logo.png" alt="TeslaTrack" className="logo-spin w-16 h-16 object-contain drop-shadow-[0_0_16px_rgba(220,38,38,0.45)]" />
            <span className="text-sm font-semibold tracking-widest uppercase">
              Tesla<span className="text-red-500">Track</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white/90 mb-1">Admin Portal</h1>
          <p className="text-xs text-white/30">Secure access — enter your admin password</p>
        </div>
        <div className="bg-[#111] border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-green-400/70 bg-green-500/8 border border-green-500/15 rounded-lg px-3 py-2">
            <Shield className="w-3 h-3 flex-shrink-0" /> SSL Encrypted · Secure Login
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input type="password" value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Admin password"
              className="w-full bg-white/3 border border-white/8 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-red-600/40" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
          <button onClick={handleSubmit} disabled={!pw || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-sm font-medium transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-[10px] text-white/15">
            Protected by admin authentication
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shipment Detail Modal ────────────────────────────────────────────────────

function ShipmentDetailModal({ pkg, onClose, onTrack }: { pkg: Pkg; onClose: () => void; onTrack: (c: string) => void }) {
  const STATUS_STEPS = [
    "Order Received","Processing","In Transit","At Airport","At Seaport",
    "Customs Clearance","Out for Delivery","Delivered","Delayed","On Hold",
  ];
  const currentStep = STATUS_STEPS.findIndex((s) => s.toLowerCase() === pkg.status.toLowerCase());
  const activeIdx = currentStep >= 0 ? currentStep : 2;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8 sticky top-0 bg-[#0f0f0f] z-10">
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-red-500" />
            <code className="text-sm font-mono text-white/80">{pkg.code}</code>
            <StatusBadge status={pkg.status} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onTrack(pkg.code)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all">
              <Eye className="w-3 h-3" /> Live Track
            </button>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sender */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <User className="w-3 h-3 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">Sender Information</span>
            </div>
            <InfoRow label="Name" value={pkg.sender_name} icon={User} />
            <InfoRow label="Email" value={pkg.sender_email} icon={Mail} />
            <InfoRow label="Phone" value={pkg.sender_phone} icon={Phone} />
            <InfoRow label="Address" value={pkg.sender_address} icon={MapPin} />
            <InfoRow label="Origin City" value={pkg.origin} icon={MapPin} />
          </div>

          {/* Receiver */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center">
                <User className="w-3 h-3 text-green-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">Receiver Information</span>
            </div>
            <InfoRow label="Name" value={pkg.receiver_name} icon={User} />
            <InfoRow label="Email" value={pkg.receiver_email} icon={Mail} />
            <InfoRow label="Phone" value={pkg.receiver_phone} icon={Phone} />
            <InfoRow label="Address" value={pkg.receiver_address} icon={MapPin} />
            <InfoRow label="Destination City" value={pkg.destination} icon={MapPin} />
          </div>

          {/* Package Details */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
                <Package className="w-3 h-3 text-red-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">Package Details</span>
            </div>
            <InfoRow label="Tracking Number" value={pkg.code} icon={QrCode} />
            <InfoRow label="Weight" value={pkg.weight} icon={Scale} />
            <InfoRow label="Carrier" value={pkg.carrier} icon={Truck} />
            <InfoRow label="Delivery Method" value={pkg.delivery_method || "Standard"} icon={Zap} />
            <InfoRow label="ETA" value={pkg.eta} icon={Clock} />
            <InfoRow label="Shipping Cost" value={`$${Number(pkg.shipping_cost || 0).toFixed(2)}`} icon={DollarSign} />
          </div>

          {/* Status Timeline */}
          <div className="bg-white/3 rounded-xl border border-white/6 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-white/70">Status Timeline</span>
            </div>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                  <div key={i} className="flex gap-3 relative">
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`absolute left-[9px] top-5 w-0.5 h-5 ${done ? "bg-green-500/50" : "bg-white/8"}`} />
                    )}
                    <div className={`w-[18px] h-[18px] rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      done ? "bg-green-500/20 border border-green-500/40" :
                      active ? "bg-red-500/20 border border-red-500/60" :
                      "bg-white/4 border border-white/10"
                    }`}>
                      {done ? <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> :
                       active ? <div className="w-1.5 h-1.5 rounded-full bg-red-400" style={{ animation: "pulse-live 1.5s infinite" }} /> :
                       <div className="w-1.5 h-1.5 rounded-full bg-white/15" />}
                    </div>
                    <div className="pb-4">
                      <div className={`text-[11px] font-medium ${done ? "text-green-300/70" : active ? "text-white/90" : "text-white/25"}`}>{step}</div>
                      {active && <div className="text-[9px] text-red-400/70 mt-0.5">Current Status</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events log */}
          {pkg.events && pkg.events.length > 0 && (
            <div className="md:col-span-2 bg-white/3 rounded-xl border border-white/6 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-yellow-400" />
                </div>
                <span className="text-xs font-semibold text-white/70">Event Log</span>
              </div>
              <div className="space-y-2">
                {pkg.events.map((ev, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${ev.done ? "bg-green-500/6 border border-green-500/12" : "bg-white/2 border border-white/5"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ev.done ? "bg-green-400" : "bg-white/20"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium ${ev.done ? "text-white/75" : "text-white/35"}`}>{ev.label}</span>
                        {ev.time_label && <span className="text-[9px] text-white/25 font-mono flex-shrink-0">{ev.time_label}</span>}
                      </div>
                      {ev.location && <div className="text-[10px] text-white/30 mt-0.5">{ev.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function CreateModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(blankForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalTab, setModalTab] = useState<"basic" | "sender" | "receiver" | "events">("basic");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const preset = ROUTE_PRESETS[form.routePreset];

  const handleCreate = async () => {
    if (!form.code || !form.eta) { setError("Tracking code and ETA are required"); return; }
    setLoading(true); setError("");
    const result = await adminCreatePackage(token, {
      code: form.code, status: form.status, eta: form.eta,
      origin: form.origin || preset.origin,
      destination: form.destination || preset.destination,
      carrier: form.carrier, weight: form.weight || "—",
      speed_kph: Number(form.speed_kph), start_progress: Number(form.start_progress),
      route: preset.route,
      delivery_method: form.delivery_method, shipping_cost: Number(form.shipping_cost),
      customs_status: form.customs_status, customs_fee: Number(form.customs_fee),
      cargo_type: form.cargo_type, notes: form.notes, paused: form.paused,
      sender_name: form.sender_name, sender_email: form.sender_email,
      sender_phone: form.sender_phone, sender_address: form.sender_address,
      receiver_name: form.receiver_name, receiver_email: form.receiver_email,
      receiver_phone: form.receiver_phone, receiver_address: form.receiver_address,
      events: form.events.map((e, i) => ({ ...e, sort_order: i })),
    } as Parameters<typeof adminCreatePackage>[1]);
    setLoading(false);
    if (result.success) onCreated();
    else setError(result.error ?? "Failed to create");
  };

  const TABS = [
    { id: "basic" as const, label: "Basic Info" },
    { id: "sender" as const, label: "Sender" },
    { id: "receiver" as const, label: "Receiver" },
    { id: "events" as const, label: "Events" },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-white/90">New Shipment</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Modal tabs */}
        <div className="flex border-b border-white/8 px-5 flex-shrink-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setModalTab(t.id)}
              className={`text-[11px] py-2.5 px-3 border-b-2 transition-all -mb-px ${
                modalTab === t.id ? "border-red-500 text-white/90" : "border-transparent text-white/30 hover:text-white/60"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {modalTab === "basic" && <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Tracking Code</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())}
                    className="field-input font-mono flex-1" placeholder="TSL-0000-XX" />
                  <button onClick={() => set("code", generateCode())}
                    className="px-2.5 rounded-lg border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all text-[10px]">
                    Gen
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field-input">
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">ETA</label>
                <input value={form.eta} onChange={(e) => set("eta", e.target.value)}
                  className="field-input" placeholder="Today, 4–7 PM" />
              </div>
              <div>
                <label className="field-label">Weight</label>
                <input value={form.weight} onChange={(e) => set("weight", e.target.value)}
                  className="field-input" placeholder="2.4 kg" />
              </div>
            </div>
            <div>
              <label className="field-label">Route Preset</label>
              <select value={form.routePreset} onChange={(e) => {
                set("routePreset", e.target.value);
                const p = ROUTE_PRESETS[e.target.value];
                set("origin", p.origin); set("destination", p.destination);
                if (p.cargoHint) set("cargo_type", p.cargoHint);
              }} className="field-input">
                {Object.entries(ROUTE_PRESETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-white/20 mt-1">{preset.origin} → {preset.destination}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Delivery Method</label>
                <select value={form.delivery_method} onChange={(e) => set("delivery_method", e.target.value)} className="field-input">
                  {["Standard","Express","Priority","Same-Day","Economy"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Shipping Cost ($)</label>
                <input type="number" step="0.01" value={form.shipping_cost}
                  onChange={(e) => set("shipping_cost", e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Customs Status</label>
                <select value={form.customs_status} onChange={(e) => set("customs_status", e.target.value)} className="field-input">
                  {["Pending","In Review","Cleared","Held"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Customs Fee ($)</label>
                <input type="number" step="0.01" min="0" value={form.customs_fee}
                  onChange={(e) => set("customs_fee", e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Speed (km/h)</label>
                <input type="number" value={form.speed_kph}
                  onChange={(e) => set("speed_kph", e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Start Progress (0–1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.start_progress}
                  onChange={(e) => set("start_progress", e.target.value)} className="field-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Carrier</label>
              <input value={form.carrier} onChange={(e) => set("carrier", e.target.value)} className="field-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Cargo Type</label>
                <select value={form.cargo_type} onChange={(e) => set("cargo_type", e.target.value)} className="field-input">
                  {CARGO_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Paused</label>
                <div className="flex items-center gap-2 pt-1.5">
                  <input type="checkbox" checked={form.paused} onChange={(e) => set("paused", e.target.checked)} className="w-4 h-4 accent-red-600 cursor-pointer" />
                  <span className="text-[10px] text-white/40">Pause tracking animation</span>
                </div>
              </div>
            </div>
            <div>
              <label className="field-label">Internal Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                rows={2} placeholder="Optional admin notes about this shipment..."
                className="field-input resize-none" />
            </div>
          </>}

          {modalTab === "sender" && <>
            <p className="text-[10px] text-white/30">Who is sending this shipment?</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)}
                  className="field-input" placeholder="John Smith" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" value={form.sender_email} onChange={(e) => set("sender_email", e.target.value)}
                  className="field-input" placeholder="john@example.com" />
              </div>
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={form.sender_phone} onChange={(e) => set("sender_phone", e.target.value)}
                className="field-input" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="field-label">Full Address</label>
              <input value={form.sender_address} onChange={(e) => set("sender_address", e.target.value)}
                className="field-input" placeholder="123 Main St, City, State ZIP" />
            </div>
          </>}

          {modalTab === "receiver" && <>
            <p className="text-[10px] text-white/30">Who will receive this shipment?</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input value={form.receiver_name} onChange={(e) => set("receiver_name", e.target.value)}
                  className="field-input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" value={form.receiver_email} onChange={(e) => set("receiver_email", e.target.value)}
                  className="field-input" placeholder="jane@example.com" />
              </div>
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={form.receiver_phone} onChange={(e) => set("receiver_phone", e.target.value)}
                className="field-input" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="field-label">Delivery Address</label>
              <input value={form.receiver_address} onChange={(e) => set("receiver_address", e.target.value)}
                className="field-input" placeholder="456 Oak Ave, City, State ZIP" />
            </div>
          </>}

          {modalTab === "events" && <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/30">Status updates shown on the tracking timeline</p>
              <button onClick={() => set("events", [...form.events, { time_label: "", label: "", location: "", done: false, sort_order: form.events.length }])}
                className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.events.map((ev, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="checkbox" checked={ev.done}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], done: e.target.checked }; set("events", evs); }}
                    className="flex-shrink-0 accent-red-600" />
                  <input value={ev.label}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], label: e.target.value }; set("events", evs); }}
                    placeholder="Event label" className="field-input flex-1 text-[11px] py-1.5" />
                  <input value={ev.location}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], location: e.target.value }; set("events", evs); }}
                    placeholder="Location" className="field-input w-28 text-[11px] py-1.5" />
                  <input value={ev.time_label}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], time_label: e.target.value }; set("events", evs); }}
                    placeholder="Time" className="field-input w-20 text-[11px] py-1.5" />
                  <button onClick={() => set("events", form.events.filter((_, j) => j !== i))}
                    className="text-white/15 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/8 flex items-center justify-between flex-shrink-0">
          <div className="flex gap-2">
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setModalTab(t.id)}
                className={`w-2 h-2 rounded-full transition-all ${modalTab === t.id ? "bg-red-500" : "bg-white/15"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {loading ? "Creating…" : "Create Shipment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ pkg, token, onClose, onUpdated }: { pkg: Pkg; token: string; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    status: pkg.status,
    eta: pkg.eta,
    origin: pkg.origin,
    destination: pkg.destination,
    carrier: pkg.carrier,
    weight: pkg.weight,
    speed_kph: pkg.speed_kph,
    start_progress: pkg.start_progress,
    delivery_method: pkg.delivery_method || "Standard",
    shipping_cost: pkg.shipping_cost,
    customs_status: pkg.customs_status || "Pending",
    customs_fee: pkg.customs_fee,
    cargo_type: pkg.cargo_type || "road",
    notes: pkg.notes || "",
    paused: pkg.paused || false,
    sender_name: pkg.sender_name || "",
    sender_email: pkg.sender_email || "",
    sender_phone: pkg.sender_phone || "",
    sender_address: pkg.sender_address || "",
    receiver_name: pkg.receiver_name || "",
    receiver_email: pkg.receiver_email || "",
    receiver_phone: pkg.receiver_phone || "",
    receiver_address: pkg.receiver_address || "",
    routePreset: "",
    events: (pkg.events || []).map((e, i) => ({ ...e, sort_order: i })),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalTab, setModalTab] = useState<"basic" | "sender" | "receiver" | "events">("basic");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setLoading(true); setError("");
    const preset = form.routePreset ? ROUTE_PRESETS[form.routePreset] : null;
    const result = await adminUpdatePackage(token, pkg.code, {
      status: form.status, eta: form.eta,
      origin: preset ? preset.origin : form.origin,
      destination: preset ? preset.destination : form.destination,
      carrier: form.carrier, weight: form.weight,
      speed_kph: Number(form.speed_kph), start_progress: Number(form.start_progress),
      ...(preset ? { route: preset.route } : {}),
      delivery_method: form.delivery_method, shipping_cost: Number(form.shipping_cost),
      customs_status: form.customs_status, customs_fee: Number(form.customs_fee),
      cargo_type: form.cargo_type, notes: form.notes, paused: form.paused,
      sender_name: form.sender_name, sender_email: form.sender_email,
      sender_phone: form.sender_phone, sender_address: form.sender_address,
      receiver_name: form.receiver_name, receiver_email: form.receiver_email,
      receiver_phone: form.receiver_phone, receiver_address: form.receiver_address,
      events: form.events.map((e, i) => ({ ...e, sort_order: i })),
    } as Parameters<typeof adminUpdatePackage>[2]);
    setLoading(false);
    if (result.success) onUpdated();
    else setError(result.error ?? "Failed to save");
  };

  const TABS = [
    { id: "basic" as const, label: "Basic Info" },
    { id: "sender" as const, label: "Sender" },
    { id: "receiver" as const, label: "Receiver" },
    { id: "events" as const, label: "Events" },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-white/90">Edit Shipment</span>
            <code className="text-xs font-mono text-white/30 ml-1">{pkg.code}</code>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-white/8 px-5 flex-shrink-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setModalTab(t.id)}
              className={`text-[11px] py-2.5 px-3 border-b-2 transition-all -mb-px ${
                modalTab === t.id ? "border-blue-500 text-white/90" : "border-transparent text-white/30 hover:text-white/60"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {modalTab === "basic" && <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Tracking Code</label>
                <div className="bg-white/3 border border-white/6 rounded-lg px-3 py-2 text-xs font-mono text-white/30">{pkg.code}</div>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field-input">
                  {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">ETA</label>
                <input value={form.eta} onChange={(e) => set("eta", e.target.value)} className="field-input" placeholder="Today, 4–7 PM" />
              </div>
              <div>
                <label className="field-label">Weight</label>
                <input value={form.weight} onChange={(e) => set("weight", e.target.value)} className="field-input" placeholder="2.4 kg" />
              </div>
            </div>
            <div>
              <label className="field-label">Change Route (optional)</label>
              <select value={form.routePreset} onChange={(e) => {
                set("routePreset", e.target.value);
                if (e.target.value) {
                  const p = ROUTE_PRESETS[e.target.value];
                  set("origin", p.origin); set("destination", p.destination);
                  if (p.cargoHint) set("cargo_type", p.cargoHint);
                }
              }} className="field-input">
                <option value="">— Keep existing route —</option>
                {Object.entries(ROUTE_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Origin</label>
                <input value={form.origin} onChange={(e) => set("origin", e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Destination</label>
                <input value={form.destination} onChange={(e) => set("destination", e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Delivery Method</label>
                <select value={form.delivery_method} onChange={(e) => set("delivery_method", e.target.value)} className="field-input">
                  {["Standard","Express","Priority","Same-Day","Economy"].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Shipping Cost ($)</label>
                <input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => set("shipping_cost", e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Customs Status</label>
                <select value={form.customs_status} onChange={(e) => set("customs_status", e.target.value)} className="field-input">
                  {["Pending","In Review","Cleared","Held"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Customs Fee ($)</label>
                <input type="number" step="0.01" min="0" value={form.customs_fee} onChange={(e) => set("customs_fee", e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Speed (km/h)</label>
                <input type="number" value={form.speed_kph} onChange={(e) => set("speed_kph", e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Start Progress (0–1)</label>
                <input type="number" step="0.01" min="0" max="1" value={form.start_progress} onChange={(e) => set("start_progress", e.target.value)} className="field-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Carrier</label>
              <input value={form.carrier} onChange={(e) => set("carrier", e.target.value)} className="field-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Cargo Type</label>
                <select value={form.cargo_type} onChange={(e) => set("cargo_type", e.target.value)} className="field-input">
                  {CARGO_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Paused</label>
                <div className="flex items-center gap-2 pt-1.5">
                  <input type="checkbox" checked={form.paused} onChange={(e) => set("paused", e.target.checked)} className="w-4 h-4 accent-red-600 cursor-pointer" />
                  <span className="text-[10px] text-white/40">Pause tracking animation</span>
                </div>
              </div>
            </div>
            <div>
              <label className="field-label">Internal Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                rows={2} placeholder="Optional admin notes..." className="field-input resize-none" />
            </div>
          </>}
          {modalTab === "sender" && <>
            <p className="text-[10px] text-white/30">Who is sending this shipment?</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input value={form.sender_name} onChange={(e) => set("sender_name", e.target.value)} className="field-input" placeholder="John Smith" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" value={form.sender_email} onChange={(e) => set("sender_email", e.target.value)} className="field-input" placeholder="john@example.com" />
              </div>
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={form.sender_phone} onChange={(e) => set("sender_phone", e.target.value)} className="field-input" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="field-label">Full Address</label>
              <input value={form.sender_address} onChange={(e) => set("sender_address", e.target.value)} className="field-input" placeholder="123 Main St, City, State ZIP" />
            </div>
          </>}
          {modalTab === "receiver" && <>
            <p className="text-[10px] text-white/30">Who will receive this shipment?</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Full Name</label>
                <input value={form.receiver_name} onChange={(e) => set("receiver_name", e.target.value)} className="field-input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" value={form.receiver_email} onChange={(e) => set("receiver_email", e.target.value)} className="field-input" placeholder="jane@example.com" />
              </div>
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={form.receiver_phone} onChange={(e) => set("receiver_phone", e.target.value)} className="field-input" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="field-label">Delivery Address</label>
              <input value={form.receiver_address} onChange={(e) => set("receiver_address", e.target.value)} className="field-input" placeholder="456 Oak Ave, City, State ZIP" />
            </div>
          </>}
          {modalTab === "events" && <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/30">Status updates shown on the tracking timeline</p>
              <button onClick={() => set("events", [...form.events, { time_label: "", label: "", location: "", done: false, sort_order: form.events.length }])}
                className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.events.map((ev, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="checkbox" checked={ev.done}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], done: e.target.checked }; set("events", evs); }}
                    className="flex-shrink-0 accent-red-600" />
                  <input value={ev.label}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], label: e.target.value }; set("events", evs); }}
                    placeholder="Event label" className="field-input flex-1 text-[11px] py-1.5" />
                  <input value={ev.location}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], location: e.target.value }; set("events", evs); }}
                    placeholder="Location" className="field-input w-28 text-[11px] py-1.5" />
                  <input value={ev.time_label}
                    onChange={(e) => { const evs = [...form.events]; evs[i] = { ...evs[i], time_label: e.target.value }; set("events", evs); }}
                    placeholder="Time" className="field-input w-20 text-[11px] py-1.5" />
                  <button onClick={() => set("events", form.events.filter((_, j) => j !== i))}
                    className="text-white/15 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-white/8 flex items-center justify-between flex-shrink-0">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setModalTab(t.id)}
                className={`w-2 h-2 rounded-full transition-all ${modalTab === t.id ? "bg-blue-500" : "bg-white/15"}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-all">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ packages, onCreateNew, onRefresh, loading }: {
  packages: Pkg[]; onCreateNew: () => void; onRefresh: () => void; loading: boolean;
}) {
  const total = packages.length;
  const inTransit = packages.filter((p) => p.status === "In Transit").length;
  const delivered = packages.filter((p) => p.status === "Delivered").length;
  const revenue = packages.reduce((s, p) => s + Number(p.shipping_cost || 0), 0);
  const pending = packages.filter((p) => !["Delivered"].includes(p.status)).length;

  const STATS = [
    { label: "Total Shipments", value: total, icon: Package, color: "text-white/70", bg: "bg-white/5 border-white/8" },
    { label: "In Transit", value: inTransit, icon: Truck, color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/15" },
    { label: "Delivered", value: delivered, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/8 border-green-500/15" },
    { label: "Active", value: pending, icon: Clock, color: "text-orange-400", bg: "bg-orange-500/8 border-orange-500/15" },
    { label: "Total Revenue", value: `$${revenue.toFixed(2)}`, icon: DollarSign, color: "text-red-400", bg: "bg-red-500/8 border-red-500/15" },
  ];

  const DELIVERY_METHODS = ["Standard","Express","Priority","Same-Day","Economy"];
  const methodCounts = DELIVERY_METHODS.map((m) => ({
    method: m,
    count: packages.filter((p) => (p.delivery_method || "Standard") === m).length,
  }));
  const maxCount = Math.max(...methodCounts.map((m) => m.count), 1);

  const TECH = [
    { name: "React 19", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
    { name: "Node.js 24", color: "bg-green-500/20 text-green-300 border-green-500/20" },
    { name: "PostgreSQL", color: "bg-blue-400/20 text-blue-200 border-blue-400/20" },
    { name: "TypeScript", color: "bg-blue-600/20 text-blue-200 border-blue-600/20" },
    { name: "Vite 7", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" },
    { name: "Leaflet", color: "bg-green-400/20 text-green-200 border-green-400/20" },
    { name: "Tailwind CSS", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/20" },
    { name: "Express 5", color: "bg-gray-500/20 text-gray-300 border-gray-500/20" },
    { name: "Resend", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/20" },
    { name: "Real-time GPS", color: "bg-red-500/20 text-red-300 border-red-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <Icon className={`w-4 h-4 mb-2 ${color}`} />
            <div className={`text-2xl font-bold mb-0.5 ${color}`}>{value}</div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Delivery method breakdown */}
        <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-white/30" />
            <span className="text-sm font-medium text-white/70">Delivery Statistics</span>
          </div>
          {total === 0 ? (
            <p className="text-xs text-white/20 py-4 text-center">No shipments yet</p>
          ) : (
            <div className="space-y-3">
              {methodCounts.map(({ method, count }) => (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">{method}</span>
                    <span className="text-white/25 font-mono">{count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600/60 rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-white/30" />
            <span className="text-sm font-medium text-white/70">Recent Activity</span>
          </div>
          {packages.length === 0 ? (
            <p className="text-xs text-white/20 py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto">
              {packages.slice(0, 6).map((pkg) => (
                <div key={pkg.code} className="flex items-center gap-3 py-1.5 border-b border-white/4 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-red-400/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono text-white/60 truncate">{pkg.code}</div>
                    <div className="text-[9px] text-white/25">{pkg.origin} → {pkg.destination}</div>
                  </div>
                  <StatusBadge status={pkg.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Notifications</span>
        </div>
        <div className="space-y-2">
          {packages.filter((p) => p.status === "Out for Delivery").length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-orange-500/8 border border-orange-500/15 rounded-lg">
              <Truck className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-orange-300">Deliveries In Progress</div>
                <div className="text-[10px] text-orange-400/60">{packages.filter((p) => p.status === "Out for Delivery").length} shipment(s) out for delivery</div>
              </div>
            </div>
          )}
          {packages.filter((p) => p.customs_status === "Held").length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-red-500/8 border border-red-500/15 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-red-300">Customs Alert</div>
                <div className="text-[10px] text-red-400/60">{packages.filter((p) => p.customs_status === "Held").length} shipment(s) held at customs</div>
              </div>
            </div>
          )}
          {packages.filter((p) => p.customs_status === "In Review").length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/8 border border-yellow-500/15 rounded-lg">
              <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-yellow-300">Customs Review</div>
                <div className="text-[10px] text-yellow-400/60">{packages.filter((p) => p.customs_status === "In Review").length} shipment(s) under customs review</div>
              </div>
            </div>
          )}
          {packages.filter((p) => p.status === "Delayed").length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-red-500/8 border border-red-500/15 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-red-300">Delayed Shipments</div>
                <div className="text-[10px] text-red-400/60">{packages.filter((p) => p.status === "Delayed").length} shipment(s) currently delayed</div>
              </div>
            </div>
          )}
          {packages.filter((p) => p.paused).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-purple-500/8 border border-purple-500/15 rounded-lg">
              <PauseCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-purple-300">Paused Shipments</div>
                <div className="text-[10px] text-purple-400/60">{packages.filter((p) => p.paused).length} shipment(s) have tracking paused</div>
              </div>
            </div>
          )}
          {packages.length === 0 && (
            <div className="text-xs text-white/20 text-center py-3">No notifications</div>
          )}
          {packages.length > 0 && packages.every((p) => p.status === "Delivered") && (
            <div className="flex items-start gap-3 p-3 bg-green-500/8 border border-green-500/15 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-green-300">All Delivered</div>
                <div className="text-[10px] text-green-400/60">All shipments have been delivered</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technology stack */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Technology Stack</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TECH.map(({ name, color }) => (
            <span key={name} className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${color}`}>{name}</span>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "New Shipment", icon: Plus, action: onCreateNew, primary: true },
          { label: "Refresh Data", icon: RefreshCw, action: onRefresh, primary: false },
          { label: "GPS Tracking", icon: Globe, action: () => {}, primary: false },
          { label: "Notifications", icon: Bell, action: () => {}, primary: false },
        ].map(({ label, icon: Icon, action, primary }) => (
          <button key={label} onClick={action}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium transition-all ${
              primary ? "bg-red-600 hover:bg-red-500 border-red-500 text-white" : "bg-white/3 hover:bg-white/6 border-white/8 text-white/50 hover:text-white/80"
            }`}>
            <Icon className={`w-3.5 h-3.5 ${loading && label === "Refresh Data" ? "animate-spin" : ""}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shipments Tab ────────────────────────────────────────────────────────────

function ShipmentsTab({ packages, token, loading, onRefresh, onTrack, onCreateNew, showToast }: {
  packages: Pkg[]; token: string; loading: boolean;
  onRefresh: () => void; onTrack: (c: string) => void;
  onCreateNew: () => void; showToast: (msg: string, type?: "ok" | "err") => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewPkg, setViewPkg] = useState<Pkg | null>(null);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const filtered = packages.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.code.toLowerCase().includes(q) || (p.sender_name || "").toLowerCase().includes(q) || (p.receiver_name || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete ${code}? This cannot be undone.`)) return;
    setDeletingCode(code);
    const result = await adminDeletePackage(token, code);
    setDeletingCode(null);
    if (result.success) { showToast(`${code} deleted`); onRefresh(); }
    else showToast(result.error ?? "Delete failed", "err");
  };

  const handleStatusChange = async (code: string, status: string) => {
    await adminUpdatePackage(token, code, { status } as Parameters<typeof adminUpdatePackage>[2]);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {editPkg && <EditModal pkg={editPkg} token={token} onClose={() => setEditPkg(null)} onUpdated={() => { setEditPkg(null); onRefresh(); showToast("Shipment updated successfully"); }} />}
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, sender, receiver…"
              className="w-full bg-white/4 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-white/20" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/4 border border-white/8 rounded-lg px-3 py-2 text-xs text-white/50 outline-none">
            {["All", ...ALL_STATUSES].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all">
            <Plus className="w-3.5 h-3.5" /> New Shipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
        {loading && packages.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-white/20">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-8 h-8 text-white/8 mb-3" />
            <p className="text-sm text-white/25">{packages.length === 0 ? "No shipments yet" : "No results"}</p>
            {packages.length === 0 && (
              <button onClick={onCreateNew}
                className="mt-4 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create first shipment
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {["Tracking #","Cargo","Status","Route","Sender","Receiver","Method","Cost","Sub.","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] text-white/20 uppercase tracking-widest font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filtered.map((pkg) => (
                  <tr key={pkg.code} className="hover:bg-white/2 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <code className="text-xs font-mono text-white/70">{pkg.code}</code>
                        {pkg.paused && <span className="text-[8px] text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded px-1">PAUSED</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <CargoBadge type={pkg.cargo_type ?? "road"} />
                    </td>
                    <td className="px-4 py-3.5">
                      <select value={pkg.status} onChange={(e) => handleStatusChange(pkg.code, e.target.value)}
                        className="bg-transparent text-[10px] text-white/50 border border-white/8 rounded-md px-2 py-1 outline-none hover:border-white/20 cursor-pointer">
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-white/35">{pkg.origin} → {pkg.destination}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-white/50">{pkg.sender_name || "—"}</div>
                      {pkg.sender_email && <div className="text-[9px] text-white/25">{pkg.sender_email}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-white/50">{pkg.receiver_name || "—"}</div>
                      {pkg.receiver_email && <div className="text-[9px] text-white/25">{pkg.receiver_email}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] text-white/35">{pkg.delivery_method || "Standard"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-white/50 font-mono">${Number(pkg.shipping_cost || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-white/30">{pkg.subscriber_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditPkg(pkg)}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => setViewPkg(pkg)}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-purple-400 transition-colors">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button onClick={() => onTrack(pkg.code)}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-indigo-400 transition-colors">
                          <Globe className="w-3 h-3" /> Track
                        </button>
                        <button onClick={() => handleDelete(pkg.code)} disabled={deletingCode === pkg.code}
                          className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors disabled:opacity-50">
                          {deletingCode === pkg.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewPkg && <ShipmentDetailModal pkg={viewPkg} onClose={() => setViewPkg(null)} onTrack={(c) => { setViewPkg(null); onTrack(c); }} />}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ packages }: { packages: Pkg[] }) {
  const total = packages.reduce((s, p) => s + Number(p.shipping_cost || 0), 0);
  const paid = packages.filter((p) => p.status === "Delivered").reduce((s, p) => s + Number(p.shipping_cost || 0), 0);
  const pending = total - paid;

  const PAYMENT_METHODS = [
    { name: "Credit Card", icon: CreditCard, desc: "Visa, Mastercard, Amex", status: "Active" },
    { name: "Bank Transfer", icon: DollarSign, desc: "ACH / Wire transfer", status: "Active" },
    { name: "PayPal", icon: Globe, desc: "PayPal account", status: "Active" },
    { name: "Crypto", icon: Zap, desc: "Bitcoin, Ethereum", status: "Coming soon" },
  ];

  return (
    <div className="space-y-5">
      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `$${total.toFixed(2)}`, color: "text-white/80", bg: "bg-white/4 border-white/8" },
          { label: "Collected", value: `$${paid.toFixed(2)}`, color: "text-green-400", bg: "bg-green-500/8 border-green-500/15" },
          { label: "Pending", value: `$${pending.toFixed(2)}`, color: "text-yellow-400", bg: "bg-yellow-500/8 border-yellow-500/15" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className={`text-2xl font-bold mb-1 ${color}`}>{value}</div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Invoices */}
      <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-white/30" />
          <span className="text-sm font-medium text-white/70">Invoices</span>
          <span className="text-xs text-white/20">({packages.length})</span>
        </div>
        {packages.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/20">No invoices yet</div>
        ) : (
          <div className="divide-y divide-white/4">
            {packages.map((pkg, i) => {
              const isPaid = pkg.status === "Delivered";
              const invNum = `INV-${String(i + 1001).padStart(4, "0")}`;
              return (
                <div key={pkg.code} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/4 border border-white/8 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-white/30" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-white/60">{invNum}</div>
                      <div className="text-[10px] text-white/30 truncate">{pkg.code} · {pkg.receiver_name || pkg.destination}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-semibold text-white/70 font-mono">${Number(pkg.shipping_cost || 0).toFixed(2)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isPaid ? "text-green-400 bg-green-500/10 border-green-500/25" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/25"}`}>
                      {isPaid ? "Paid" : "Pending"}
                    </span>
                    <button className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors">
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment methods */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Payment Methods</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_METHODS.map(({ name, icon: Icon, desc, status }) => (
            <div key={name} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/6">
              <div className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-white/40" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-white/60 font-medium">{name}</div>
                <div className="text-[9px] text-white/25">{desc}</div>
              </div>
              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${status === "Active" ? "text-green-400 bg-green-500/10" : "text-white/25 bg-white/5"}`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Customs document generator ───────────────────────────────────────────────

const CUSTOMS_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 40px; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 28px; }
  .logo { font-size: 17px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .logo span { color: #dc2626; }
  .meta { text-align: right; font-size: 10px; color: #888; line-height: 1.8; }
  .meta strong { color: #111; font-size: 11px; display: block; margin-bottom: 2px; }
  .doc-title { font-size: 22px; font-weight: 300; letter-spacing: -0.01em; margin-bottom: 3px; }
  .doc-sub { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.12em; }
  .sec { margin-bottom: 26px; }
  .sec-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #999; border-bottom: 1px solid #e5e5e5; padding-bottom: 5px; margin-bottom: 14px; }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 36px; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 24px; }
  .g4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px 20px; }
  .fl { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
  .fv { font-size: 11px; color: #111; font-weight: 500; min-height: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 3px; }
  .fv-blank { min-height: 24px; border-bottom: 1px solid #ccc; }
  .party-box { border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px; }
  .party-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #dc2626; margin-bottom: 10px; }
  .blank-line { border-bottom: 1px solid #bbb; min-height: 22px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10.5px; }
  th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; border-bottom: 2px solid #e5e5e5; border-top: 1px solid #e5e5e5; padding: 7px 8px; text-align: left; background: #fafafa; }
  td { padding: 10px 8px; border-bottom: 1px solid #ebebeb; vertical-align: top; }
  .notice { background: #f9f9f9; border-left: 3px solid #dc2626; padding: 10px 14px; font-size: 10px; color: #555; line-height: 1.6; margin-top: 4px; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 50px; }
  .sig-line { border-top: 1px solid #999; padding-top: 6px; font-size: 9px; color: #888; }
  .ftr { margin-top: 36px; border-top: 1px solid #e5e5e5; padding-top: 14px; display: flex; justify-content: space-between; font-size: 9px; color: #bbb; }
  .req-badge { display:inline-block; background:#fff0f0; border:1px solid #fca5a5; color:#dc2626; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; padding:2px 7px; border-radius:20px; margin-left:8px; vertical-align:middle; }
  @media print { body { padding: 24px; } }
`;

function generateCustomsDoc(ref: string, now: string) {
  const refNo = `${ref}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const hdr = (title: string, sub: string, pages: number) => `
    <div class="hdr">
      <div>
        <div class="logo">Tesla<span>Track</span></div>
        <div style="font-size:9px;color:#888;margin-top:4px;letter-spacing:0.1em;">PRECISION FLEET LOGISTICS</div>
      </div>
      <div class="meta">
        <strong>${title.toUpperCase()}</strong>
        Ref: ${refNo}<br/>Issued: ${now}<br/>Pages: ${pages}
      </div>
    </div>
    <div class="sec" style="margin-bottom:10px;">
      <div class="doc-title">${title}</div>
      <div class="doc-sub">${sub}</div>
    </div>`;

  const party = (label: string) => `
    <div class="party-box">
      <div class="party-label">${label}</div>
      <div class="fl">Name / Company</div><div class="blank-line"></div>
      <div class="fl">Address</div><div class="blank-line"></div>
      <div class="fl">City, Country, Postal Code</div><div class="blank-line"></div>
      <div class="fl" style="margin-top:2px">Contact / Email</div><div class="blank-line"></div>
    </div>`;

  const ftr = () => `
    <div class="ftr">
      <span>TeslaTrack · Precision Fleet Logistics · ${refNo}</span>
      <span>Generated ${now} · Complete all fields before submission</span>
    </div>`;

  const bodies: Record<string, string> = {
    INV: `
      ${hdr("Commercial Invoice", "Value Declaration Form — Required", 1)}
      <div class="sec">
        <div class="sec-title">Invoice Details</div>
        <div class="g3">
          <div><div class="fl">Invoice No.</div><div class="fv-blank"></div></div>
          <div><div class="fl">Invoice Date</div><div class="fv">${now}</div></div>
          <div><div class="fl">Payment Terms</div><div class="fv-blank"></div></div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-title">Parties</div>
        <div class="g2">${party("Seller / Exporter")}${party("Buyer / Importer")}</div>
      </div>
      <div class="sec">
        <div class="sec-title">Line Items</div>
        <table>
          <thead><tr><th>#</th><th>Description of Goods</th><th>HS Code</th><th>Country of Origin</th><th>Qty</th><th>Unit Price</th><th>Total Value</th></tr></thead>
          <tbody>
            <tr><td>1</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>2</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>3</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td colspan="5" style="text-align:right;font-size:9px;color:#999;">TOTAL (USD)</td><td colspan="2" style="font-weight:700;"></td></tr>
          </tbody>
        </table>
      </div>
      <div class="notice">I hereby certify that the information on this invoice is true and correct and that the contents and value of this shipment are as stated above.</div>
      <div class="sig-row">
        <div class="sig-line">Authorized Signature</div>
        <div class="sig-line">Title / Position</div>
        <div class="sig-line">Date</div>
      </div>
      ${ftr()}`,

    PKL: `
      ${hdr("Packing List", "Contents Itemization — Required", 1)}
      <div class="sec">
        <div class="sec-title">Shipment Reference</div>
        <div class="g4">
          <div><div class="fl">Tracking / Ref No.</div><div class="fv-blank"></div></div>
          <div><div class="fl">Ship Date</div><div class="fv">${now}</div></div>
          <div><div class="fl">Carrier</div><div class="fv-blank"></div></div>
          <div><div class="fl">Delivery Method</div><div class="fv-blank"></div></div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-title">Parties</div>
        <div class="g2">${party("Shipper / Exporter")}${party("Consignee / Receiver")}</div>
      </div>
      <div class="sec">
        <div class="sec-title">Package Contents</div>
        <table>
          <thead><tr><th>Pkg #</th><th>Description of Contents</th><th>Qty</th><th>Unit</th><th>Net Weight</th><th>Gross Weight</th><th>Dimensions (cm)</th></tr></thead>
          <tbody>
            <tr><td>1</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>2</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>3</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td colspan="3" style="font-weight:700;">Totals</td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div class="notice">Special handling instructions: Handle with care. Keep upright. Reference the tracking number on all correspondence.</div>
      <div class="sig-row">
        <div class="sig-line">Packed By</div>
        <div class="sig-line">Verified By</div>
        <div class="sig-line">Date Packed</div>
      </div>
      ${ftr()}`,

    COO: `
      ${hdr("Certificate of Origin", "Country of Manufacture Declaration", 1)}
      <div class="sec">
        <div class="sec-title">Exporter / Producer</div>
        ${party("Exporter / Producer")}
      </div>
      <div class="sec">
        <div class="sec-title">Consignee</div>
        ${party("Consignee")}
      </div>
      <div class="sec">
        <div class="sec-title">Goods Description</div>
        <table>
          <thead><tr><th>#</th><th>Description of Goods</th><th>HS Code</th><th>Country of Origin</th><th>Quantity</th><th>Net Weight</th></tr></thead>
          <tbody>
            <tr><td>1</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>2</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>3</td><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div class="sec">
        <div class="sec-title">Declaration</div>
        <div class="g3">
          <div><div class="fl">Country of Origin</div><div class="fv-blank"></div></div>
          <div><div class="fl">Transport Route</div><div class="fv-blank"></div></div>
          <div><div class="fl">Certificate Date</div><div class="fv">${now}</div></div>
        </div>
      </div>
      <div class="notice">I, the undersigned, declare that the goods described above were produced or manufactured in the stated country of origin in accordance with the rules of origin provisions.</div>
      <div class="sig-row">
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-line">Chamber of Commerce Stamp</div>
        <div class="sig-line">Date of Issue</div>
      </div>
      ${ftr()}`,

    BOL: `
      ${hdr("Bill of Lading", "Master Transport Document — Required", 2)}
      <div class="sec">
        <div class="sec-title">Parties</div>
        <div class="g2">${party("Shipper / Exporter")}${party("Consignee / Receiver")}</div>
      </div>
      <div class="sec">
        <div class="sec-title">Transport Details</div>
        <div class="g3">
          <div><div class="fl">Carrier / Vessel</div><div class="fv-blank"></div></div>
          <div><div class="fl">Voyage / Flight No.</div><div class="fv-blank"></div></div>
          <div><div class="fl">Bill of Lading No.</div><div class="fv">${refNo}</div></div>
          <div><div class="fl">Port of Loading</div><div class="fv-blank"></div></div>
          <div><div class="fl">Port of Discharge</div><div class="fv-blank"></div></div>
          <div><div class="fl">ETA</div><div class="fv-blank"></div></div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-title">Cargo Description</div>
        <table>
          <thead><tr><th>Marks &amp; Numbers</th><th>Description of Goods</th><th>No. of Packages</th><th>Gross Weight</th><th>Measurement</th></tr></thead>
          <tbody>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div class="notice">Received by the carrier from the shipper in apparent good order and condition unless otherwise noted herein. In accepting this Bill of Lading, the shipper agrees to all terms and conditions. This Bill of Lading is non-negotiable unless consigned "to order".</div>
      <div class="sig-row">
        <div class="sig-line">Shipper Signature &amp; Date</div>
        <div class="sig-line">Carrier Authorized Agent</div>
        <div class="sig-line">Place &amp; Date of Issue</div>
      </div>
      ${ftr()}`,

    IMP: `
      ${hdr("Import License", "If Applicable — Submit with Customs Filing", 1)}
      <div class="sec">
        <div class="sec-title">License Details</div>
        <div class="g4">
          <div><div class="fl">License No.</div><div class="fv-blank"></div></div>
          <div><div class="fl">Issue Date</div><div class="fv-blank"></div></div>
          <div><div class="fl">Expiry Date</div><div class="fv-blank"></div></div>
          <div><div class="fl">Issuing Authority</div><div class="fv-blank"></div></div>
        </div>
      </div>
      <div class="sec">
        <div class="sec-title">Importer Details</div>
        ${party("Licensed Importer")}
      </div>
      <div class="sec">
        <div class="sec-title">Goods Covered Under This License</div>
        <table>
          <thead><tr><th>Description of Goods</th><th>HS Code</th><th>Country of Export</th><th>Quantity Authorized</th><th>Value (USD)</th></tr></thead>
          <tbody>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div class="sec">
        <div class="sec-title">License Conditions</div>
        <div class="g2">
          <div><div class="fl">Port of Entry</div><div class="fv-blank"></div></div>
          <div><div class="fl">End-Use Restriction</div><div class="fv-blank"></div></div>
        </div>
      </div>
      <div class="notice">This license must accompany all shipment documentation. Present to customs authorities upon request. Any unauthorized transfer or modification invalidates this license.</div>
      <div class="sig-row">
        <div class="sig-line">Issuing Officer Signature</div>
        <div class="sig-line">Official Stamp</div>
        <div class="sig-line">Date of Issue</div>
      </div>
      ${ftr()}`,
  };

  const body = bodies[ref] ?? "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${CUSTOMS_CSS}</style></head><body>${body}</body></html>`;

  const win = window.open("", "_blank", "width=860,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ─── Customs Tab ──────────────────────────────────────────────────────────────

function CustomsTab({ packages }: { packages: Pkg[] }) {
  const cleared = packages.filter((p) => p.customs_status === "Cleared").length;
  const held = packages.filter((p) => p.customs_status === "Held").length;
  const inReview = packages.filter((p) => p.customs_status === "In Review").length;
  const pending = packages.filter((p) => p.customs_status === "Pending").length;
  const totalFees = packages.reduce((s, p) => s + Number(p.customs_fee || 0), 0);

  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const DOCS = [
    { name: "Commercial Invoice",   desc: "Value declaration form",    required: true,  ref: "INV" },
    { name: "Packing List",         desc: "Contents itemization",      required: true,  ref: "PKL" },
    { name: "Certificate of Origin",desc: "Country of manufacture",    required: false, ref: "COO" },
    { name: "Bill of Lading",       desc: "Transport document",        required: true,  ref: "BOL" },
    { name: "Import License",       desc: "If applicable",             required: false, ref: "IMP" },
  ];

  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Cleared", value: cleared, color: "text-green-400 bg-green-500/8 border-green-500/15" },
          { label: "In Review", value: inReview, color: "text-yellow-400 bg-yellow-500/8 border-yellow-500/15" },
          { label: "Held", value: held, color: "text-red-400 bg-red-500/8 border-red-500/15" },
          { label: "Pending", value: pending, color: "text-white/40 bg-white/4 border-white/8" },
          { label: "Total Fees", value: `$${totalFees.toFixed(2)}`, color: "text-orange-400 bg-orange-500/8 border-orange-500/15" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-3.5 ${color.split(" ").slice(1).join(" ")}`}>
            <div className={`text-xl font-bold mb-0.5 ${color.split(" ")[0]}`}>{value}</div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Per-shipment customs */}
      <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/30" />
          <span className="text-sm font-medium text-white/70">Clearance Status per Shipment</span>
        </div>
        {packages.length === 0 ? (
          <div className="py-12 text-center text-xs text-white/20">No shipments</div>
        ) : (
          <div className="divide-y divide-white/4">
            {packages.map((pkg) => (
              <div key={pkg.code} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <code className="text-xs font-mono text-white/60">{pkg.code}</code>
                  <div className="text-[10px] text-white/30 mt-0.5">{pkg.origin} → {pkg.destination}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-white/40 font-mono">${Number(pkg.customs_fee || 0).toFixed(2)}</div>
                    <div className="text-[9px] text-white/20">Fee</div>
                  </div>
                  <CustomsBadge status={pkg.customs_status || "Pending"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Required documents */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Required Customs Documents</span>
        </div>
        <p className="text-[10px] text-white/25 mb-4 ml-6">Generate a blank fillable template or upload an existing file for each document.</p>
        <div className="space-y-2">
          {DOCS.map(({ name, desc, required, ref }) => {
            const file = uploaded[ref];
            return (
              <div key={ref} className="flex items-center justify-between p-3.5 bg-white/3 rounded-xl border border-white/5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/65 font-medium">{name}</span>
                      {required && (
                        <span className="text-[8px] text-red-400/80 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide font-semibold">Required</span>
                      )}
                    </div>
                    <div className="text-[9px] text-white/25 mt-0.5">{desc}</div>
                    {file && (
                      <div className="text-[9px] text-green-400/70 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {file}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => generateCustomsDoc(ref, now)}
                    className="text-[10px] text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 rounded px-2.5 py-1 transition-all"
                  >
                    Generate
                  </button>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg"
                    className="hidden"
                    ref={(el) => { fileRefs.current[ref] = el; }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setUploaded((prev) => ({ ...prev, [ref]: f.name }));
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[ref]?.click()}
                    className="text-[10px] text-white/35 hover:text-white/65 border border-white/10 hover:border-white/20 rounded px-2.5 py-1 transition-all"
                  >
                    {file ? "Replace" : "Upload"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────────────────────────

function SupportTab() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const FAQS = [
    { q: "How do I track my shipment?", a: "Enter your tracking code on the home page or use a direct URL like /?code=YOUR-CODE. Real-time updates appear on the live map." },
    { q: "How long until my package arrives?", a: "ETA is shown on your tracking page. Updates are made as the shipment progresses through each stage." },
    { q: "What do the status stages mean?", a: "Order Received → Processing → In Transit → Customs Clearance → Out for Delivery → Delivered. Each stage is updated in real time." },
    { q: "How do I get email alerts?", a: "On the tracking screen, open the side drawer and click the Alerts tab. Enter your email to receive delivery updates." },
    { q: "How are customs fees calculated?", a: "Customs fees depend on the shipment value, contents, and destination country regulations. They are set per shipment in the admin portal." },
    { q: "Can I change my delivery address?", a: "Contact support immediately with your tracking code. Changes may be possible if the shipment hasn't left the origin warehouse." },
  ];

  const CONTACTS = [
    { icon: Mail, label: "Email Support", value: "support@teslatrack.io", action: "mailto:support@teslatrack.io" },
    { icon: Phone, label: "Phone", value: "+1 (800) TESLA-01", action: "tel:+18008375201" },
    { icon: Globe, label: "Help Center", value: "help.teslatrack.io", action: "#" },
    { icon: MessageSquare, label: "Live Chat", value: "Available 24/7", action: "#" },
  ];

  return (
    <div className="space-y-5">
      {/* Contact options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONTACTS.map(({ icon: Icon, label, value, action }) => (
          <a key={label} href={action}
            className="flex flex-col items-center gap-2 p-4 bg-[#111] border border-white/6 rounded-2xl hover:border-white/15 transition-all text-center group">
            <div className="w-9 h-9 rounded-xl bg-red-500/12 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
              <Icon className="w-4 h-4 text-red-400/70" />
            </div>
            <div className="text-xs font-medium text-white/60">{label}</div>
            <div className="text-[9px] text-white/30">{value}</div>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Frequently Asked Questions</span>
        </div>
        <div className="divide-y divide-white/4">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors">
                <span className="text-xs text-white/65 pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="w-3.5 h-3.5 text-white/25 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-[11px] text-white/35 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact form */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Send a Message</span>
        </div>
        {submitted ? (
          <div className="flex items-center gap-3 py-4 text-green-300">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <div className="text-sm font-medium">Message sent!</div>
              <div className="text-xs text-green-400/60">We'll respond within 24 hours.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Name</label>
                <input value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your name" className="field-input" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input type="email" value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="your@email.com" className="field-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea value={contactForm.message} onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="How can we help?" rows={4}
                className="field-input resize-none" />
            </div>
            <button onClick={() => setSubmitted(true)} disabled={!contactForm.name || !contactForm.email || !contactForm.message}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-xs font-medium transition-all">
              <Send className="w-3.5 h-3.5" /> Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const FEATURES = [
    { icon: Shield, label: "Admin Authentication", desc: "Password-protected admin portal with session storage", status: "Active" },
    { icon: Lock, label: "SSL / HTTPS Encryption", desc: "All data transmitted over encrypted connections", status: "Active" },
    { icon: Wifi, label: "Real-time GPS Tracking", desc: "Live vehicle position simulation with bearing & speed", status: "Active" },
    { icon: Bell, label: "Push Notifications", desc: "Email alerts via Resend API on delivery events", status: "Active" },
    { icon: QrCode, label: "QR Code Tracking", desc: "Deep-link URLs for instant tracking access", status: "Active" },
    { icon: Globe, label: "Multi-language Support", desc: "Interface localization for global shipments", status: "Planned" },
    { icon: Star, label: "Delivery Proof Upload", desc: "Photo confirmation on successful delivery", status: "Planned" },
    { icon: Languages, label: "Dark Mode", desc: "Full dark-themed interface throughout", status: "Active" },
  ];

  const COMMON_PAGES = [
    { name: "Home / Tracker", path: "/", desc: "Public tracking search" },
    { name: "Live Tracking", path: "/?code=XXX", desc: "Real-time shipment map" },
    { name: "Admin Dashboard", path: "/admin", desc: "Shipment management" },
    { name: "About", path: "#", desc: "Company information" },
    { name: "Pricing", path: "#", desc: "Shipping rates" },
    { name: "Contact", path: "#", desc: "Get in touch" },
  ];

  return (
    <div className="space-y-5">
      {/* Security features */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Security & Premium Features</span>
        </div>
        <div className="space-y-2">
          {FEATURES.map(({ icon: Icon, label, desc, status }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-white/2 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-white/35" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/65 font-medium">{label}</div>
                <div className="text-[9px] text-white/30">{desc}</div>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 ${status === "Active" ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-white/25 bg-white/5 border border-white/8"}`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Site pages */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Site Pages</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {COMMON_PAGES.map(({ name, path, desc }) => (
            <a key={name} href={path}
              className="p-3 bg-white/3 rounded-lg border border-white/5 hover:border-white/15 transition-all">
              <div className="text-xs text-white/60 font-medium">{name}</div>
              <div className="text-[9px] text-white/25 mt-0.5">{desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Admin account */}
      <div className="bg-[#111] border border-white/6 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-white/30" />
          <span className="text-sm font-medium text-white/70">Admin Account</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/3 rounded-lg border border-white/5">
            <div>
              <div className="text-xs text-white/60">Session Status</div>
              <div className="text-[10px] text-green-400/70 mt-0.5">Authenticated · Session active</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-600/30 text-red-400 hover:bg-red-600/10 text-sm font-medium transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px]">
          <div>
            <div className="text-white/25 mb-1.5 uppercase tracking-wider text-[9px]">Company</div>
            <div className="text-white/40">TeslaTrack Inc.</div>
            <div className="text-white/25">1 Tesla Road</div>
            <div className="text-white/25">Palo Alto, CA 94301</div>
          </div>
          <div>
            <div className="text-white/25 mb-1.5 uppercase tracking-wider text-[9px]">Legal</div>
            <a href="#" className="block text-white/35 hover:text-white/60 mb-1">Terms & Conditions</a>
            <a href="#" className="block text-white/35 hover:text-white/60 mb-1">Privacy Policy</a>
            <a href="#" className="block text-white/35 hover:text-white/60">Cookie Policy</a>
          </div>
          <div>
            <div className="text-white/25 mb-1.5 uppercase tracking-wider text-[9px]">Social</div>
            <a href="#" className="block text-white/35 hover:text-white/60 mb-1">Twitter / X</a>
            <a href="#" className="block text-white/35 hover:text-white/60 mb-1">LinkedIn</a>
            <a href="#" className="block text-white/35 hover:text-white/60">Instagram</a>
          </div>
          <div>
            <div className="text-white/25 mb-1.5 uppercase tracking-wider text-[9px]">Support</div>
            <div className="text-white/35">support@teslatrack.io</div>
            <div className="text-white/25 mt-1">Mon–Fri 9am–6pm PST</div>
            <div className="text-white/25">Emergency: 24/7</div>
          </div>
        </div>
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tesla-logo.png" alt="TeslaTrack" className="logo-spin w-5 h-5 object-contain opacity-40" />
            <span className="text-[10px] text-white/25">Tesla<span className="text-red-500/50">Track</span> © 2026</span>
          </div>
          <span className="text-[9px] text-white/15">All rights reserved</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminPage({ onBack, onTrack }: { onBack: () => void; onTrack: (code: string) => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (t: string) => { sessionStorage.setItem("admin_token", t); setToken(t); };
  const handleLogout = () => { sessionStorage.removeItem("admin_token"); setToken(""); };

  const loadPackages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const list = await adminListPackages(token);
    setPackages(list);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  const NAV_ITEMS: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "shipments", label: "Shipments", icon: Package },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "customs", label: "Customs", icon: Globe },
    { id: "support", label: "Support", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const TAB_LABELS: Record<AdminTab, string> = {
    dashboard: "Dashboard",
    shipments: "Shipments",
    payments: "Payments & Invoices",
    customs: "Customs & Clearance",
    support: "Support & FAQ",
    settings: "Settings & Security",
  };

  return (
    <div className="h-dvh bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-xl ${
          toast.type === "ok" ? "bg-green-600/15 border-green-500/30 text-green-300" : "bg-red-600/15 border-red-500/30 text-red-300"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {toast.msg}
        </div>
      )}

      {/* Top nav */}
      <nav className="border-b border-white/6 bg-[#0a0a0a] sticky top-0 z-40 flex-shrink-0">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
              ← Back
            </button>
            <div className="w-px h-4 bg-white/8" />
            <div className="flex items-center gap-2">
              <img src="/tesla-logo.png" alt="TeslaTrack" className="logo-spin w-8 h-8 object-contain" />
              <span className="text-xs font-semibold tracking-widest uppercase hidden sm:inline">
                Tesla<span className="text-red-500">Track</span>
                <span className="text-white/20 ml-2 font-normal">Admin</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:flex items-center gap-1.5 text-[10px] text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {packages.length} shipments
            </span>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Shipment</span>
            </button>
            <button onClick={handleLogout} className="text-white/25 hover:text-white/60 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-52 border-r border-white/6 bg-[#0d0d0d] flex-shrink-0 hidden md:flex flex-col py-4">
          <nav className="flex-1 px-2 space-y-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  tab === id ? "bg-red-600/15 text-red-300 border border-red-600/20" : "text-white/40 hover:text-white/70 hover:bg-white/4"
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
          <div className="px-3 py-3 border-t border-white/6">
            <div className="flex items-center gap-2">
              <img src="/tesla-logo.png" alt="" className="logo-spin w-5 h-5 object-contain opacity-40" />
              <span className="text-[9px] text-white/20 uppercase tracking-widest">TeslaTrack</span>
            </div>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0d0d0d] border-t border-white/8 flex">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] transition-all ${
                tab === id ? "text-red-400" : "text-white/30"
              }`}>
              <Icon className="w-4 h-4" />
              <span className="hidden">{label}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-semibold text-white/90">{TAB_LABELS[tab]}</h1>
                <p className="text-[10px] text-white/25 mt-0.5">
                  {tab === "dashboard" && "Overview of your logistics operations"}
                  {tab === "shipments" && `${packages.length} total shipments`}
                  {tab === "payments" && `$${packages.reduce((s, p) => s + Number(p.shipping_cost || 0), 0).toFixed(2)} total revenue`}
                  {tab === "customs" && `${packages.filter((p) => p.customs_status === "Held").length} held · ${packages.filter((p) => p.customs_status === "Cleared").length} cleared`}
                  {tab === "support" && "Help center and contact options"}
                  {tab === "settings" && "Security, features, and site pages"}
                </p>
              </div>
              <button onClick={loadPackages} disabled={loading} className="text-white/25 hover:text-white/60 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {tab === "dashboard" && (
              <DashboardTab packages={packages} onCreateNew={() => setShowCreate(true)} onRefresh={loadPackages} loading={loading} />
            )}
            {tab === "shipments" && (
              <ShipmentsTab packages={packages} token={token} loading={loading} onRefresh={loadPackages} onTrack={onTrack} onCreateNew={() => setShowCreate(true)} showToast={showToast} />
            )}
            {tab === "payments" && <PaymentsTab packages={packages} />}
            {tab === "customs" && <CustomsTab packages={packages} />}
            {tab === "support" && <SupportTab />}
            {tab === "settings" && <SettingsTab onLogout={handleLogout} />}
          </div>
        </main>
      </div>

      {showCreate && (
        <CreateModal token={token} onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); showToast("Shipment created!"); loadPackages(); }} />
      )}
    </div>
  );
}
