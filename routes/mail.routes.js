import { Router } from "express"
import { testEmail } from "../controllers/mail.controller.js"

import { authMiddleware } from "../middlewares/auth.middleware.js"
import { requireRole } from "../middlewares/role.middleware.js"

const router = Router()

router.post(
    "/test",
    authMiddleware,
    requireRole("admin"),
    testEmail
)

export default router