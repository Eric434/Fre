import { useState, useEffect, useCallback } from "react";
import {
  Lock, Plus, Trash2, LogOut, Package, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, RefreshCw, X, Eye,
} from "lucide-react";
import {
  adminLogin, adminListPackages, adminCreatePackage,
  adminDeletePackage, adminUpdatePackage, type Package as Pkg,
} from "@/lib/api";

// ─── Default route templates ──────────────────────────────────────────────────

const ROUTE_PRESETS: Record<string, { label: string; route: [number, number][]; origin: string; destination: string }> = {
  sj_sf: {
    label: "San Jose → San Francisco",
    origin: "San Jose, CA",
    destination: "San Francisco, CA",
    route: [[37.3382,-121.8863],[37.4,-121.92],[37.45,-121.95],[37.51,-121.97],[37.55,-121.98],[37.59,-122.05],[37.63,-122.12],[37.68,-122.19],[37.72,-122.27],[37.75,-122.35],[37.7749,-122.4194]],
  },
  la_sf: {
    label: "Los Angeles → San Francisco",
    origin: "Los Angeles, CA",
    destination: "San Francisco, CA",
    route: [[34.0522,-118.2437],[34.6,-118.6],[35.2,-119.0],[35.65,-119.3],[35.9,-119.5],[36.3,-119.8],[36.7,-120.1],[37.1,-120.6],[37.4,-121.1],[37.6,-121.9],[37.7749,-122.4194]],
  },
  portland_sf: {
    label: "Portland → San Francisco",
    origin: "Portland, OR",
    destination: "San Francisco, CA",
    route: [[45.5051,-122.675],[44.0,-122.3],[42.8,-122.0],[41.5,-122.15],[40.3,-122.3],[39.2,-122.4],[38.5,-122.5],[38.0,-122.48],[37.7749,-122.4194]],
  },
  seattle_la: {
    label: "Seattle → Los Angeles",
    origin: "Seattle, WA",
    destination: "Los Angeles, CA",
    route: [[47.6062,-122.3321],[46.2,-122.0],[44.5,-121.5],[42.5,-121.0],[40.5,-120.5],[38.5,-119.8],[36.5,-119.0],[35.0,-118.5],[34.0522,-118.2437]],
  },
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "0123456789";
  const r = (s: string, n: number) => Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join("");
  return `TSL-${r(nums, 4)}-${r(chars, 2)}`;
}

