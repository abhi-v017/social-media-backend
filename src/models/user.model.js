import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        fullName:{
            type: String,
            required: true,
            trim: true,
            index: true
        },
        
        bio: {
            type: String,
            required: true,
            trim: true
        },
        dob: {
            type: Date,
            required: true
        },
        location: {
            type: String,
            default: "Earth",
        },
        avtar:{
            type: String,
            required: true,
        },
        coverImage:{
            type: String
        },
        password:{
            type: String,
            required: [true, "password is required"],
        },
        followersCount:{
            type: Number,
            default: 0
        },
        followingCount:{
            type: Number,
            default: 0
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const  User = mongoose.model("User", userSchema)