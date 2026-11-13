import mongoose from "mongoose"
import Reserva from "../models/reserva.js"
import Payment from "../models/payments.js"
import { getBrlToUsd, convertBrlToUsd } from "../services/exchangerate.service.js"
import {
    createPaypalOrder,
    capturePaypalOrder, 
    getPaypalOrder,
    PaypalError
} from "../services/paypal.service.js"
import {
    isHoldExpired,
    getPaymentHoldExpiry
} from "../services/reservationhold.service.js"

const DAY_MS = 24 * 60 * 60 * 1000

const fail =(res, status, message, extra = {}) =>
    res.status(status).json ({ succes: false, message, ...extra })



const loadOwnedReserva = async (reservationId, user) => {
    if (!mongoose.isValidObjectId(reservationId)) {
        return { error: { status: 400, message: "ID de reserva inválido"} } 
    }

    const reserva = await Reserva.findById(reservationId).populate(
        "room_id",
        "name images"
    )

    if (!reserva) {
        return { error: { status: 404, message: "Reserva no encontrada" } }
    }

    if (reserva.user_id.toString() !== user._id.toString()) {
        return { error: { status: 403, message: "No tienes permiso sobre esta reserva" } }
    }

    if (isHoldExpired(reserva)) {
        reserva.estado = "cancelada"
        await reserva.save()
    }

    return { reserva }
}

const buildPricing = ({ total_brl, total_usd, fx }) => ({
    total_brl,
    currency_charged: "USD",
    total_usd,
    exchange_rate: fx.rate,
    margin_pct: fx.margin_pct,
    rate_date: fx.date,
    rate_source: fx.rate_source
})

const buildReservationInfo = (reserva) => ({
    id: reserva._id,
    estado: reserva.estado,
    check_in: reserva.check_in, 
    check_out: reserva.check_out,
    nights: Math.round((reserva.check_out-reserva.check_in)/DAY_MS),
    hold_expires_at: reserva.hold_expires_at ?? null,
    room: {
        name: reserva.room_id?.name ?? "habitación",
        image: reserva.room_id?.images?.[0] ?? null
    }
})



export const getCheckoutSummary = async (req,res) => {
    try{ 
        const { reserva, error } = await loadOwnedReserva(
            req.params.reservationId, 
            req.user
        )
        
        if (error) return fail(res, error.status, error.message)

        const reservation = buildReservationInfo(reserva)

        if (reserva.estado === "confirmada"){
            const payment = await Payment.findOne({
                reservation_id: reserva._id,
                status: "completed"
            }).sort({ created_at: -1 })

            return res.status(200).json({
                succes: true,
                checkout: {
                    pricing: payment
                    ? buildPricing({
                        total_brl: payment.amount_brl ?? reserva.total_price,
                        total_usd: payment.amount, 
                        fx: {
                            rate: payment.exchange_rate,
                            margin_pct: 0,
                            date: payment.exchange_rate_date,
                            source: "paid"
                        }   
                    })
                    : null
                }
            })
        }

        if (reserva.estado === "cancelada") {
            return res.status(200).json({
                succes: true,
                checkout: { reservation,pricing: null }
            })
        }

        const fx = await getBrlToUsd()
        const total_usd = convertBrlToUsd(reserva.total_price, fx.rate)

        return res.status(200).json({
            succes: true,
            checkout: {
                reservation,
                pricing: buildPricing({
                    total_brl: reserva.total_price,
                    total_usd,
                    fx
                })
            }
        })
    } catch (e) {
        console.error("Error getting checkout summary:", e)
        return fail(res, 500, "No se pudo cargar el resumen de pago")
    }
}


