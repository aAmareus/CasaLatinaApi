import { sendEmail } from "../services/mail.service.js";

export const testEmail = async (req, res) => {
    try {
        const result = await sendEmail({
            to: process.env.MAIL_ADMIN,
            subject: "Prueba de correo - Casa Latina Experience",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    padding: 24px;
                    color: #222;
                ">
                    <h1>Casa Latina Experience</h1>

                    <p>Nuestro servicio de correo funcionando temporalmente!</p>
                    <p>
                        Este mensaje fue enviado desde
                        Node.js y Express utilizando Resend.
                    </p>

                    <hr />

                    <small>
                        Mensaje automático de prueba.
                    </small>
                </div>
            `
        })

        return res.status(200).json({
            success: true,
            message: "Correo aceptado por Resend",
            email_id: result.id
        })
    } catch(error) {
        console.error("Error enviando el correo: ", error)

        return res.status(500).json({
            success: false,
            message: "No se pudo enviar el correo electrónico"
        })
    }
}