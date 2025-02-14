import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Post } from '../models/post.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

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
const updatePost = asyncHandler(async (req, res, next) => {
    const { title, description, tags } = req.body;
    const { postId } = req.params.id;
    const post = await Post.findOne({
        _id: new mongoose.Types.ObjectId(postId),
        author: req.user._id
    })
    console.log(post);
    if (!post) {
        throw new ApiError(404, 'Post not found');
    }
    let images = post.images;
    if (req.files && req.files.length) {
        const existedImages = post.images.length; // total images already present in the post
        const newImages = images.length; // Newly uploaded images
        const totalImages = existedImages + newImages;
        if (totalImages > 5) {

            newImages?.forEach((img) => removeLocalFile(img.localPath));
            throw new ApiError(400, 'Cannot upload more than 5 images');
        }
        images = await Promise.all(req.files.map(async (image) => {
            const imageLocalPath = image.path;
            const imageCloudinary = await uploadOnCloudinary(imageLocalPath);
            return { url: imageCloudinary.url, localPath: imageLocalPath };
        }));
        images = [...images, ...newImages];
    }

    
    const updatedPost = await SocialPost.findByIdAndUpdate(
        postId,
        {
            $set: {
                title,
                description,
                tags,
                images,
            },
        },
        {
            new: true,
        }
    );
    return res
        .status(200)
        .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
})
const deletePost = asyncHandler(async (req, res, next) => {

})
const getAllPosts = asyncHandler(async (req, res, next) => {

})
const getPostById = asyncHandler(async (req, res, next) => {

})
const getPostByUsername = asyncHandler(async (req, res, next) => {

})
export {
    createPost,
    updatePost
};