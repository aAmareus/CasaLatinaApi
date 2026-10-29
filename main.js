import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"

import userRoutes from "./routes/user.routes.js"
import roomRoutes from "./routes/rooms.routes.js"
import reservasRoutes from "./routes/reserva.routes.js"
import paymentsRoutes from "./routes/payments.routes.js"
import poiRoutes from "./routes/poi.routes.js"
import { timeStamp } from "console"


const __filename = fileURLToPath(import.meta.url)
const __dirname =path.dirname(__filename)

const app = express()

app.use(cors())
app.use(express.json())
// app.use(express.json()) // enable when prod

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://casalatina-experience.com",
        "https://zxpfcpbp-8080.brs.devtunnels.ms/"
    ],
    methods: [
        "GET",
        "POST",
        "PATCH",
        "DELETE"
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}))

// Health Route for check db
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState // if connected = 1
    res.status(dbState === 1 ? 200 : 503).json({
        status: dbState === 1 ? 'ok' : "db_disconnected",
        uptime: process.uptime(),
        timeStamp: new Date().toISOString(),
    })
})

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Routes
app.use("/api/users", userRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/reservas", reservasRoutes)
app.use("/api/payments", paymentsRoutes)
app.use("/api/pois", poiRoutes)

export default app;