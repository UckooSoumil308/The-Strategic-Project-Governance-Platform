import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Notice from "../models/notifications.js";
import User from "../models/users.js";
import Organization from "../models/organization.js";
import { createJWT } from "../utils/index.js";

// POST request - login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res
            .status(401)
            .json({ status: false, message: "Invalid email or password." });
    }

    if (!user?.isActive) {
        return res.status(401).json({
            status: false,
            message: "User account has been deactivated, contact the administrator",
        });
    }

    const isMatch = await user.matchPassword(password);

    if (user && isMatch) {
        createJWT(res, user._id);

        user.password = undefined;

        res.status(200).json({ ...user._doc, organizationId: user.organizationId });
    } else {
        return res
            .status(401)
            .json({ status: false, message: "Invalid email or password" });
    }
};

// POST - Register a new user
const registerUser = async (req, res) => {
    try {
        const { name, email, password, isAdmin, role, title } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res
                .status(400)
                .json({ status: false, message: "Email address already exists" });
        }

        let targetOrgId = null;
        const newUserId = new mongoose.Types.ObjectId();

        if (isAdmin) {
            // If an Admin registers, create a new Organization for them
            // Pre-generating the User ID solves the circular validation dependency
            const org = await Organization.create({
                name: `${name}'s Organization`,
                owner: newUserId
            });
            targetOrgId = org._id;
        } else {
            // If a standard user is created, the request must come from a logged-in Admin.
            const token = req.cookies.token;
            if (!token) {
                return res.status(401).json({ status: false, message: "Unauthorized. Required admin token to create standard user." });
            }
            try {
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                const creator = await User.findById(decodedToken.userId).select("organizationId isAdmin name");
                if (!creator || !creator.isAdmin) {
                    return res.status(401).json({ status: false, message: "Unauthorized. Only admins can create standard members." });
                }

                // Legacy Admin Support: Lazily create an organization if the admin doesn't have one
                if (!creator.organizationId) {
                    const org = await Organization.create({
                        name: `${creator.name}'s Organization`,
                        owner: creator._id
                    });
                    creator.organizationId = org._id;
                    await creator.save({ validateBeforeSave: false }); // Bypass any other strict validations
                    targetOrgId = org._id;
                } else {
                    targetOrgId = creator.organizationId;
                }
            } catch (error) {
                return res.status(401).json({ status: false, message: "Invalid token." });
            }
        }

        const user = await User.create({
            _id: newUserId,
            name,
            email,
            password,
            isAdmin,
            role,
            title,
            organizationId: targetOrgId,
        });

        if (user) {
            if (isAdmin) {
                createJWT(res, user._id);
            }

            user.password = undefined;

            res.status(201).json(user);
        } else {
            return res
                .status(400)
                .json({ status: false, message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

// POST -  Logout user / clear cookie
const logoutUser = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};

// @GET -   Get user profile
// const getUserProfile = asyncHandler(async (req, res) => {
//   const { userId } = req.user;

//   const user = await User.findById(userId);

//   user.password = undefined;

//   if (user) {
//     res.json({ ...user });
//   } else {
//     res.status(404);
//     throw new Error("User not found");
//   }
// });

const getTeamList = async (req, res) => {
    const { search } = req.query;
    const { organizationId } = req.user;

    let query = { organizationId };

    if (search) {
        const searchQuery = {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
                { role: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ],
        };
        query = { ...query, ...searchQuery };
    }

    const user = await User.find(query).select("name title role email isActive");

    res.status(201).json(user);
};

// @GET  - get user notifications
const getNotificationsList = async (req, res) => {
    const { userId } = req.user;

    const notice = await Notice.find({
        team: userId,
        isRead: { $nin: [userId] },
    })
        .populate("task", "title")
        .sort({ _id: -1 });

    res.status(200).json(notice);
};

const getUserTaskStatus = async (req, res) => {
    const { organizationId } = req.user;
    const tasks = await User.find({ organizationId })
        .populate("tasks", "title stage")
        .sort({ _id: -1 });

    res.status(200).json(tasks);
};

// @GET  - get user notifications
const markNotificationRead = async (req, res) => {
    try {
        const { userId } = req.user;
        const { isReadType, id } = req.query;

        if (isReadType === "all") {
            await Notice.updateMany(
                { team: userId, isRead: { $nin: [userId] } },
                { $push: { isRead: userId } },
                { new: true }
            );
        } else {
            await Notice.findOneAndUpdate(
                { _id: id, isRead: { $nin: [userId] } },
                { $push: { isRead: userId } },
                { new: true }
            );
        }
        res.status(201).json({ status: true, message: "Done" });
    } catch (error) {
        console.log(error);
    }
};

// PUT - Update user profile
const updateUserProfile = async (req, res) => {
    const { userId, isAdmin } = req.user;
    const { _id } = req.body;

    const id =
        isAdmin && userId === _id
            ? userId
            : isAdmin && userId !== _id
                ? _id
                : userId;

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    // if (req.body.email) updateData.email = req.body.email; // Email updates typically need extra verification
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.role) updateData.role = req.body.role;

    // Use findByIdAndUpdate to bypass full document validation on legacy users missing organizationId
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true } // runValidators only applies to modified paths in an update
    );

    if (updatedUser) {
        updatedUser.password = undefined;

        res.status(200).json({
            status: true,
            message: "Profile Updated Successfully.",
            user: updatedUser,
        });
    } else {
        res.status(404).json({ status: false, message: "User not found" });
    }
};

// PUT - active/disactivate user profile
const activateUserProfile = async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);

    if (user) {
        user.isActive = req.body.isActive;

        await user.save();

        user.password = undefined;

        res.status(201).json({
            status: true,
            message: `User account has been ${user?.isActive ? "activated" : "disabled"
                }`,
        });
    } else {
        res.status(404).json({ status: false, message: "User not found" });
    }
};

const changeUserPassword = async (req, res) => {
    const { userId } = req.user;

    // Remove this condition
    if (userId === "65ff94c7bb2de638d0c73f63") {
        return res.status(404).json({
            status: false,
            message: "This is a test user. You can not chnage password. Thank you!!!",
        });
    }

    const user = await User.findById(userId);

    if (user) {
        user.password = req.body.password;

        await user.save({ validateBeforeSave: false }); // Bypass strict validation for legacy users missing organizationId but still trigger the pre-save password hash hook

        user.password = undefined;

        res.status(201).json({
            status: true,
            message: `Password chnaged successfully.`,
        });
    } else {
        res.status(404).json({ status: false, message: "User not found" });
    }
};

// DELETE - delete user account
const deleteUserProfile = async (req, res) => {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

    res.status(200).json({ status: true, message: "User deleted successfully" });
};

export {
    activateUserProfile,
    changeUserPassword,
    deleteUserProfile,
    getNotificationsList,
    getTeamList,
    getUserTaskStatus,
    loginUser,
    logoutUser,
    markNotificationRead,
    registerUser,
    updateUserProfile,
};