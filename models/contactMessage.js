import { Schema, model } from "mongoose"

const contactMessageSchema = new Schema({
    consultation_id: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },

    subject: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 150
    },

    email_status: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    }
}, { timestamps: true })

export default model("ContactMessage", contactMessageSchema)