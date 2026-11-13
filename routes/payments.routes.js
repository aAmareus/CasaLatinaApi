import { Router } from "express"
import rateLimit from "express-rate-limit"

import { validate } from "../middlewares/validate.middleware.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { validatePaypalOrder } from "../validators/payments.validator.js"
import {
    getCheckoutSummary,
    createPayPalOrderHandler,
    capturePayPalOrderHandler
} from "../controllers/payment.controller.js"

const router = Router();

const paymentsLimiter = rateLimit({
    windowMs: 15* 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Demasiados intentos, espera unos minutos." }
})

router.get(
    "/checkout/:reservationId",
    authMiddleware,
    getCheckoutSummary
)

router.post(
    "/paypal/orders",
    paymentsLimiter,
    authMiddleware,
    validate(validatePaypalOrder),
    createPayPalOrderHandler
)

router.post(
    "/paypal/orders/:orderId/capture",
    paymentsLimiter,
    authMiddleware,
    capturePayPalOrderHandler
)
export default router;