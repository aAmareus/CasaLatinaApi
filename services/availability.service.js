import mongoose from "mongoose"
import Reserva from "../models/reserva.js"
import ExternalBooking from "../models/externalBooking.js"
import ExternalListing from "../models/externalListing.js"
import { blockingReservaFilter } from "./reservationhold.service.js"

export const checkAvailability = async (
    roomId,
    checkIn,
    checkOut
) => {
    if(!mongoose.isValidObjectId(roomId)) {
        throw new Error("Invalid room ID")
    }

    const start = new Date(checkIn)
    const end = new Date(checkOut)

    if(
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start >= end
    ) {
        throw new Error("Invalid reservation Dates")
    }

    const internalBooking = await Reserva.findOne({
        room_id: roomId,
        $or: blockingReservaFilter(),
        check_in: {
            $lt: end
        },
        check_out: {
            $gt: start
        }
    })

    if(internalBooking) {
        console.log("Internal booking found: ", internalBooking)

        return {
            available: false,
            source: "internal",
            booking_id: internalBooking._id
        }
    }

    const listing = await ExternalListing.find({
        room_ids: roomId,
        active: true
    }).select("_id")

    
    const listingIds = listing.map(
        listing => listing._id
    )

    console.log("Room ID: ", roomId)
    console.log(
        "Associated listings: ", listings.map(listing => listing._id.toString())
    )

    const externalBooking = await ExternalBooking.findOne({
        listing_id: {
            $in: listingIds
        },
        check_in: {
            $lt: end
        },
        check_out: {
            $gt: start
        }
    }).populate("listing_id", "name type")

    console.log("=== DIAGNOSTICO DISPONIBILIDAD ===")
    console.log("ROOM ID: ", roomId)
    console.log("Check-in: ", start.toISOString())
    console.log("Check-out: ", end.toISOString())

    console.log(
        "Anuncios relacionados: ",
        listings.map(listing => listing._id.toString())
    )

    console.log("reserva externa encontrada: ", externalBooking)

    if(externalBooking) {
        console.log("external booking found: ", externalBooking)
        return {
            available: false,
            source: "external",
            booking_id: externalBooking._id
        }
    }

    return {
        available: true,
        source: null
    }
}