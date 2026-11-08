export const verifyTurnstile = async (req, res, next) => {
    const token = req.body?.turnstileToken

    if(!process.env.TURNSTILE_SECRET_KEY) {
        console.error("Falta el SECRET_KEY de TURNSTILE")

        return res.status(503).json({
            success: false,
            message: "Servicio de verificación no disponible."
        })
    }
    
    if(typeof token !== "string" || !token || token.length > 2048) {
        return res.status(400).json({
            success: false,
            message: "Debes completar la verificación de seguridad."
        })
    }

    try {
        const response = await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    secret: process.env.TURNSTILE_SECRET_KEY,
                    response: token
                }),
                signal: AbortSignal.timeout(10000)
            })

        if(!response.ok) {
            throw new Error(`Error cloudflare: ${response.status}`)
        }

        const result = await response.json()

        if(!result.success) {
            console.warn("Turnstile rechazado: ", result["error-codes"])

            return res.status(403).json({
                success: false,
                message: "Verificación de seguridad fallida. Intentelo nuevamente."
            })
        }

        const allowedHostnames = [
            "localhost",
            "casalatina-experience.com"
        ]

        if(!allowedHostnames.includes(result.hostname)) {
            return res.status(403).json({
                success: false,
                message: "Origen de verificación no autorizado."
            })
        }

        next()

    } catch(error) {
        console.error("Error verificando Turnstile: ", error)

        return res.status(503).json({
            success: false,
            message: "No se pudo completar la verificación"
        })
    }
}