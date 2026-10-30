import mongoose from "mongoose"
import Room from "../models/rooms.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { uploadImage, deleteImage, isCloudinaryUrl, getPublicIdFromUrl } from "../config/cloudinary.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roomsUploadPath = path.join(
    __dirname,
    "../uploads/rooms"
)

export const createRoom = async (req, res) => {
    try {
        const {
            name,
            description,
            capacity,
            priceHighSeason,
            priceLowSeason,
            priceMidSeason,
            priceCarnivalSeason,
            amenities,
            descuento
        } = req.body

        const room = await Room.create({
            name,
            description,
            capacity,
            priceHighSeason,
            priceLowSeason,
            priceMidSeason,
            priceCarnivalSeason,
            descuento
        })

        return res.status(201).json({
            success: true,
            message: "Room created succesfully",
            room
        })
    } catch(e){
        console.error("Error creating a room", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({
            active: { $ne: false }
        })

        return res.status(200).json({
            success: true,
            rooms
        })
    } catch(e){
        console.error("Error getting rooms", e)

        return res.status(500).json({
            success: false,
            message: "Internal sever error,"
        })
    }
}

export const getRoomById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room Id"
            })
        }

        const room = await Room.findById(id)

        if(!room){
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        return res.status(200).json({
            success: true,
            room
        })
    } catch(e) {
        console.error("Error getting room", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params
        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            })
        }

        const allowedFields = [
            "name",
            "description",
            "capacity",
            "priceHighSeason",
            "priceMidSeason",
            "priceLowSeason",
            "priceCarnivalSeason",
            "amenities",
            "descuento"
        ]

        const updates = {}

        for(const field of allowedFields){
            if (req.body[field] !== undefined){
                updates[field] = req.body[field]
            }
        }

        if(Object.keys(updates).length === 0){
            return res.status(400).json({
                success: false,
                message: "No valid fields"
            })
        }

        const room = await Room.findByIdAndUpdate(
            id,
            updates,
            {
                returnDocument: "after",
                runValidators: true
            }
        )

        if(!room){
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        return res.status(200).json({
            success: true,
            message: "Room updated succesfully",
            room
        })
    } catch(e){
        console.error("Error updating room", e)

        return res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
}

export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            });
        }

        const room = await Room.findByIdAndUpdate(
            id,
            {
                active: false
            },
            {
                returnDocument: "after"
            }
        );

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Room deactivated successfully",
            room
        });

    } catch (error) {
        console.error("Error deactivating room:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const uploadRoomImages = async (req, res) => {
    try {
        const { id } = req.params

        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({
                success: false,
                message: "Invalid room ID"
            })
        }

        const room = await Room.findById(id)

        if(!room){
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        if(!req.files || req.files.length === 0){
            return res.status(400).json({
                success: false,
                message: "No images were uploaded"
            })      
        }

        const currentImgs = room.images?.length || 0;
        const newImgs = req.files.length

        if(currentImgs + newImgs > 10){
            req.files.forEach((file) => {
                if(fs.existsSync(file.path)){
                    fs.unlinkSync(file.path)
                }
            })

            return res.status(400).json({
                success: false,
                message: `A room can hace a maximum of 10 images. Currently it has ${currentImgs}`
            })
        }

        const results = await Promise.all(
            req.files.map(file => uploadImage(file.buffer, "casalatina/uploads"))
        )

        room.images.push(...results.map(r => r.secure_url))
        await room.save()

        return res.status(200).json({
            success: true,
            message: "Images uploaded successfully",
            room
        })
    }catch(e){
        console.error("Error uploading room images", e)

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

export const deleteRoomImage = async (req, res) => {
    try {
        const { id, filename } = req.params

        if(!mongoose.isValidObjectId(id)){
            return res.status(400).json({
                succes: false,
                message: "Invalid room ID"
            })
        }

        const room = await Room.findById(id)

        if(!room){
            return res.status(404).json({
                success: false,
                message: "Room not found"
            })
        }

        const imagePath = `/uploads/rooms/${filename}`

        if(!room.images.includes(imagePath)){
            return res.status(404).json({
                success: false,
                message: "Image not found in this room"
            })
        }

        const filePath = path.join(
            roomsUploadPath,
            filename
        )

        if(fs.existsSync(filePath)){
            fs.unlinkSync(filePath)
        }

        room.images = room.images.filter(
            image => image !== imagePath
        )

        await room.save()

        return res.status(200).json({
            success: true,
            message: "Image deleted successfully",
            room
        })
    } catch(e) {
        console.error(" Error deleting room image", e)

        return res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
}