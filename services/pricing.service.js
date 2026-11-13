const SEASONS = {
    low: "low",
    mid: "mid",
    high: "high",
    carnival: "carnival"
}

const PRICE_FIELDS = {
    low: "priceLowSeason",
    mid: "priceMidSeason",
    high: "priceHighSeason",
    carnival: "priceCarnivalSeason"
}

const CARNIVAL_DATES = {
    2026: {
        start: "2026-02-13",
        end: "2026-02-18"
    },

    2027: {
        start: "2027-02-05",
        end: "2027-02-10"
    },

    2028: {
        start: "2028-02-25",
        end: "2028-03-01"
    }
}

export const getSeasonForDate = (date) => {
    const currentDate = new Date(`${date}T00:00:00Z`)

    const  isDateInRange = (date, start, end) => {
        return date >= start && date <= end
    }

    if(Number.isNaN(currentDate.getTime())) {
        throw new Error("Invalid date")
    }

    const year = currentDate.getUTCFullYear()
    const month = currentDate.getUTCMonth() + 1

    const dateString = currentDate
        .toISOString()
        .split("T")[0]

    const carnival = CARNIVAL_DATES[year]

    if(
        carnival &&
        isDateInRange(
            dateString,
            carnival.start,
            carnival.end
        )
    ){
        return SEASONS.carnival
    }

    if(
        month === 12 ||
        month === 1 ||
        month === 2 ||
        month === 3
    ){
        return SEASONS.high
    }

    if(
        month >= 6 &&
        month <= 8
    ){
        return SEASONS.low
    }

    return SEASONS.mid
}

export const getPriceForNight = (room, date) => {
    const season = getSeasonForDate(date)
    
    const priceField = PRICE_FIELDS[season]

    const price = room[priceField]

    if(typeof price !== "number" || price < 0){
        console.error("DEBUG precio inválido:", {
            season, 
            priceField,
            price,
            tipo: typeof price,
            RoomFields: Object.keys(room.toObject())
        })

        throw new Error(`Invalid price for: ${season}`)
    }

    return {
        date,
        season,
        price
    }
}

export const calculateReservationPrice = (room, checkIn, checkOut) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)

    if(
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        throw new Error("Invalid reservation dates")
    }

    if(start > end){
        throw new Error("Check-out must be after check-in")
    }

    const nights = []

    const currentDate = new Date(start)

    while(currentDate < end){
        const dateString = currentDate
            .toISOString()
            .split("T")[0]

        const night = getPriceForNight(
            room,
            dateString
        )

        nights.push(night)

        currentDate.setUTCDate(
            currentDate.getUTCDate() + 1
        )
    }

    const subtotal = nights.reduce(
        (total, night) => total + night.price, 0
    )

    const breakdown = {}

    for(const night of nights){
        if(!breakdown[night.season]){
            breakdown[night.season] = {
                nights: 0,
                pricePerNight: night.price,
                subtotal: 0
            }
        }

        breakdown[night.season].nights += 1
        breakdown[night.season].subtotal += night.price
    }

    const discountPercentage = room.descuento ?? 0

    const discountAmount = 
        subtotal * (discountPercentage / 100)

    const total = subtotal - discountAmount


    return {
        nights,
        breakdown,
        numberOfNights: nights.length,
        subtotal,
        discountPercentage,
        discountAmount,
        total
    }
}