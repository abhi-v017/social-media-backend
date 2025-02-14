import mongoose, {Schema } from "mongoose";

const postSchema = new Schema(
    {
        images:{
            type: [
                {
                    url: String,
                }
            ],
            default: [],
            required: true,
        },
        title:{
            type: String,
            required: true,
        },
        description:{
            type: String,
            required: true,
        },
        tags:{
            type: [String],
            default: []
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

export const Post = mongoose.model("Post", postSchema)