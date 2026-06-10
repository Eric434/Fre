import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { Pool } from "pg";
import { Resend } from "resend";

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Admin auth ────────────────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["x-admin-token"];
  if (!auth || auth !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function pkgRow(pkg: Record<string, unknown>) {
  return {
    code: pkg.code,
    status: pkg.status,
    eta: pkg.eta,
    origin: pkg.origin,
    destination: pkg.destination,
    carrier: pkg.carrier,
    weight: pkg.weight,
    speed_kph: pkg.speed_kph,
    start_progress: parseFloat(pkg.start_progress as string),
    route: pkg.route,
    sender_name: pkg.sender_name ?? "",
    sender_email: pkg.sender_email ?? "",
    sender_phone: pkg.sender_phone ?? "",
    sender_address: pkg.sender_address ?? "",
    receiver_name: pkg.receiver_name ?? "",
    receiver_email: pkg.receiver_email ?? "",
    receiver_phone: pkg.receiver_phone ?? "",
    receiver_address: pkg.receiver_address ?? "",
    delivery_method: pkg.delivery_method ?? "Standard",
    shipping_cost: parseFloat((pkg.shipping_cost as string) ?? "0"),
    customs_status: pkg.customs_status ?? "Pending",
    customs_fee: parseFloat((pkg.customs_fee as string) ?? "0"),
    cargo_type: (pkg.cargo_type as string) ?? "road",
    notes: (pkg.notes as string) ?? "",
    paused: (pkg.paused as boolean) ?? false,
    created_at: pkg.created_at,
  };
}

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function buildEmailHtml({
  trackingCode, status, eta, from, to, badgeColor, badgeText, headline, bodyText,
}: {
  trackingCode: string; status: string; eta: string; from: string; to: string;
  badgeColor: { bg: string; border: string; text: string };
  badgeText: string; headline: string; bodyText: string;
}) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0d0d0d;border-bottom:1px solid #1a1a1a;padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td><span style="font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#f5f5f5;">Tesla<span style="color:#dc2626;">Track</span></span></td>
          <td align="right"><span style="font-size:10px;color:#555;letter-spacing:0.1em;text-transform:uppercase;">Fleet Logistics</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:32px 32px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:${badgeColor.bg};border:1px solid ${badgeColor.border};border-radius:20px;padding:5px 14px;">
            <span style="font-size:11px;color:${badgeColor.text};letter-spacing:0.1em;text-transform:uppercase;">&#9679; ${badgeText}</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 32px 32px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:300;color:#f5f5f5;letter-spacing:-0.02em;">${headline}</h1>
        <p style="margin:0 0 28px;font-size:28px;font-weight:700;color:#ffffff;font-family:monospace;letter-spacing:0.05em;">${trackingCode}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #1f1f1f;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-bottom:16px;">
                  <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Current Status</div>
                  <div style="font-size:13px;color:#f0f0f0;font-weight:500;">${status}</div>
                </td>
                <td width="50%" style="padding-bottom:16px;">
                  <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Estimated Arrival</div>
                  <div style="font-size:13px;color:#f0f0f0;font-weight:500;">${eta}</div>
                </td>
              </tr>
              <tr>
                <td width="50%">
                  <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Origin</div>
                  <div style="font-size:13px;color:#f0f0f0;">${from}</div>
                </td>
                <td width="50%">
                  <div style="font-size:9px;color:#555;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Destination</div>
                  <div style="font-size:13px;color:#3b82f6;">${to}</div>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:13px;color:#555;line-height:1.7;">${bodyText}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="border-top:1px solid #1a1a1a;"></td></tr></table>
        <p style="margin:0;font-size:11px;color:#333;line-height:1.6;">
          You received this because you subscribed to alerts for <strong style="color:#444;">${trackingCode}</strong> on TeslaTrack.
        </p>
      </td></tr>
      <tr><td style="background:#0d0d0d;border-top:1px solid #1a1a1a;padding:16px 32px;">
        <span style="font-size:10px;color:#333;letter-spacing:0.08em;">TESLATRACK &middot; PRECISION FLEET LOGISTICS</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`.trim();
}

// ─── Health ────────────────────────────────────────────────────────────────────

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// ─── Admin login ───────────────────────────────────────────────────────────────

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ token: process.env.ADMIN_PASSWORD });
});

// ─── Public: get package ───────────────────────────────────────────────────────

app.get("/api/packages/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    const pkgResult = await pool.query("SELECT * FROM packages WHERE code = $1", [code]);
    if (pkgResult.rowCount === 0) {
      res.status(404).json({ error: "Package not found" });
      return;
    }
    const pkg = pkgResult.rows[0];
    const eventsResult = await pool.query(
      "SELECT * FROM package_events WHERE code = $1 ORDER BY sort_order ASC",
      [code]
    );
    res.json({
      ...pkgRow(pkg),
      events: eventsResult.rows.map((e) => ({
        time_label: e.time_label,
        label: e.label,
        location: e.location,
        done: e.done,
        sort_order: e.sort_order,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: list packages ──────────────────────────────────────────────────────

app.get("/api/admin/packages", requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, COUNT(s.id) AS subscriber_count
       FROM packages p
       LEFT JOIN subscribers s ON s.code = p.code
       GROUP BY p.code
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows.map((r) => ({ ...pkgRow(r), subscriber_count: Number(r.subscriber_count) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: create package ─────────────────────────────────────────────────────

app.post("/api/admin/packages", requireAdmin, async (req, res) => {
  const {
    code, status, eta, origin, destination, carrier, weight,
    speed_kph, start_progress, route, events,
    sender_name, sender_email, sender_phone, sender_address,
    receiver_name, receiver_email, receiver_phone, receiver_address,
    delivery_method, shipping_cost, customs_status, customs_fee,
    cargo_type, notes, paused,
  } = req.body as Record<string, unknown> & {
    code: string; origin: string; destination: string;
    route: [number, number][];
    events?: { time_label: string; label: string; location: string; done: boolean; sort_order: number }[];
  };

  if (!code || !origin || !destination || !route || !Array.isArray(route)) {
    res.status(400).json({ error: "code, origin, destination and route are required" });
    return;
  }

  const upperCode = String(code).trim().toUpperCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO packages (
        code, status, eta, origin, destination, carrier, weight, speed_kph, start_progress, route,
        sender_name, sender_email, sender_phone, sender_address,
        receiver_name, receiver_email, receiver_phone, receiver_address,
        delivery_method, shipping_cost, customs_status, customs_fee,
        cargo_type, notes, paused
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [
        upperCode, status ?? "Processing", eta ?? "Estimating…", origin, destination,
        carrier ?? "Tesla Express", weight ?? "—", speed_kph ?? 80, start_progress ?? 0.05,
        JSON.stringify(route),
        sender_name ?? "", sender_email ?? "", sender_phone ?? "", sender_address ?? "",
        receiver_name ?? "", receiver_email ?? "", receiver_phone ?? "", receiver_address ?? "",
        delivery_method ?? "Standard", shipping_cost ?? 0, customs_status ?? "Pending", customs_fee ?? 0,
        cargo_type ?? "road", notes ?? "", paused ?? false,
      ]
    );
    if (events && events.length > 0) {
      for (const ev of events) {
        await client.query(
          `INSERT INTO package_events (code, time_label, label, location, done, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [upperCode, ev.time_label ?? "", ev.label, ev.location ?? "", ev.done ?? false, ev.sort_order ?? 0]
        );
      }
    }
    await client.query("COMMIT");
    res.status(201).json({ code: upperCode });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("duplicate key")) res.status(409).json({ error: "Tracking code already exists" });
    else { console.error(err); res.status(500).json({ error: "Internal server error" }); }
  } finally {
    client.release();
  }
});

