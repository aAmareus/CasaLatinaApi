import Payment from "../models/payments.js"
import Reserva from "../models/reserva.js"
import User from "../models/user.js"
import Room from "../models/rooms.js"
import { calculateReservationPrice } from "./pricing.service.js"
import { sendEmail } from "./mail.service.js"

const GREEN = "#289e21"
const DAY_MS = 24 * 60 * 60 * 1000
const BRASIL_TZ = "America/Sao_Paulo"

const SEASON_LABELS = {
    low: "Temporada baja",
    mid: "Temporada media",
    high: "Temporada alta",
    carnival: "carnival"
}

const esc = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")

const getConfig = () => {
    const siteUrl = (process.env.SITE_URL || "https://casalatina-experience.com").replace(/\/$/, "")
    
    return {
        siteUrl,
        assetsUrl: (process.env.EMAIL_ASSETS_URL || `${siteUrl}/email`).replace(/\/$/, ""),
        instagram: process.env.EMAIL_INSTAGRAM_URL || "https://www.instagram.com/casalatina.brasil",
        whatsapp: process.env.EMAIL_WHATSAPP_URL || "https://wa.me/56946311360",
        contactMail: process.env.MAIL_CONTACT || ""
    }
}

// --------- Formats ----------

const money = (value) =>
    Number(value).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const brl = { format: (value) => `R$ ${money(value)}` }
const usd = { format: (value) => `US$ ${money(value)}` }

const formatLongDate = (value) =>
    new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    }).format(new Date(value))

const formatPaidDate = (value) =>
    new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: BRASIL_TZ
    }).format(new Date(value))


const formatPaidTime = (value) =>
    `${new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: BRASIL_TZ
    }).format(new Date(value))} (hora brasil)`

const formatRate = (rate) =>
    Number(rate).toLocaleString("es-CL", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6
    })

const toDateOnly = (value) => new Date(value).toISOString().slice(0, 10)

const describeSeasons = (room, checkIn, checkOut) => {
    try {
        const quote = calculateReservationPrice(room, toDateOnly(checkIn), toDateOnly(checkOut))
        const entries = Object.entries(quote.breakdown)

        if(entries.length === 1) {
            return SEASON_LABELS[entries[0][0]] ?? entries[0][0]
        }

        return entries
            .map(([season, d]) => {
                const label = SEASON_LABELS[season] ?? season
                return `${label} (${d.nights} ${d.nights === 1 ? "noche" : "noches"})`
            })
            .join(" . ")
    } catch(e) {
        console.error("[email] no se pudo calcular la temporada: ", e.message)
        return null
    }
}

// =====----- Plantilla de Correo -----===== //

const detailRow = (label, value) => `
    <tr>
        <td style="padding:3px 12px 3px 0;font-size:14px;line-height:20px;color:#111;">
            <strong>${esc(label)}</strong>
        </td>
        <td style="padding:3px 0;font-size:14px;line-height:20px;color:#333;" align="left">
            ${esc(value)}
        </td>
    </tr>`

const spacerRow = `
    <tr>
        <td colspan="2" style="height:12px;line-height:12px;font-size:12px;">
            &nbsp;
        </td>
    </tr>`