// ─── Blank new-package form state ─────────────────────────────────────────────

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
    routePreset: "sj_sf",
    events: [
      { time_label: "", label: "Order dispatched", location: "Merchant", done: true, sort_order: 0 },
      { time_label: "", label: "Processing at origin", location: "", done: false, sort_order: 1 },
      { time_label: "", label: "In transit", location: "", done: false, sort_order: 2 },
      { time_label: "", label: "Out for delivery", location: "", done: false, sort_order: 3 },
      { time_label: "", label: "Delivered", location: "", done: false, sort_order: 4 },
    ],
  };
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!pw) return;
    setLoading(true);
    setError("");
    const ok = await adminLogin(pw);
    setLoading(false);
    if (ok) onLogin(pw);
    else setError("Invalid password");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <svg viewBox="0 0 100 120" className="w-6 h-7 text-red-600" fill="none">
              <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold tracking-widest uppercase">
              Tesla<span className="text-red-500">Track</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white/90 mb-1">Admin Portal</h1>
          <p className="text-xs text-white/30">Enter your admin password to continue</p>
        </div>

        <div className="bg-[#111] border border-white/8 rounded-2xl p-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Admin password"
              className="w-full bg-white/3 border border-white/8 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-red-600/40"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!pw || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white text-sm font-medium transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "delivered"
      ? "text-green-400 bg-green-500/10 border-green-500/20"
      : s === "out for delivery"
      ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
      : s === "in transit"
      ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
      : "text-white/40 bg-white/5 border-white/8";
  return (
    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

// ─── Create package modal ─────────────────────────────────────────────────────

function CreateModal({
  token,
  onClose,
  onCreated,
}: {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(blankForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const preset = ROUTE_PRESETS[form.routePreset];

  const handleCreate = async () => {
    if (!form.code || !form.eta) { setError("Code and ETA are required"); return; }
    setLoading(true);
    setError("");
    const result = await adminCreatePackage(token, {
      code: form.code,
      status: form.status,
      eta: form.eta,
      origin: form.origin || preset.origin,
      destination: form.destination || preset.destination,
      carrier: form.carrier,
      weight: form.weight || "—",
      speed_kph: Number(form.speed_kph),
      start_progress: Number(form.start_progress),
      route: preset.route,
      events: form.events.map((e, i) => ({ ...e, sort_order: i })),
    });
    setLoading(false);
    if (result.success) onCreated();
    else setError(result.error ?? "Failed to create");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-white/90">New Tracking Code</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Code + Status row */}
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
                {["Processing","In Transit","Out for Delivery","Delivered"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ETA + Weight */}
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

          {/* Route preset */}
          <div>
            <label className="field-label">Route</label>
            <select value={form.routePreset} onChange={(e) => {
              set("routePreset", e.target.value);
              const p = ROUTE_PRESETS[e.target.value];
              set("origin", p.origin);
              set("destination", p.destination);
            }} className="field-input">
              {Object.entries(ROUTE_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/20 mt-1">{preset.origin} → {preset.destination}</p>
          </div>

          {/* Speed + Start progress */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Speed (km/h)</label>
              <input type="number" value={form.speed_kph} onChange={(e) => set("speed_kph", e.target.value)}
                className="field-input" />
            </div>
            <div>
              <label className="field-label">Start Progress (0–1)</label>
              <input type="number" step="0.01" min="0" max="1" value={form.start_progress}
                onChange={(e) => set("start_progress", e.target.value)} className="field-input" />
            </div>
          </div>

          {/* Carrier */}
          <div>
            <label className="field-label">Carrier</label>
            <input value={form.carrier} onChange={(e) => set("carrier", e.target.value)}
              className="field-input" />
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Events / Timeline</label>
              <button
                onClick={() => set("events", [...form.events, { time_label: "", label: "", location: "", done: false, sort_order: form.events.length }])}
                className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {form.events.map((ev, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={ev.done}
                    onChange={(e) => {
                      const evs = [...form.events];
                      evs[i] = { ...evs[i], done: e.target.checked };
                      set("events", evs);
                    }}
                    className="flex-shrink-0 accent-red-600"
                  />
                  <input
                    value={ev.label}
                    onChange={(e) => {
                      const evs = [...form.events];
                      evs[i] = { ...evs[i], label: e.target.value };
                      set("events", evs);
                    }}
                    placeholder="Event label"
                    className="field-input flex-1 text-[11px] py-1.5"
                  />
                  <input
                    value={ev.location}
                    onChange={(e) => {
                      const evs = [...form.events];
                      evs[i] = { ...evs[i], location: e.target.value };
                      set("events", evs);
                    }}
                    placeholder="Location"
                    className="field-input w-36 text-[11px] py-1.5"
                  />
                  <input
                    value={ev.time_label}
                    onChange={(e) => {
                      const evs = [...form.events];
                      evs[i] = { ...evs[i], time_label: e.target.value };
                      set("events", evs);
                    }}
                    placeholder="Time"
                    className="field-input w-24 text-[11px] py-1.5"
                  />
                  <button
                    onClick={() => set("events", form.events.filter((_, j) => j !== i))}
                    className="text-white/15 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/8 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-medium transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {loading ? "Creating…" : "Create tracking code"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminPage({
  onBack,
  onTrack,
}: {
  onBack: () => void;
  onTrack: (code: string) => void;
}) {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [packages, setPackages] = useState<(Pkg & { subscriber_count?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (t: string) => {
    sessionStorage.setItem("admin_token", t);
    setToken(t);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    setToken("");
  };

  const loadPackages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const list = await adminListPackages(token);
    setPackages(list);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete ${code}? This cannot be undone.`)) return;
    setDeletingCode(code);
    const result = await adminDeletePackage(token, code);
    setDeletingCode(null);
    if (result.success) { showToast(`${code} deleted`); loadPackages(); }
    else showToast(result.error ?? "Delete failed", "err");
  };

  const handleStatusChange = async (code: string, status: string) => {
    const pkg = packages.find((p) => p.code === code);
    if (!pkg) return;
    await adminUpdatePackage(token, code, { status });
    loadPackages();
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-xl ${
          toast.type === "ok"
            ? "bg-green-600/15 border-green-500/30 text-green-300"
            : "bg-red-600/15 border-red-500/30 text-red-300"
        }`}>
          {toast.type === "ok" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav className="border-b border-white/6 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack}
              className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
              ← Back to tracker
            </button>
            <div className="w-px h-4 bg-white/8" />
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 100 120" className="w-4 h-5 text-red-600" fill="none">
                <path d="M50 10 L50 110 M5 10 Q5 30 50 35 Q95 30 95 10 M5 10 Q25 5 50 5 Q75 5 95 10"
                  stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs font-semibold tracking-widest uppercase">
                Tesla<span className="text-red-500">Track</span>
                <span className="text-white/20 ml-2 font-normal">Admin</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadPackages} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> New Code
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Codes", value: packages.length },
            { label: "In Transit", value: packages.filter((p) => p.status === "In Transit").length },
            { label: "Out for Delivery", value: packages.filter((p) => p.status === "Out for Delivery").length },
            { label: "Delivered", value: packages.filter((p) => p.status === "Delivered").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#111] border border-white/6 rounded-xl p-4">
              <div className="text-2xl font-bold text-white/90 mb-1">{value}</div>
              <div className="text-[10px] text-white/25 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-white/6 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-white/30" />
              <span className="text-sm font-medium text-white/70">Tracking Codes</span>
              <span className="text-xs text-white/20 ml-1">({packages.length})</span>
            </div>
          </div>

          {loading && packages.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/20">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-8 h-8 text-white/8 mb-3" />
              <p className="text-sm text-white/25">No tracking codes yet</p>
              <button onClick={() => setShowCreate(true)}
                className="mt-4 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Create your first code
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Code","Status","Origin → Destination","ETA","Weight","Subscribers","Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[9px] text-white/20 uppercase tracking-widest font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {packages.map((pkg) => (
                    <tr key={pkg.code} className="hover:bg-white/2 transition-colors group">
                      <td className="px-4 py-3.5">
                        <code className="text-xs font-mono text-white/70">{pkg.code}</code>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={pkg.status}
                          onChange={(e) => handleStatusChange(pkg.code, e.target.value)}
                          className="bg-transparent text-[10px] text-white/50 border border-white/8 rounded-md px-2 py-1 outline-none hover:border-white/20 cursor-pointer"
                        >
                          {["Processing","In Transit","Out for Delivery","Delivered"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/40">{pkg.origin} → {pkg.destination}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/40">{pkg.eta}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/30">{pkg.weight}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-white/30">{(pkg as { subscriber_count?: number }).subscriber_count ?? 0}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onTrack(pkg.code)}
                            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-blue-400 transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => handleDelete(pkg.code)}
                            disabled={deletingCode === pkg.code}
                            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {deletingCode === pkg.code
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                            Delete
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
      </div>

      {showCreate && (
        <CreateModal
          token={token}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); showToast("Tracking code created!"); loadPackages(); }}
        />
      )}
    </div>
  );
}
