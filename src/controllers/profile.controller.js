import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { Profile } from "../models/profile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getUserProfile = async (userId, req) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    let profile = await Profile.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "account",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            coverImage: 1,
                            username: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "follows",
                localField: "owner",
                foreignField: "followerId",
                as: "following", // users that are followed by current user
            },
        },
        {
            $lookup: {
                from: "follows",
                localField: "owner",
                foreignField: "followeeId",
                as: "followedBy", // users that are following the current user
            },
        },
        {
            $addFields: {
                account: { $first: "$account" },
                followersCount: { $size: "$followedBy" },
                followingCount: { $size: "$following" },
            },
        },
        {
            $project: {
                followedBy: 0,
                following: 0,
            },
        },
    ]);
    let isFollowing = false;
    if (req.user?._id && req.user?._id?.toString() !== userId.toString()) {
        const followInstance = await Follow.findOne({
            followerId: req.user?._id,
            followeeId: userId,
        });
        isFollowing = followInstance ? true : false;
    }
    console.log(profile);
    const userProfile = profile[0];
    if (!userProfile) {
        throw new ApiError(404, "User profile does not exist");
    }
    return { ...userProfile, isFollowing };
};
const getMySocialProfile = asyncHandler(async (req, res) => {
    let profile = await getUserProfile(req.user._id, req);
    return res
        .status(200)
        .json(new ApiResponse(200, profile, "User profile fetched successfully"));
});
const getProfileByUserName = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User.findOne({ username });
    
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    console.log(user._id)
    const userProfile = await getUserProfile(user._id, req);

    return res
        .status(200)
        .json(
            new ApiResponse(200, userProfile, "User profile fetched successfully")
        );
});
const updateSocialProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, bio, dob, location } =
        req.body;

    let profile = await SocialProfile.findOneAndUpdate(
        {
            owner: req.user._id,
        },
        {
            $set: {
                firstName,
                lastName,
                bio,
                dob,
                location
            },
        },
        { new: true }
    );

    profile = await getUserProfile(req.user._id, req);

    return res
        .status(200)
        .json(new ApiResponse(200, profile, "User profile updated successfully"));
});

export {
    getUserProfile,
    getMySocialProfile,
    getProfileByUserName,
    updateSocialProfile
}