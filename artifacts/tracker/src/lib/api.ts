const API = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PackageEvent {
  time_label: string;
  label: string;
  location: string;
  done: boolean;
  sort_order: number;
}

export interface Package {
  code: string;
  status: string;
  eta: string;
  origin: string;
  destination: string;
  carrier: string;
  weight: string;
  speed_kph: number;
  start_progress: number;
  route: [number, number][];
  events: PackageEvent[];
  created_at: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_email: string;
  receiver_phone: string;
  receiver_address: string;
  delivery_method: string;
  shipping_cost: number;
  customs_status: string;
  customs_fee: number;
  subscriber_count?: number;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export type FetchPackageResult =
  | { ok: true; pkg: Package }
  | { ok: false; reason: "not_found" | "server_error" | "network_error" };

export async function fetchPackage(code: string): Promise<FetchPackageResult> {
  try {
    const res = await fetch(`${API}/packages/${encodeURIComponent(code.trim().toUpperCase())}`);
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "server_error" };
    return { ok: true, pkg: await res.json() };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export async function notifyDelivered(trackingCode: string): Promise<void> {
  try {
    await fetch(`${API}/notify/delivered`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingCode }),
    });
  } catch {
    // fire-and-forget
  }
}

export async function subscribeToAlerts(payload: {
  email: string;
  trackingCode: string;
  status: string;
  eta: string;
  from: string;
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/notify/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error ?? "Request failed" };
    return { success: true };
  } catch {
    return { success: false, error: "Network error — please try again" };
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function adminHeaders(token: string) {
  return { "Content-Type": "application/json", "x-admin-token": token };
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminListPackages(token: string): Promise<Package[]> {
  try {
    const res = await fetch(`${API}/admin/packages`, {
      headers: adminHeaders(token),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function adminCreatePackage(
  token: string,
  data: Omit<Package, "created_at">
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/admin/packages`, {
      method: "POST",
      headers: adminHeaders(token),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? "Failed" };
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function adminUpdatePackage(
  token: string,
  code: string,
  data: Partial<Omit<Package, "code" | "created_at">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/admin/packages/${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: adminHeaders(token),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? "Failed" };
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function adminDeletePackage(
  token: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/admin/packages/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: adminHeaders(token),
    });
    if (!res.ok) {
      const json = await res.json();
      return { success: false, error: json.error ?? "Failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}
