import "dotenv/config"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

export const uploadImage = (buffer, folder = "casalatina/uploads") => 
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "image" },
            (error, result) => (error ? reject(error) : resolve(result))
        )
        stream.end(buffer)
    })


export const isCloudinaryUrl = (url) =>
    typeof url === "string" && url.includes("res.cloudinary.com")


export const getPublicIdFromUrl = (url) => {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/)
    return match ? match[1] : null
}

export const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId)

export default cloudinary