export const createPayPalOrderHandler = async (req, res) => {
    try {
        const { reserva, error } = await loadOwnedReserva(
            req.body.reservation_id,
            req.user
        )

        if(error) return fail(res, error.status, error.message)

        if(reserva.estado === "confirmada") {
            return fail(res, 409, "Esta reserva ya está pagada.")
        }

        if(reserva.estado !== "pendiente") {
            return fail(res, 410, "Esta reserva fue cancelada o expiró.")
        }

        const fx = await getBrlToUsd()
        const total_usd = convertBrlToUsd(reserva.total_price, fx.rate)

        if(total_usd < 1) {
            return fail(res, 400, "El monto a pagar no es válido")
        }

        const order = await createPaypalOrder({
            amountUsd: total_usd,
            reservaId: reserva._id,
            description: `Casa Latina - ${reserva.room_id?.name ?? "Reserva"}`
        })

        await Payment.create({
            reservation_id: reserva._id,
            provider: "paypal",
            external_payment_id: order.id,
            amount: total_usd,
            currency: "USD",
            status: "pending",
            amount_brl: reserva.total_price,
            exchange_rate: fx.rate,
            exchange_rate_date: fx.rate
        })

        // While user pays, dont lose dates
        const extendedHold = getPaymentHoldExpiry()

        if(!reserva.hold_expires_at || reserva.hold_expires_at < extendedHold) {
            reserva.hold_expires_at = extendedHold
        }

        return res.status(201).json({
            success: true,
            orderId: order.id,
            pricing: buildPricing({
                total_brl: reserva.total_price,
                total_usd,
                fx
            })
        })
    } catch(e) {
        console.error("Error creating Paypal order: ", e.body ?? e)
        return fail(res, 502, "No se pudo iniciar el pago con Paypal")
    }
}

export const capturePayPalOrderHandler = async (req, res) => {
    try {
        const { orderId } = req.params

        if(!/^[A-Za-z0-9_-]{8,64}$/.test(orderId)) {
            return fail(res, 400, "ID de onrden inválido")
        }

        const payment = await Payment.findOne({
            external_payment_id: orderId,
            provider: "paypal"
        })

        if(!payment) return fail(res, 404, "Orden no encontrada")

        const { reserva, error } = await loadOwnedReserva(
            payment.reservation_id,
            req.user
        )

        if(error) return fail(res, error.status, error.message)

        if(payment.status === "completed") {
            return res.status(200).json({
                success: true,
                already_captured: true,
                reservation: {id: reserva._id, estado: reserva.estado }
            })
        }

        if(reserva.estado === "cancelada") {
            return fail(res, 409, "La reserva fue cancelada o expiró; no se realizó ningún cobro.")
        }

        let result

        try {
            result = await capturePaypalOrder(orderId)
        } catch(e) {
            if(!(e instanceof PaypalError)) throw e

            if(e.issues.includes("ORDER_ALREADY_CAPTURED")) {
                result = await getPaypalOrder(orderId)
            } else if (e.issues.includes("INSTRUMENT_DECLINED")){
                return fail(
                    res,
                    422,
                    "Paypal rechazó el medio de pago. Elige otro e inténtelo de nuevo.",
                    { code: "INSTRUMENT_DECLINED"}
                )
            } else {
                throw e
            }
        }

        const capture = result?.purchase_units?.[0]?.payments?.captures?.[0]

        if(!capture) {
            console.error("Respuesta de captura sin datos:", JSON.stringify.apply(result))
            return fail(res, 502, "Paypal no devolvió datos del pago")
        }

        if(capture.status !== "COMPLETED") {
            console.warn(`Captura ${capture.id} en estado ${capture.status} (orden ${orderId})`)
            return res.status(202).json({
                success: true,
                pending_review: true,
                message: "Tu pago está en revisión. Te avisaremos cuando se confirme."
            })
        }

        const sameAmount =
            capture.amount?.currency_code === "USD" &&
            Number(capture.amount?.value).toFixed(2) === payment.amount.toFixed(2)

        if(!sameAmount) {
            console.error(
                `[ADVERTENCIA] Monto distinto. Orden ${orderId}, esperado USD ${payment.amount}, ` +
                `recibido ${capture.amount?.currency_code} ${capture.amount?.value}`
            )

            return fail(res, 500, "El monto cobrado no coincide. Contáctanos para resolverlo.")
        }

        payment.status = "completed"
        payment.capture_id = capture.id
        await payment.save()

        reserva.estado = "confirmada"
        reserva.hold_expires_at = undefined
        await reserva.save()

        return res.status(200).json({
            success: true,
            reservation: { id: reserva._id, estado: reserva.estado },
            payment: {
                status: payment.status,
                amount_usd: payment.amount,
                capture_id: payment.capture_id
            }
        })
    } catch(e) {
        console.error("Error capturing Paypal order: ", e.body ?? e)
        return fail(res, 502, "No se pudo completar el pago con Paypal")
    }
}