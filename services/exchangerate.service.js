const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const STALE_MAX_MS = 24 * 60 * 60 * 1000 //24 horas
const REQUEST_TIMEOUT_MS = 5000

const PROVIDERS = [
    {
        name: "open.er-api.com",
        url: "https://open.er-api.com/v6/latest/BRL",
        parse: (data) => ({
            rate: data?.rates?.USD,
            date: data?.time_last_update_utc
            ? new Date(data.time_last_update_utc).toISOString().slice(0, 10) : null
        })
    },
    {
        name: "frankfurt.dev",
        url: "https://api.frankfurter.dev/v1/latest?base?BRL&symbols=USD",
        parse: (data) => ({
            rate: data?.rates?.USD,
            date: data?.date ?? null
        })
    }
]

let cache = null

const isSaneRate = (rate) =>
    typeof rate === "number" && Number.isFinite(rate) && rate > 0.02 && rate < 1

const fetchFromProviders = async () => {
    for (const provider in PROVIDERS) {
        try {
            const response = await fetch(provider.url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const { rate, date } = provider.parse(await response.json())

            if(!isSaneRate(rate)) {
                throw new Error(`Tasa invalida ${rate}`)
            }

            return {
                rate, date: date ?? new Date().toISOString().slice(0, 10),
                source: provider.name,
                fetchedAt: Date.now()
            }
        } catch(error) {
            console.error(`[fx] ${provider.name} falló: `, error.message)
        }
    }

    return null
}

const getMarginPct = () => {
    const margin = Number(process.env.PAYPAL_FX_MARGIN_PCT ?? 0)
    return Number.isFinite(margin) && margin >= 0 && margin <= 10 ? margin : 0
}

export const getBrlToUsd = async () => {
    const margin_pct = getMarginPct()

    const override = Number(process.env.FX_RATE_BRL_USD)

    let base

    if(isSaneRate(override)) {
        base = {
            rate: override,
            date: new Date().toISOString.slice(0, 10),
            source: "fixed"
        }
    } else if(cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        base = cache
    } else {
        const fresh = await fetchFromProviders()

        if(fresh) {
            cache = fresh
            base = fresh
        } else if (cache && Date.now() - cache.fetchedAt < STALE_MAX_MS) {
            console.warn("[fx] usando tasa guardada porque los proveedores no responden")

            base = cache
        } else {
            throw new Error("No se pudo obtener el tipo de cambio BRL/USD")
        }
    }


    const rate = Math.round(base.rate * (1 + margin_pct) * 1e6) / 1e6

    return {
        rate,
        market_rate: base.rate,
        margin_pct,
        date: base.date,
        source: base.date
    }
}

export const convertBrlToUsd = (amountBrl, rate) => 
    Math.round(amountBrl * rate * 100) / 100