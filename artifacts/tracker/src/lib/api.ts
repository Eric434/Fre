export async function subscribeToAlerts(payload: {
  email: string;
  trackingCode: string;
  status: string;
  eta: string;
  from: string;
  to: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/notify/subscribe", {
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