const iconLink = (href, src, alt) =>
href
  ? `<a href="${esc(href)}" target="_blank" style="text-decoration:none;display:inline-block;margin-right:14px;">
       <img src="${esc(src)}" alt="${esc(alt)}" width="28" height="28" style="display:inline-block;border:0;width:28px;height:28px;font-size:12px;color:#111;">
     </a>`
  : ""

  export const buildReservationEmailHtml = (data) => {
    const cfg = getConfig()

    const {
        userName,
        roomName,
        roomImage,
        seasonText,
        checkIn,
        checkOut,
        nights,
        capacity,
        reservaId,
        userId,
        paymentId,
        totalBrl,
        totalUsd,
        exchangeRate,
        exchangeRateDate,
        paidAt
    } = data

    const photo = roomImage
        ? `<td width="150" valign="top" style="padding:0 16px 0 0;">
             <img src="${esc(roomImage)}" alt="${esc(roomName)}" width="150" style="display:block;width:150px;max-width:100%;height:auto;border-radius:10px;border:0;">
           </td>`
        : ""

    const rate = `1 R$ = US$ ${formatRate(exchangeRate)}${exchangeRateDate ? ` (${esc(exchangeRateDate)})` : ""}`

    const stayLines = [
        seasonText ? `<div style="font-size:14px;line-height:22px;color:#333;">${esc(seasonText)}</div>` : "",
        `<div style="font-size:14px;line-height:22px;color:#333;"><strong>Check-in:</strong> ${esc(formatLongDate(checkIn))}</div>`,
        `<div style="font-size:14px;line-height:22px;color:#333;"><strong>Check-out:</strong> ${esc(formatLongDate(checkOut))}</div>`,
        `<div style="font-size:14px;line-height:22px;color:#333;"><strong>Noches:</strong> ${esc(nights)}</div>`,
        capacity ? `<div style="font-size:14px;line-height:22px;color:#333;"><strong>Capacidad:</strong> hasta ${esc(capacity)} ${capacity === 1 ? "persona" : "personas"}</div>` : ""
    ].join("")

    const mailHref = cfg.contactMail ? `mailto:${cfg.contactMail}` : ""

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reserva confirmada - Casa Latina Experience</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2;">
    <tr>
      <td align="center" style="padding:16px 8px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">

          <!-- Encabezado -->
          <tr>
            <td style="background:${GREEN};padding:10px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="96" valign="middle" style="padding-right:12px;">
                    <img src="${esc(cfg.assetsUrl)}/logotipo-wobg.png" alt="Casa Latina Brasil Experience" width="90" style="display:block;width:90px;height:auto;border:0;">
                  </td>
                  <td valign="middle" style="font-size:24px;line-height:30px;font-style:italic;font-weight:bold;color:#ffffff;">
                    Gracias por reservar con nosotros!
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding:20px 24px 8px 24px;font-size:15px;line-height:22px;color:#111;">
              Hola, ${esc(userName)}.<br>
              Hemos recibido el pago de tu reserva, aquí encontrarás la información detallada.
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 16px 24px;font-size:15px;line-height:22px;color:#111;">
              <strong>Reserva confirmada!</strong>
            </td>
          </tr>
          <tr><td style="padding:0 16px;"><div style="border-top:1px solid #bdbdbd;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

          <!-- Habitación -->
          <tr>
            <td style="padding:18px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${photo}
                  <td valign="top">
                    <div style="font-size:19px;line-height:24px;font-weight:bold;color:#111;padding-bottom:4px;">${esc(roomName)}</div>
                    ${stayLines}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:0 16px;"><div style="border-top:1px solid #bdbdbd;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

          <!-- Detalle del pago -->
          <tr>
            <td style="padding:16px 24px 18px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRow("ID reserva:", reservaId)}
                ${detailRow("ID usuario:", userId)}
                ${spacerRow}
                ${detailRow("ID pago:", paymentId)}
                ${detailRow("Total BRL:", brl.format(totalBrl))}
                ${detailRow("Total USD:", usd.format(totalUsd))}
                ${detailRow("Conversión:", rate)}
                ${spacerRow}
                ${detailRow("Fecha:", formatPaidDate(paidAt))}
                ${detailRow("Hora:", formatPaidTime(paidAt))}
              </table>
            </td>
          </tr>
          <tr><td style="padding:0 16px;"><div style="border-top:1px solid #bdbdbd;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

          <tr>
            <td align="center" style="padding:16px 24px 8px 24px;font-size:12px;line-height:18px;color:#777;">
              Este email es generado de forma automática, por favor no responder.
            </td>
          </tr>

          <!-- Pie: contacto + logo -->
          <tr>
            <td style="padding:12px 24px 20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="bottom" style="font-size:12px;line-height:18px;color:#111;">
                    <div style="padding-bottom:10px;">¿Tienes dudas? Contáctanos:</div>
                    ${iconLink(cfg.instagram, `${cfg.assetsUrl}/instagram-icon.png`, "Instagram")}${iconLink(cfg.siteUrl, `${cfg.assetsUrl}/web-icon.png`, "Sitio web")}${iconLink(cfg.whatsapp, `${cfg.assetsUrl}/whatsapp-icon.png`, "WhatsApp")}${iconLink(mailHref, `${cfg.assetsUrl}/envelope-icon.png`, "Correo")}
                  </td>
                  <td width="130" align="right" valign="bottom">
                    <img src="${esc(cfg.assetsUrl)}/logotipo-wobg.png" alt="Casa Latina Brasil Experience" width="120" style="display:block;width:120px;height:auto;border:0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}


// =====----- Envío -----===== //

/**
 * Solo se envía una vez por pago
 * No debería lanzar errores, un fallo del correo no debe afectar el pago.
 */

export const notifyPaymentConfirmed = async (paymentId) => {
  let claimed = false

  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, status: "completed", email_sent_at: null },
      { $set: { email_sent_at: new Date() } },
      { returnDocument: false }
    )

    if(!payment) return { sent: false, reason: "ya enviado o pago no completado" }

    claimed = true

    const reserva = await Reserva.findById(payment.reservation_id)
    const user = reserva ? await User.findById(reserva.user_id) : null
    const room = reserva ? await Room.findById(reserva.room_id) : null

    if(!reserva || !user || !room) {
      throw new Error("Faltan datos de la reserva, el usuario o la habitación")
    }

    const html = buildReservationEmailHtml({
      userName: user.name,
      roomName: room.name,
      roomImage: room.images?.[0] ?? null,
      seasonText: describeSeasons(room, reserva.check_in, reserva.check_out),
      checkIn: reserva.check_in,
      checkOut: reserva.check_out,
      nights: Math.round((reserva.check_out - reserva.check_in) / DAY_MS),
      capacity: room.capacity,
      reservaId: String(reserva._id),
      userId: String(user._id),
      paymentId: payment.capture_id || payment.external_payment_id,
      totalBrl: payment.amount_brl ?? reserva.total_price,
      totalUsd: payment.amount,
      exchangeRate: payment.exchange_rate,
      exchangeRateDate: payment.exchange_rate_date,
      paidAt: payment.paid_at || payment.email_sent_at
    })

    await sendEmail({
      to: user.email,
      subject: "Reserva confirmada - Casa Latina Experience",
      html
    })

    return { sent: true }
  } catch(e) {
    console.error("[email] no se pudo enviar la confirmación: ", e.message)

    if(claimed) {
      await Payment.updateOne({ _id: paymentId }, { $unset: { email_sent_at: "" } }).catch(() =>
      {})
    }

    return { sent: false, reason: e.message}
  }
}