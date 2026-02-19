import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Database Connected");
    } catch (error) {
        console.log("DB Error: " + error);
    }
};

const createJWT = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
        maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
    });
};

export { dbConnection, createJWT };
