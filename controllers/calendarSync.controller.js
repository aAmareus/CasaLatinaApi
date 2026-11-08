import { syncAirbnbCalendars } from "../services/calendarSync.service.js"

export const runCalendarSync = async (req, res) => {

    try {
        const dryRun = req.body?.apply !== true

        const result = await syncAirbnbCalendars({
            dryRun
        })

        return res.status(200).json({
            success: true,
            message: dryRun ? "Vista previa de calendarios completada" : "Importación de calendarios finalizada",
            ...result
        })
    } catch(error) {
        console.error("Error general sincronizando: ", error)

        return res.status(500).json({
            success: false,
            message: "Error sincronizando los calendarios"
        })
    }
}