import mongoose from "mongoose"
import Reserva from "../models/reserva.js"
import Room from "../models/rooms.js"
import { calculateReservationPrice } from "../services/pricing.service.js"
import { validateReservationDates } from "../services/reservationDates.service.js"
import { checkAvailability } from "../services/availability.service.js"
import { getHoldExpiry } from "../services/reservationhold.service.js"

export const createReserva = async (req, res) => {
    try {
        const {
            room_id,
            check_in,
            check_out
        } = req.body

        const user_id = req.user._id

        const datesValidation = validateReservationDates(
            check_in,
            check_out
        )

        if(!datesValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: datesValidation.message
            })
        }

        const { checkIn, checkOut } = datesValidation

        if(!mongoose.isValidObjectId(room_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            })
        }

        const room = await Room.findById(room_id)

        if(!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        if(!room.active) {
            return res.status(400).json({
                success: false,
                message: "Room is not available"
            })
        }

        const existingPending = await Reserva.findOne({
            room_id,
            user_id,
            estado: "pendiente",
            check_in: checkIn,
            check_out: checkOut,
            hold_expires_at: { $gt: new Date() }
        })

        if(existingPending) {
            return res.status(200).json({
                success: true,
                message: "Reservation already pending.",
                reserva: existingPending
            })
        }

        const availability = await checkAvailability(
            room_id,
            check_in,
            check_out
        )

        if(!availability.available) {
            return res.status(409).json({
                success: false,
                message: "Room is already reserved for these dates"
            })
        }

        const quote = calculateReservationPrice(
            room,
            check_in,
            check_out
        )

        const totalPrice = quote.total

        const reserva = await Reserva.create({
            room_id,
            user_id,
            check_in: checkIn,
            check_out: checkOut,
            estado: "pendiente",
            total_price: totalPrice,
            hold_expires_at: getHoldExpiry()
        })

        return res.status(201).json({
             success: true,
             message: "Reservation created successfully.",
             reserva
        })
    } catch(e) {
        console.error("error creating reservation", e)
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const getReservas = async (req, res) => {
    try {
        let filter = {}

        if(req.user.rol !== "admin") {
            filter.user_id = req.user._id
        }

        const reservas = await Reserva.find(filter).populate(
            "room_id",
            "name description, capacity"
        ).populate(
            "user_id",
            "name lastname email"
        ).sort({ created: -1 })

        return res.status(200).json({
            success: true,
            reservas
        })
    } catch(e) {
        console.error("Error getting reservations ", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const getReservaById = async (req, res) => {
    try {
        const { id } = req.params

        if(!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reservation ID"
            })
        }

        const reserva = await Reserva.findById(id).populate(
            "room_id",
            "name description, capacity"
        ).populate(
            "user_id",
            "name lastname email"
        )

        if(!reserva) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found"
            })
        }

        const isOwner = reserva.user_id._id.toString() === req.user._id.toString()

        const isAdmin = req.user.rol === "admin"

        if(!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You dont have permission to view this reservation"
            })
        }

        return res.status(200).json({
            success: true,
            reserva
        })
    } catch(e) {
        console.error("Error getting reservation", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}


export const cancelReserva = async (req, res) => {
    try {
        const { id } = req.params

        if(!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            })
        }

        const reserva = await Reserva.findById(id)

        if(!reserva) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        const isOwner = reserva.user_id._id.toString() === req.user._id.toString()

        const isAdmin = req.user.rol === "admin"

        if(!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You dont have permission"
            })
        }

        if(reserva.estado === "cancelada") {
            return res.status(409).json({
                success: false,
                message: "reservation already cancelled"
            })
        }

        if(reserva.estado === "confirmada" && !isAdmin) {
            return res.status(409).json({
                succes: false,
                message: "Esta reserva ya está pagada. Contáctanos para cancelarla"
            })
        }

        reserva.estado = "cancelada"
        reserva.hold_expires_at = undefined

        await reserva.save()

        return res.status(200).json({
            success: true,
            message: "reservation cancelled successfully",
            reserva
        })
    } catch(e) {
        console.error("Error cancelling reservation: ", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const quoteReserva = async (req, res) => {
    try {
        const {
            room_id,
            check_in,
            check_out
        } = req.body
 
        if(!room_id){
            return res.status(400).json({
                success: false,
                message: "room_id are required"
            })
        }
 
        if(!mongoose.isValidObjectId(room_id)){
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            })
        }
 
        const datesValidation = validateReservationDates(
            check_in,
            check_out
        )
 
        if(!datesValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: datesValidation.message
            })
        }
 
        const { checkIn, checkOut } = datesValidation
 
        const room = await Room.findById(room_id)
 
        if(!room){
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }
 
        if(!room.active){
            return res.status(400).json({
                success: false,
                message: "Room is not available"
            })
        }
 
        const availability = await checkAvailability(
            room_id,
            check_in,
            check_out
        )
 
        if(!availability.available) {
            return res.status(409).json({
                success: false,
                available: false,
                source: availability.source,
                booking_id: availability._id,
                message: "Room is unavailable for selected dates"
            })
        }
 
        const quote = calculateReservationPrice(
            room,
            check_in,
            check_out
        )
 
        return res.status(200).json({
            success: true,
            available: true,
            quote
        })
    
    } catch(e){
        console.error("Error quoting reservarion:", e)
 
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}