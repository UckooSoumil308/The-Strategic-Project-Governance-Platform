import mongoose, { Schema } from "mongoose";

const organizationSchema = new Schema(
    {
        name: { type: String, required: true },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

const Organization = mongoose.model("Organization", organizationSchema);

export default Organization;
