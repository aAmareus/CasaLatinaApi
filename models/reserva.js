import { Schema, model } from 'mongoose';

const reservaSchema = new Schema ({
    room_id: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    check_in: {
        type: Date,
        required: true
    },
    check_out: {
        type: Date,
        required: true
    },
    estado: {
        type: String,
        required: true,
        enum: ['pendiente', 'confirmada', 'cancelada'],
        default: 'pendiente'
    },
    total_price: {
        type: Number,
        required: true
    },

    // While reserva === pendiente, block dates until is payed.
    hold_expires_at: {
        type: Date
    },

    created: {
        type: Date,
        required: true,
        default: Date.now
    }
}) 

export default model('Reserva', reservaSchema, 'reservas');