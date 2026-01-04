import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/users.js";

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("DB Connected for Seeding");

        const existingAdmin = await User.findOne({ email: "admin@gmail.com" });

        if (existingAdmin) {
            console.log("Admin user already exists");
            process.exit(0);
        }

        const adminUser = new User({
            name: "Codewave Asante",
            email: "admin@gmail.com",
            password: "123456",
            isAdmin: true,
            role: "Admin",
            title: "Administrator",
            isActive: true
        });

        await adminUser.save();
        console.log("Admin user created successfully");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();
