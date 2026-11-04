import { Router } from "express"

import { validate } from "../middlewares/validate.middleware.js"
import { authMiddleware } from "../middlewares/auth.middleware.js"
import { requireRole } from "../middlewares/role.middleware.js"
import { validateUser, validateUpdateUser, validateLogin } from "../validators/user.validator.js"
import { createUser, getUsers, getUserById, updateUser, deleteUser, loginUser, logoutUser, getProfile } from "../controllers/user.controller.js"

const router = Router()

router.post(
    "/login",
    validate(validateLogin),
    loginUser
)

router.post(
    "/logout",
    logoutUser
)

router.post(
    "/",
    validate(validateUser),
    createUser
)

router.get(
    "/profile",
    authMiddleware,
    getProfile
)

router.get(
    "/",
    authMiddleware,
    requireRole("admin"),
    getUsers
)

router.get( 
    "/:id", 
    authMiddleware,
    requireRole("admin"),
    getUserById 
)

router.patch(
    "/:id",
    authMiddleware,
    validate(validateUpdateUser),
    updateUser
)


router.delete( 
    "/:id",
    authMiddleware, 
    deleteUser 
)


export default router