// ─── Admin: update package ─────────────────────────────────────────────────────

app.put("/api/admin/packages/:code", requireAdmin, async (req, res) => {
  const code = req.params.code.toUpperCase();
  const {
    status, eta, origin, destination, carrier, weight, speed_kph, start_progress, route, events,
    sender_name, sender_email, sender_phone, sender_address,
    receiver_name, receiver_email, receiver_phone, receiver_address,
    delivery_method, shipping_cost, customs_status, customs_fee,
    cargo_type, notes, paused,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE packages SET
        status=$1, eta=$2, origin=COALESCE($3, origin), destination=COALESCE($4, destination),
        carrier=$5, weight=$6, speed_kph=$7, start_progress=$8,
        route=COALESCE($9, route),
        sender_name=$10, sender_email=$11, sender_phone=$12, sender_address=$13,
        receiver_name=$14, receiver_email=$15, receiver_phone=$16, receiver_address=$17,
        delivery_method=$18, shipping_cost=$19, customs_status=$20, customs_fee=$21,
        cargo_type=$22, notes=$23, paused=$24,
        updated_at=NOW()
       WHERE code=$25`,
      [
        status, eta,
        origin ?? null, destination ?? null,
        carrier, weight, speed_kph, start_progress,
        route !== undefined ? JSON.stringify(route) : null,
        sender_name ?? "", sender_email ?? "", sender_phone ?? "", sender_address ?? "",
        receiver_name ?? "", receiver_email ?? "", receiver_phone ?? "", receiver_address ?? "",
        delivery_method ?? "Standard", shipping_cost ?? 0, customs_status ?? "Pending", customs_fee ?? 0,
        cargo_type ?? "road", notes ?? "", paused ?? false,
        code,
      ]
    );
    if (events && Array.isArray(events)) {
      await client.query("DELETE FROM package_events WHERE code = $1", [code]);
      for (const ev of events) {
        await client.query(
          `INSERT INTO package_events (code, time_label, label, location, done, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [code, ev.time_label ?? "", ev.label, ev.location ?? "", ev.done ?? false, ev.sort_order ?? 0]
        );
      }
    }
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// ─── Admin: delete package ─────────────────────────────────────────────────────

app.delete("/api/admin/packages/:code", requireAdmin, async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    await pool.query("DELETE FROM packages WHERE code = $1", [code]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Notify: subscribe ─────────────────────────────────────────────────────────

app.post("/api/notify/subscribe", async (req, res) => {
  const { email, trackingCode, status, eta, from, to } = req.body as {
    email: string; trackingCode: string; status: string; eta: string; from: string; to: string;
  };

  if (!email || !email.includes("@")) { res.status(400).json({ error: "Invalid email address" }); return; }
  if (!trackingCode) { res.status(400).json({ error: "Tracking code is required" }); return; }

  try {
    await pool.query(
      `INSERT INTO subscribers (email, code) VALUES ($1, $2) ON CONFLICT (email, code) DO NOTHING`,
      [email.toLowerCase(), trackingCode.toUpperCase()]
    );

    const html = buildEmailHtml({
      trackingCode, status, eta, from, to,
      badgeColor: { bg: "#1a2a1a", border: "#2a4a2a", text: "#4ade80" },
      badgeText: "Alerts Enabled",
      headline: "You're now tracking",
      bodyText: "We'll send you an email the moment your package status changes — including when it's out for delivery and when it arrives.",
    });

    const resend = getResend();
    if (resend) {
      const { error } = await resend.emails.send({
        from: "TeslaTrack <onboarding@resend.dev>",
        to: [email],
        subject: `Tracking Alert Enabled — ${trackingCode}`,
        html,
      });
      if (error) { res.status(500).json({ error: "Failed to send email", detail: error.message }); return; }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Notify: delivered ─────────────────────────────────────────────────────────

app.post("/api/notify/delivered", async (req, res) => {
  const { trackingCode } = req.body as { trackingCode: string };
  if (!trackingCode) { res.status(400).json({ error: "trackingCode required" }); return; }
  const code = trackingCode.toUpperCase();

  try {
    const pkgRes = await pool.query("SELECT * FROM packages WHERE code = $1", [code]);
    if (pkgRes.rowCount === 0) { res.status(404).json({ error: "Package not found" }); return; }
    const pkg = pkgRes.rows[0];

    const subsRes = await pool.query("SELECT email FROM subscribers WHERE code = $1", [code]);
    if (subsRes.rowCount === 0) { res.json({ success: true, sent: 0 }); return; }

    const html = buildEmailHtml({
      trackingCode: code, status: "Delivered", eta: pkg.eta, from: pkg.origin, to: pkg.destination,
      badgeColor: { bg: "#1a2a1a", border: "#2a4a2a", text: "#4ade80" },
      badgeText: "Delivered",
      headline: "Your package has arrived",
      bodyText: "Your shipment has been successfully delivered. Thank you for using TeslaTrack.",
    });
    const subject = `Your package has been delivered — ${code}`;

    let sent = 0;
    const resend = getResend();
    if (resend) {
      for (const row of subsRes.rows) {
        const { error } = await resend.emails.send({
          from: "TeslaTrack <onboarding@resend.dev>",
          to: [row.email],
          subject,
          html,
        });
        if (!error) sent++;
      }
    }

    await pool.query("UPDATE packages SET status='Delivered', updated_at=NOW() WHERE code=$1", [code]);
    res.json({ success: true, sent });
  } catch (err) {
    console.error("Delivered notify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
