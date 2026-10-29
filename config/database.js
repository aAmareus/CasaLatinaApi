import mongoose from "mongoose";

const connectDB = async () => {
    try {

        await mongoose.connect(`${process.env.DATABASE_URL}`)

        console.log('MONGODB connected.')
    } catch(e) {
        console.error('Failed to connect: ', e)
        process.exit(1)
    }
}

export default connectDB