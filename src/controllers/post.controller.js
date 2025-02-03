import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { Post } from '../models/post.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

createPost = asyncHandler(async (req, res, next) => {
    const { title, description, tags } = req.body;
    const images = req.files.images && req.files.images?.length
        ? req.files.images.map((image) => {
            const imageLocalPath = image.path;
            const imageCloudinary = uploadOnCloudinary(imageLocalPath);
            return { url: imageCloudinary.url };
        })
        : [];
    if (!imageLocalPath) {
        throw new ApiError(400, 'Please provide an image');
    }

    const owner = req.user._id;

    const post = await Post.create({ title, description, tags: tags || [], images: images || [], owner });
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
    if (!post) {
        throw new ApiError(404, 'Post not found');
    }
    let images =
        req.files?.images && req.files.images?.length
            ? req.files.images.map((image) => {
                const imageLocalPath = image.path;
                const imageCloudinary = uploadOnCloudinary(imageLocalPath);
                return { url: imageCloudinary.url };
            })
            : [];
    const existedImages = post.images.length; // total images already present in the post
    const newImages = images.length; // Newly uploaded images
    const totalImages = existedImages + newImages;
    if (totalImages > 5) {

        images?.map((img) => removeLocalFile(img.localPath));
    }
    images = [...post.images, ...images];
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
export {
    createPost,
    updatePost
};