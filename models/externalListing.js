import { Schema, model } from "mongoose"

const externalListingSchema = new Schema({
    provider: {
        type: String,
        required: true,
        default: "airbnb",
        trim: true
    },

    listing_id: {
        type: String,
        required: true,
        trim: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    type: {
        type: String,
        enum: ["entire_property", "private_room"],
        require: true
    },

    room_ids: [{
        type: Schema.Types.ObjectId,
        ref: "room",
        required: true
    }],

    calendar_url : {
        type: String,
        default: null,
        select: false
    },

    active: {
        type: Boolean,
        default: true
    }
}, {timestamps: true})

externalListingSchema.index(
    { provider: 1, listing_id: 1},
    { unique: true }
)

export default model("ExternalListing", externalListingSchema)