const PROPERTY_TIMEZONE = "America/Sao_Paulo"

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const validateReservationDates = (check_in, check_out) => {
    if(
        typeof check_in !== "string" ||
        typeof check_out !== "string" ||
        !check_in ||
        !check_out
        ) {
            return {
                isValid: false,
                message: "Check-in and check-out dates are required"
            }
        }
    
    if(
        !dateRegex.test(check_in) ||
        !dateRegex.test(check_out)
        ) {
            return {
                isValid: false,
                message: "Dates must use YYY-MM-DD format"
            }
        }

    const checkIn = new Date(`${check_in}T00:00:00.000Z`)
    const checkOut = new Date(`${check_out}T00:00:00.000Z`)

    const isValidDate = (dateString, date) => {
        return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === dateString
        )
    }

    if(
        !isValidDate(check_in, checkIn) ||
        !isValidDate(check_out, checkOut)
    ) {
        return {
            isValid: false,
            message: "Invalid reservation dates"
        }
    }

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: PROPERTY_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date())

    if(check_in < today) {
        return {
            isValid: false,
            message: "Check-in cannot be in the past"
        }
    }

    if(check_in >= check_out) {
        return {
            isValid: false,
            message: "Check-out must be after check-in"
        }
    }

    return {
        isValid: true,
        checkIn,
        checkOut,
        message: null
    }
}