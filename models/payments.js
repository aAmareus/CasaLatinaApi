import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
    reservation_id: {
        type: Schema.Types.ObjectId,
        ref: 'Reserva',
        required: true
    },
    provider: {
        type: String,
        enum: ['paypal', 'stripe', 'mercadopago'],
        required: true
    },

    // ID de la orden en el proveedor
    external_payment_id: {
        type: String,
        required: true
    },

    // ID de la captura (cobro real)
    capture_id: {
        type: String
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true
    },

    // Como se llegó al monto. Para explicar
    amount_brl: {
        type: Number,
        min: 0
    },

    exchange_rate: {
        type: Number,
        min: 0
    },

    exchange_rate_date: {
        type: String
    },

    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    }
})

export default model('Payment', paymentSchema, 'payments');