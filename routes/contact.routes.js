import { Router } from "express"
import { sendContactMessage } from "../controllers/contact.controller.js"
import { contactRateLimit } from "../middlewares/contact.middleware.js"
import { verifyTurnstile } from "../middlewares/turnstile.middleware.js"

const router = Router()

router.post(
    "/", 
    contactRateLimit,
    verifyTurnstile,
    sendContactMessage
)

export default router