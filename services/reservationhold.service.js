const getHoldMinutes = () => Number(process.env.RESERVATION_HOLD_MINUTES) || 30

// secure this time to client
const PAYMENT_GRACE_MINUTES = 15

export const getHoldExpiry = (minutes = getHoldMinutes()) =>
    new Date(Date.now() + minutes * 60 * 1000)

export const getPaymentHoldExpiry = () => getHoldExpiry(PAYMENT_GRACE_MINUTES)

export const isHoldExpired = (reserva) => 
    reserva.estado === "pendiente" &&
    reserva.hold_expires_at instanceof Date &&
    reserva.hold_expires_at.getTime() <= Date.now()


// MongoDB filter: bookings that blocks dates.
export const blockingReservaFilter = () => [
    { estado: "confirmada" },
    { estado: "pendiente", hold_expires_at: { $gt: new Date() } },
    { estado: "pendiente", hold_expires_at: {$exists: false } }
]
