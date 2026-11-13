import mongoose, { Schema, model } from "mongoose"

const externalBookingSchema = new Schema({
    
    listing_id: {
        type: Schema.Types.ObjectId,
        ref: "ExternalListing",
        required: true,
    },

    external_id: {
        type: String,
        required: true,
        trim: true
    },

    sync_source: {
        type: String,
        enum: ["manual", "airbnb_ical"],
        default: "manual"
    },

    check_in: {
        type: Date,
        required: true
    },

    checkOut: {
        type: Date,
        required: true
    },

    summary: {
        type: String,
        default: null
    },

    last_seen_at: {
        type: String,
        default: Date.now
    }
}, { timeStamps: true })

externalBookingSchema.index(
    { listing_id: 1, external_id: 1},
    { unique: true }
)

export default model("ExternalBooking", externalBookingSchema)