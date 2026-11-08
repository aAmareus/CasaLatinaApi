import { Router } from "express";
import { runCalendarSync } from "../controllers/calendarSync.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { requireRole } from "../middlewares/role.middleware.js"

const router = Router()

router.post(
    "/sync",
    authMiddleware,
    requireRole("admin"),
    runCalendarSync
)

export default router