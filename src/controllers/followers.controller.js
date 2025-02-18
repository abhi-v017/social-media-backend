import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const followUnFollowUser = asyncHandler(async (req, res) => {
    const { userId: toBeFollowedUserId } = req.params;
    console.log(toBeFollowedUserId);

    // See if user that is being followed exist
    const toBeFollowed = await User.findById(toBeFollowedUserId);

    if (!toBeFollowed) {
        throw new ApiError(404, "User does not exist");
    }

    // Check of the user who is being followed is not the one who is requesting
    if (toBeFollowedUserId.toString() === req.user._id.toString()) {
        throw new ApiError(422, "You cannot follow yourself");
    }

    // Check if logged user is already following the to be followed user
    const isAlreadyFollowing = await Follow.findOne({
        followerId: req.user._id,
        followeeId: toBeFollowed._id,
    });

    if (isAlreadyFollowing) {
        // if yes, then unfollow the user by deleting the follow entry from the DB
        await Follow.findOneAndDelete({
            followerId: req.user._id,
            followeeId: toBeFollowed._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    following: false,
                },
                "Un-followed successfully"
            )
        );
    } else {
        // if no, then create a follow entry
        await Follow.create({
            followerId: req.user._id,
            followeeId: toBeFollowed._id,
        });
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    following: true,
                },
                "Followed successfully"
            )
        );
    }
});

const getFollowerListByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const user = await User
        .findOne({ username })
        .select("_id");

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
});


export { followUnFollowUser };