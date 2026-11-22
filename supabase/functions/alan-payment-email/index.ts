import { withSupabase } from "npm:@supabase/server@^1";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number.isFinite(value) ? value : 0);
}

function dateEs(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "No disponible";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-MX", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function daysBetween(from: string, to: string): number {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return 0;
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}

function emailHtml(data: {
  customer: string; phone: string; notes: string; dueDate: string;
  initialDebt: number; dailyFine: number; lateDays: number; fine: number;
  totalDue: number; paidTotal: number; balance: number;
  paymentAmount: number; paymentDate: string; paymentNote: string;
}): string {
  const row = (label: string, value: string) =>
    '<tr><td style="padding:11px 12px;border-bottom:1px solid #ececec;color:#69707a;font-size:13px">' +
    label + '</td><td style="padding:11px 12px;border-bottom:1px solid #ececec;color:#20242a;font-size:13px;font-weight:600;text-align:right">' +
    value + '</td></tr>';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#20242a">
  <div style="display:none;max-height:0;overflow:hidden">Nuevo cobro registrado en ALAN. Consulta el resumen actualizado de la cuenta.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f2f4;padding:28px 10px">
  <tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#d71920;padding:25px 30px;color:#fff">
  <div style="font-size:30px;font-weight:900;letter-spacing:1px">ALAN <span style="font-size:18px">🇲🇽</span></div>
  <div style="font-size:11px;letter-spacing:2px;margin-top:5px;color:#ffe2e2">SISTEMA DE CONTROL DE COBROS</div>
  </td></tr>
  <tr><td style="padding:28px 30px 12px">
  <div style="display:inline-block;background:#e7f5ec;color:#16743c;border-radius:20px;padding:7px 12px;font-size:11px;font-weight:bold">COBRO REGISTRADO</div>
  <h1 style="font-size:23px;line-height:1.3;margin:16px 0 8px;color:#20242a">Se registró un nuevo abono</h1>
  <p style="margin:0;color:#69707a;font-size:14px;line-height:1.6">Se ha actualizado la cuenta del cliente. Este es el comprobante informativo del movimiento.</p>
  </td></tr>
  <tr><td style="padding:16px 30px">
  <div style="border:1px solid #ececec;border-radius:12px;padding:17px;background:#fafafa">
  <div style="font-size:11px;color:#69707a;font-weight:bold;letter-spacing:1px">CLIENTE</div>
  <div style="font-size:20px;font-weight:800;margin-top:7px;color:#20242a">${escapeHtml(data.customer)}</div>
  <div style="font-size:13px;color:#69707a;margin-top:5px">Teléfono: ${escapeHtml(data.phone || "No registrado")}</div>
  </div></td></tr>
  <tr><td style="padding:0 30px 12px"><h2 style="font-size:15px;margin:8px 0 10px">Detalle del cobro</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ececec;border-radius:10px;overflow:hidden">
  ${row("Importe recibido", money(data.paymentAmount))}
  ${row("Fecha del abono", dateEs(data.paymentDate))}
  ${row("Concepto", escapeHtml(data.paymentNote || "Sin concepto"))}
  </table></td></tr>
  <tr><td style="padding:8px 30px 12px"><h2 style="font-size:15px;margin:8px 0 10px">Estado actualizado de la deuda</h2>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ececec;border-radius:10px;overflow:hidden">
  ${row("Deuda inicial", money(data.initialDebt))}
  ${row("Multa diaria", money(data.dailyFine))}
  ${row("Días de atraso calculados", String(data.lateDays))}
  ${row("Multas acumuladas", money(data.fine))}
  ${row("Total de deuda calculada", money(data.totalDue))}
  ${row("Total abonado a la fecha", money(data.paidTotal))}
  </table>
  <div style="margin-top:14px;background:#fff3f3;border:1px solid #f3d1d2;border-radius:12px;padding:18px;text-align:center">
  <div style="font-size:11px;color:#8a3034;font-weight:bold;letter-spacing:1px">SALDO PENDIENTE ACTUAL</div>
  <div style="font-size:29px;font-weight:900;color:#d71920;margin-top:6px">${money(data.balance)}</div>
  <div style="font-size:12px;color:#69707a;margin-top:5px">Vencimiento: ${dateEs(data.dueDate)}</div>
  </div></td></tr>
  <tr><td style="padding:8px 30px 24px">
  ${data.notes ? '<div style="font-size:12px;color:#69707a;line-height:1.6"><strong>Observaciones del cliente:</strong><br>' + escapeHtml(data.notes) + '</div>' : ''}
  <p style="font-size:11px;line-height:1.6;color:#8a8f98;margin:18px 0 0">Notificación automática de ALAN Cobros. Este correo contiene información financiera del registro asociado a tu cuenta. Consérvalo de forma privada.</p>
  </td></tr>
  <tr><td style="background:#222;color:#c9c9c9;text-align:center;padding:17px;font-size:11px;line-height:1.6">ALAN 🇲🇽 · SISTEMA DE CONTROL DE COBROS Y DEUDORES</td></tr>
  </table></td></tr></table></body></html>`;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Método no permitido" }, { status: 405 });
    }

    const userId = ctx.userClaims?.sub;
    const recipient = ctx.userClaims?.email;
    if (!userId || !recipient) {
      return Response.json({ error: "No se pudo identificar la cuenta autenticada." }, { status: 401 });
    }

    let body: { paymentId?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    }

    const paymentId = String(body.paymentId ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId)) {
      return Response.json({ error: "Identificador de cobro inválido." }, { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("ALAN_EMAIL_FROM");
    if (!apiKey || !from) {
      return Response.json({
        error: "Falta configurar el proveedor de correo: RESEND_API_KEY y ALAN_EMAIL_FROM.",
      }, { status: 503 });
    }

    const { data: payment, error: paymentError } = await ctx.supabase
      .from("alan_payments")
      .select("id, owner_id, person_id, amount, payment_date, note")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment || payment.owner_id !== userId) {
      return Response.json({ error: "No se encontró el cobro de esta cuenta." }, { status: 404 });
    }

    const { data: person, error: personError } = await ctx.supabase
      .from("alan_people")
      .select("id, owner_id, name, initial_debt, daily_fine, due_date, phone, notes")
      .eq("id", payment.person_id)
      .single();

    if (personError || !person || person.owner_id !== userId) {
      return Response.json({ error: "No se encontró el cliente asociado a este cobro." }, { status: 404 });
    }

    const { data: payments, error: paymentsError } = await ctx.supabase
      .from("alan_payments")
      .select("amount")
      .eq("person_id", person.id)
      .eq("owner_id", userId);

    if (paymentsError) {
      return Response.json({ error: "No se pudo calcular el saldo actualizado." }, { status: 500 });
    }

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
    const lateDays = Math.max(0, daysBetween(person.due_date, today));
    const dailyFine = Number(person.daily_fine || 0);
    const fine = lateDays * dailyFine;
    const totalDue = Number(person.initial_debt || 0) + fine;
    const paidTotal = (payments ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const balance = Math.max(0, totalDue - paidTotal);

    const html = emailHtml({
      customer: person.name,
      phone: person.phone || "",
      notes: person.notes || "",
      dueDate: person.due_date,
      initialDebt: Number(person.initial_debt || 0),
      dailyFine,
      lateDays,
      fine,
      totalDue,
      paidTotal,
      balance,
      paymentAmount: Number(payment.amount),
      paymentDate: payment.payment_date,
      paymentNote: payment.note || "",
    });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `alan-payment-${payment.id}`,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `ALAN Cobros | Abono registrado - ${person.name}`,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend error:", response.status, detail);
      return Response.json({ error: "El cobro se guardó, pero el proveedor de correo rechazó el envío." }, { status: 502 });
    }

    const result = await response.json();
    return Response.json({ ok: true, recipient, emailId: result.id });
  }),
};
