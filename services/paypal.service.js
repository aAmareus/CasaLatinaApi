import { request } from "express"

export class PaypalError extends Error {
    constructor(message, { status, body } = {}) {
        super(message)
        this.name = "PaypalError"
        this.status = status
        this.body = body

        this.issues = Array.isArray(body?.details)
            ? body.details.map((d) => d.issues)
            : []
    }
}

const getBaseUrl = () =>
    ["live", "production"].includes(process.env.PAYPAL_ENV)
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com"
 
let tokenCache = { token: null, expiresAt: 0 }

const getAccessToken = async () => {
    if(tokenCache.token && Date.now() < tokenCache.expiresAt - 60_000) {
        return tokenCache.token
    }

    const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env

    
    if(!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error("Faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en el entorno")
    }

    const credentials = Buffer.from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64")

    const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(10_000)
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        throw new PaypalError("No se pudo autenticar con Paypal", {
            status: response.status,
            body: data
        })
    }

    tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000
    }

    return tokenCache.token
}

const PaypalRequest = async (path, { method = "GET", body, requestId } = {}) => {
    const token = await getAccessToken()

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    }


    if (requestId) headers["PayPal-Request-Id"] = requestId

    const response = await fetch(`${getBaseUrl()}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000)
    })

    const data = await response.json().catch(() => ({}))

    if(!response.ok) {
        throw new PaypalError(data?.message || `Paypal respondió ${response.status}`, {
            status: response.status,
            body: data
        })
    }

    return data
}

export const createPaypalOrder = ({ amountUsd, reservaId, description, requestId }) => 
    PaypalRequest("/v2/checkout/orders", {
        method: "POST",
        requestId,
        body: {
            intent: "CAPTURE",
            purchase_units: [
                {
                    reference_id: String(reservaId),
                    custom_id: String(reservaId),
                    description: description.slice(0, 127),
                    amount: {
                        currency_code: "USD",
                        value: amountUsd.toFixed(2)
                    }
                }
            ]
        }
    })


export const capturePaypalOrder = (orderId) =>
    PaypalRequest(`/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        requestId: `capture-${orderId}`
    })

export const getPaypalOrder = (orderId) =>
    PaypalRequest(`/v2/checkout/orders/${orderId}`)