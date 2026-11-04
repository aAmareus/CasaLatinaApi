import jwt from "jsonwebtoken"
import User from "../models/user.js" // change to User inf error

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.cle_session 

        if(!token) {
            return res.status(401).json({
                success: false,
                message: "Debes iniciar sesión."
            })
        }

        let decoded

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            )
        } catch(error) {
            return res.status(401).json({
                success: false,
                message: "Sesión inválida o expirada."
            })
        }

        const user = await User.findById(
            decoded.userId
        ).select("-password")

        if(!user) {
            return res.status(401).json({
                success: false,
                message: "Usuario no encontrado."
            })
        }

        if(user.active === false) {
            return res.status(403).json({
                success: false,
                message: "La cuenta está desactivada."
            })
        }

        req.user = user

        next()

    } catch(error) {
        console.error("Auth error:", e)

        return res.status(500).json({
            success: false,
            message: "Internal server Error."
        })
    }
}