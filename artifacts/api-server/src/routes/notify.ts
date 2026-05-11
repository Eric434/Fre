import { Router, type IRouter } from "express";
import { Resend } from "resend";

const router: IRouter = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/notify/subscribe", async (req, res) => {
  const { email, trackingCode, status, eta, from, to } = req.body as {
    email: string;
    trackingCode: string;
    status: string;
    eta: string;
    from: string;
    to: string;
  };

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  if (!trackingCode) {
    res.status(400).json({ error: "Tracking code is required" });
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "TeslaTrack <onboarding@resend.dev>",
      to: [email],
      subject: `Tracking Alert Enabled — ${trackingCode}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TeslaTrack Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0d0d0d;border-bottom:1px solid #1a1a1a;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#f5f5f5;">
                      Tesla<span style="color:#dc2626;">Track</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:10px;color:#555;letter-spacing:0.1em;text-transform:uppercase;">Live Tracking</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:32px 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1a2a1a;border:1px solid #2a4a2a;border-radius:20px;padding:5px 14px;">
                    <span style="font-size:11px;color:#4ade80;letter-spacing:0.1em;text-transform:uppercase;">● Alerts Enabled</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding:20px 32px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:300;color:#f5f5f5;letter-spacing:-0.02em;">
                You're now tracking
              </h1>
              <p style="margin:0 0 28px;font-size:28px;font-weight:700;color:#ffffff;font-family:monospace;letter-spacing:0.05em;">
                ${trackingCode}
              </p>

              <!-- Package info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #1f1f1f;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
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
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#555;line-height:1.7;">
                We'll send you an email the moment your package status changes — including when it's out for delivery and when it arrives.
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid #1a1a1a;"></td>
                </tr>
              </table>

              <p style="margin:0;font-size:11px;color:#333;line-height:1.6;">
                You received this because you subscribed to alerts for <strong style="color:#444;">${trackingCode}</strong> on TeslaTrack.
                Reply to unsubscribe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;border-top:1px solid #1a1a1a;padding:16px 32px;">
              <span style="font-size:10px;color:#333;letter-spacing:0.08em;">
                TESLATRACK · PRECISION LOGISTICS
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    if (error) {
      console.error("Resend error:", error);
      res.status(500).json({ error: "Failed to send email", detail: error.message });
      return;
    }

    res.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("Notify route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
