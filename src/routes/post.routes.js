import { Router } from "express";
import {createPost, updatePost, deletePost, getAllPosts, getPostByUsername, getMyPosts} from '../controllers/post.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()

router.route('/create-post').post(verifyJwt, upload.array('images'),createPost)
router.route('/delete/:id').delete(verifyJwt, deletePost)
router.route('/update-post/:id').patch(verifyJwt, upload.array('images'), updatePost)
router.route('/all-posts').get(verifyJwt, getAllPosts)
router.route('/get/u/:username').get(verifyJwt, getPostByUsername)
router.route("/get/my").get(verifyJwt, getMyPosts);


export default router