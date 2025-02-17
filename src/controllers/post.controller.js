import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Post } from '../models/post.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import cloudinary from 'cloudinary'
import { getMongoosePaginationOptions } from '../utils/getMongoosePaginationOptions.js'

const postCommonAggregation = (req) => {
    return [

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "postId",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "postId",
                as: "isLiked",
                pipeline: [
                    {
                        $match: {
                            likedBy: new mongoose.Types.ObjectId(req.user?._id),
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "profiles",
                localField: "owner",
                foreignField: "owner",
                as: "owner",
                pipeline: [
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
                                        email: 1,
                                        username: 1,
                                    },
                                },
                            ],
                        },
                    },
                    { $addFields: { account: { $first: "$account" } } },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                likes: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: {
                            $gte: [
                                {
                                    // if the isLiked key has document in it
                                    $size: "$isLiked",
                                },
                                1,
                            ],
                        },
                        then: true,
                        else: false,
                    },
                }
            },
        },
    ];
};

const createPost = asyncHandler(async (req, res, next) => {
    const { title, description, tags } = req.body;
    let images = [];

    if (req.files && req.files.length) {
        images = await Promise.all(req.files.map(async (image) => {
            const imageLocalPath = image.path;
            const imageCloudinary = await uploadOnCloudinary(imageLocalPath);
            return { url: imageCloudinary.url };
        }));
    }

    if (images.length === 0) {
        throw new ApiError(400, 'Please provide an image');
    }

    const owner = req.user._id;

    const post = await Post.create({ title, description, tags: tags || [], images, owner });
    if (!post) {
        throw new ApiError(500, "Error while creating a post");
    }

    const createdPost = await Post.aggregate([
        {
            $match: {
                _id: post._id,
            },
        },
        ...postCommonAggregation(req),
    ]);

    return res.status(201).json(new ApiResponse(201, 'Post created successfully', createdPost[0]));

})
const updatePostDetails = asyncHandler(async (req, res) => {
    const { id: postId } = req.params;
    const { title, description, tags } = req.body;

    // Check if at least one field is provided
    if (!title && !description && !tags) {
        throw new ApiError(400, "At least one of title, description, or tags is required");
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (tags) updateData.tags = tags;


    // Update the post details
    const updatedDetails = await Post.findByIdAndUpdate(
        postId,
        { $set: { ...updateData } },
        { new: true }
    );
    const aggregatedPost = await Post.aggregate([
        {
            $match: {
                _id: updatedDetails._id,
            },
        },
        ...postCommonAggregation(req),
    ]);
    return res
        .status(200)
        .json(new ApiResponse(200, aggregatedPost[0], "Details updated successfully"));
});
const updatePostImages = asyncHandler(async (req, res) => {
    const { id: postId } = req.params;
    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "Please provide images to update");
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    await Promise.all(post.images.map(async (image) => {
        await cloudinary.v2.uploader.destroy(image._id);
    }));
    let images = [];
    // Upload new images to Cloudinary
    if (req.files && req.files.length) {
        images = await Promise.all(req.files.map(async (image) => {
            const imageLocalPath = image.path;
            const imageCloudinary = await uploadOnCloudinary(imageLocalPath);

            return { url: imageCloudinary.url };
        }));
    }
    if (images.length === 0) {
        throw new ApiError(400, 'Please provide an image');
    }
    const updatedImages = await Post.findByIdAndUpdate
        (postId,
            { $set: { images } },
            { new: true }
        );

    const aggregatedPost = await Post.aggregate([
        {
            $match: {
                _id: updatedImages._id,
            },
        },
        ...postCommonAggregation(req),
    ]);
    return res
        .status(200)
        .json(new ApiResponse(200, aggregatedPost[0], "Images updated successfully"));
});
const deletePost = asyncHandler(async (req, res, next) => {
    const { id: postId } = req.params;

    console.log(postId);

    const post = await Post.findOneAndDelete({
        _id: postId,
        owner: req.user._id,
    });

    if (!post) {
        throw new ApiError(404, "Post does not exist");
    }

    const postImages = [...(post.images || [])];

    await Promise.all(postImages.map(async (image) => {
        // remove images associated with the post that is being deleted
        await cloudinary.v2.uploader.destroy(image._id, {resource_type: 'image'});
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Post deleted successfully"));
})
const getAllPosts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const postAggregation = Post.aggregate([...postCommonAggregation(req)]);

    const posts = await Post.aggregatePaginate(
        postAggregation,
        getMongoosePaginationOptions({
            page,
            limit,
            customLabels: {
                totalDocs: "totalPosts",
                docs: "posts",
            },
        })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, posts, "Posts fetched successfully"));
});
const getMyPosts = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const postAggregation = Post.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        ...postCommonAggregation(req),
    ]);

    const posts = await Post.aggregatePaginate(
        postAggregation,
        getMongoosePaginationOptions({
            page,
            limit,
            customLabels: {
                totalDocs: "totalPosts",
                docs: "posts",
            },
        })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, posts, "My posts fetched successfully"));
});
const getPostByUsername = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query
    const { username } = req.params;
    const user = await User.findOne({
        username: username.toLowerCase(),
    });

    if (!user) {
        throw new ApiError(
            404,
            "User with username '" + username + "' does not exist"
        );
    }
    const userId = user._id;

    const postAggregation = Post.aggregate([
        {
            $match: {
                author: new mongoose.Types.ObjectId(userId),
            },
        },
        ...postCommonAggregation(req),
    ]);

    const posts = await Post.aggregatePaginate(
        postAggregation,
        getMongoosePaginationOptions({
            page,
            limit,
            customLabels: {
                totalDocs: "totalPosts",
                docs: "posts",
            },
        })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, posts, "User's posts fetched successfully"));
})
export {
    createPost,
    updatePostDetails,
    deletePost,
    getAllPosts,
    getPostByUsername,
    updatePostImages,
    getMyPosts
};