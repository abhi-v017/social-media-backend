import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Post } from '../models/post.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import cloudinary from 'cloudinary'



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
    return res.status(201).json(new ApiResponse(201, 'Post created successfully', post));

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
        { $set: { ...updateData} },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedDetails, "Details updated successfully"));
});
const updatePostImages = asyncHandler(async (req, res) => {
    const { id: postId } = req.params;
    const images = req.body.images || [];
    if (images.length === 0) {
        throw new ApiError(400, "Please provide images to update");
    }
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    // Update the post images
    const updatedImages = await Post.findByIdAndUpdate
        (postId,
            { $set: { images } },
            { new: true }
        );
    return res
        .status(200)
        .json(new ApiResponse(200, updatedImages, "Images updated successfully"));  
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
        await cloudinary.v2.uploader.destroy(image._id);
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Post deleted successfully"));
})
const getAllPosts = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    // Build the query object
    const queryObject = {};
    if (userId) {
        queryObject.userId = userId; // Filter by userId if provided
    }
    if (query) {
        queryObject.title = { $regex: query, $options: 'i' }; // Search by title if query is provided
    }

    // Fetch videos with pagination and sorting
    const posts = await Post.find(queryObject)
        .sort({ [sortBy]: sortType === 'asc' ? 1 : -1 }) // Sort by the specified field
        .skip((pageNumber - 1) * limitNumber) // Skip the records for pagination
        .limit(limitNumber); // Limit the number of records returned

    // Get the total count of videos for pagination
    const totalPost = await Post.countDocuments(queryObject);

    // Return the response
    return res.status(200).json(new ApiResponse(200, {
        posts,
        totalPages: Math.ceil(totalPost / limitNumber),
        currentPage: pageNumber,
        totalPost
    }, "Posts fetched successfully"));
})
const getMyPosts = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const posts = await Post.find({ owner: req.user._id })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const totalPosts = await Post.countDocuments({ owner: req.user._id });

    return res
        .status(200)
        .json(new ApiResponse(200, {
            posts,
            totalPages: Math.ceil(totalPosts / limitNumber),
            currentPage: pageNumber,
            totalPosts,
        }, "my posts fetched successfully"));
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
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const posts = await Post.find({ owner: user._id })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    const totalPosts = await Post.countDocuments({ owner: user._id });


    return res
        .status(200)
        .json(new ApiResponse(200, {
            posts,
            totalPages: Math.ceil(totalPosts / limitNumber),
            currentPage: pageNumber,
            totalPosts,
        }, "User's posts fetched successfully"));
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