import { rateLimit } from "express-rate-limit"

export const contactRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,

    standardHeaders: "draft-7",

    legacyHeaders: false,

    message: {
        success: false,
        message: "has enviado demasiadas consultas. Intentalo de nuevo en unos minutos."
    },

    statusCode: 429
})