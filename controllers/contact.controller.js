import { randomInt } from "node:crypto"
import validator from "validator"

import ContactMessage from "../models/contactMessage.js"
import { sendEmail } from "../services/mail.service.js";

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    ">": "&lt;",
    "<": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
})[char])

export const sendContactMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body ?? {}

        if(
            [name, email, subject, message].some(
                value => typeof value !== "string"
            )
        ){
            return res.status(400).json({
                success: false,
                message: "Todos los campos son obligatorios"
            })
        }

        const cleanName = name.trim()
        const cleanEmail = email.trim()
        const cleanSubject = subject.trim()
        const cleanMessage = message.trim()

        if (
            cleanName.length < 2 ||
            cleanName.length > 100 ||
            !validator.isEmail(cleanEmail) ||
            cleanEmail.length > 254 ||
            cleanSubject.length < 3 ||
            cleanSubject.length > 150 ||
            cleanMessage.length < 10 ||
            cleanMessage.length > 5000
        ) {
            return res.status(400).json({
                success: false,
                message: "Los datos del formulario no son válidos"
            })
        }


        let consultation = null

        for (let attempt = 0; attempt < 10; attempt++) {
            const consultationId = String(
                randomInt(0, 1000000)
            ).padStart(6, "0")

            try {
                consultation = await ContactMessage.create({
                    consultation_id: consultationId,
                    name: cleanName,
                    email: cleanEmail,
                    subject: cleanSubject,
                    message: cleanMessage
                })
    
                break
            } catch(error) {
                if(
                    error.code === 11000 &&
                    error.keyPattern?.consultation_id
                ) {
                    continue
                }
    
                throw error
            }
        }

        if(!consultation) {
            return res.status(503).json({
                success: false,
                message: "No se pudo generar el número de consulta"
            })
        }

        try {
            await sendEmail({
                to: process.env.MAIL_CONTACT,
                subject: `Nueva consulta (#${consultation.consultation_id}) - Casa Latina Experience`,
                replyTo: cleanEmail,
                html: `
                    <div style="var(--montserrat)">
                        <h2>Nueva consulta de contacto</h2>
                        <p>#${consultation.consultation_id}</p>
                        <p><strong>Nombre:</strong> ${escapeHtml(cleanName)}</p>
                        <p><strong>Correo:</strong> ${escapeHtml(cleanEmail)}</p>
                        <p><strong>Asunto:</strong> ${escapeHtml(cleanSubject)}</p>
    
                        <hr />
    
                        <p><strong>Mensaje:</strong></p>
                        <p style="white-space: pre-wrap">${escapeHtml(cleanMessage)}</p>
                    </div>
                `
            })

            consultation.email_status = "sent"
            await consultation.save()
        } catch(emailError) {
            console.error("Error enviando consulta: ", emailError)

            consultation.email_status = "failed"
            await consultation.save() 

            return res.status(202).json({
                success: true,
                message: "Tu consulta fue registrada, pero la notificación por correo está pendiente",
                consultation_id: consultation.consultation_id,
                email_status: "failed"
            })
        }

        return res.status(200).json({
            success: true,
            message: "Tu consulta fue enviada correctamente",
            consultation_id: consultation.consultation_id
        })

    } catch(error){
        console.error("Error enviando la consulta", error)

        return res.status(500).json({
            success: false,
            message: "No se pudo enviar la consulta"
        })
    }
}