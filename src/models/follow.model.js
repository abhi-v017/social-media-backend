import mongoose, { Schema } from "mongoose";

const followSchema = new Schema(
    {
        followerId:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        followeeId:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
)

export const Follow = mongoose.model("Follow", followSchema)