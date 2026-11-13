import { Router } from "express"

import { validate } from "../middlewares/validate.middleware.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { validatePayment } from "../validators/payments.validator.js"
import {
    getCheckoutSummary,
    createPaypalOrder,
    capturePaypalOrderHandler
} from "../controllers/payment.controller.js"

const router = Router();

const paymentsLimiter = rateLimit({
    windowMs: 15* 60 * 1000,
    limit: 40,
    standarHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Demasiados intentos, espera unos minutos." }
})

router.get(
    "/checkout:reservationId",
    authMiddleware,
    getCheckoutSummary
)

router.post(
    "paypal/orders",
    paymentsLimiter,
    authMiddleware,
    validate(validatePaypalOrder),
    createpaypalOrderHandler
)

router.post(
    "/paypal/orders/:orderId/capture",
    paymentsLimiter,
    authMiddleware,
    capturePaypalOrderHandler
)
export default router;