import mongoose from "mongoose"

export const validatePaypalOrder = (body) => {
    const errors = {}

    if(!body?.reservation_id) {
        errors.reservation_id = "El ID de la reserva es requerido."
    } else if(!mongoose.isValidObjectId(body.reservation_id)) {
        errors.reservation_id = "El ID de la reserva no es válido"
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    }
}