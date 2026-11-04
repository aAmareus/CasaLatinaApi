import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
import User from "../models/user.js"

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
}

export const createUser = async (req, res) => {
    try {
        const {
            name,
            lastname,
            email,
            password,
            phone
        } = req.body

        const existingUser = await User.findOne({
            $or: [
                { email },
                { phone }
            ]
        })

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "El usuario ya existe."
            })
        }

        const hashedPwd = await bcrypt.hash(password, 10)

        const user = await User.create({
            name,
            lastname,
            email,
            password: hashedPwd,
            phone,
            rol: "user"
        })

        return res.status(201).json({
            success: true,
            message: "Usuario creado corerctamente",
            user: {
                _id: user._id,
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                rol: user.rol,
                created: user.created
            }
        })

    } catch(e) {
        console.error("Error al crear al usuario: ", e)

        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        })
    }
}

export const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        return res.status(200).json({
            success: true,
            users
        })

    } catch(e) {
        console.error("Error al obtener los usuarios: ", e)

        return res.status(500).json({
            success: false,
            message: "Error interno del servidor."
        })
    }
}

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if(!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            })
        }

        const user = await User.findById(id).select("-password")

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado"
            })
        }

        return res.status(200).json({
            success: true,
            user
        })

    } catch(e) {
        console.error("Error al obtener el usuario.", e)

        return res.status(500).json({
            sucess: false,
            message: "Error interno del servidor"
        })
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params

        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            })
        }

        const isOwner = req.user._id.toString() === id
        const isAdmin = req.user.rol === "admin"

        if(!isOwner && !isAdmin){
            return res.status(403).json({
                success: false,
                message: "You dont have permission."
            })
        }

        const allowedFields = [
            "name",
            "lastname",
            "email",
            "phone"
        ];

        const updates = {}

        for(const field of allowedFields){
            if(req.body[field] !== undefined){
                updates[field] = req.body[field]
            }
        }

        if(Object.keys(updates) === 0){
            return res.status(400).json({
                success: false,
                message: "No data updated"
            })
        }

        const user = await User.findByIdAndUpdate(
            id,
            updates,
            {
                returnDocument: "after",
                runValidators: true
            }
        ).select("-password")

        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "User updated"
        })

    } catch(e) {
        console.error("Error updating user", e)

        if(e.code === 11000){
            return res.status(409).json({
                success: false,
                message: "Email or number already registered."
            })
        }

        return res.status(500).json({
            success: false,
            message: "Server internal error"
        })
    }
}

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params

        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({
                success:false, 
                message: "Invalid ID"
            })
        }

        const isOwner = req.user._id.toString() === id
        const isAdmin = req.user.rol === "admin"

        if(!isOwner && !isAdmin){
            return res.status(403).json({
                success: false,
                message: "You dont have permission."
            })
        }

        const user = await User.findByIdAndUpdate(
            id, {
                active: false
            },
            {
                returnDocument: "after"
            }
        ).select("-password")

        if(!user) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "User deactivated successfully."
        })
    } catch(e){
        console.error("Error deactivating user", e)

        return res.status(500).json({
            success: false,
            meesage: "Internal server error"
        })
    }
}

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {}

        if(
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Correo y contraseña son obligatorios."
            })
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        })

        if(!user || user.active === false){
            return res.status(401).json({
                succes: false,
                message: "Correo o contraseña son incorrectos."
            })
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        )

        if(!validPassword){
            return res.status(401).json({
                success: false,
                message: "Correo o contraseña incorrectos."
            })
        }

        const token = jwt.sign({ 
            userId: user._id, 
            rol: user.rol 
        },
        process.env.JWT_SECRET, 
        { expiresIn: "1d" } )

        res.cookie("cle_session", token, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            message: "Inicio de sesión exitoso.",
            token,
            user: {
                _id: user._id,
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                phone: user.phone,
                rol: user.rol
            } 
        })
    } catch(e){
        console.error("Login error", e)

        return res.status(500).json({
            success: false,
            message: "Internal sever error"
        })
    }
}

export const logoutUser = (req, res) => {
    res.clearCookie("cle_session", cookieOptions)

    return res.status(200).json({
        success: true,
        message: "Sesión cerrada exitosamente"
    })
}

export const getProfile = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    })
}