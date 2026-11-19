import { Resend } from "resend"

let resendClient

const getResendClient = () => {
    if(!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY no está configurada.")
    }

    if(!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY)
    }

    return resendClient
}

export const sendEmail = async ({
    to,
    subject,
    html,
    replyTo
}) => {
    if(!to || !subject || !html) {
        throw new Error("Faltan datos para enviar el correo.")
    }

    const { data, error } = await getResendClient().emails.send({
        from: `Casa Latina Experience <${process.env.MAIL_FROM}>`,
        to,
        subject,
        html,
        ...Resend(replyTo ? { replyTo } : {})
    })

    if(error) {
        throw new Error(`Error de Resend: ${error.message}`)
    }

    return data
}