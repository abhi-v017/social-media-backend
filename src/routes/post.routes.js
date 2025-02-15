import { Router } from "express";
import {createPost, updatePost, deletePost, getAllPosts} from '../controllers/post.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()

router.route('/create-post').post(verifyJwt, upload.array('images'),createPost)
router.route('/delete/:id').delete(verifyJwt, deletePost)
router.route('/update-post/:id').patch(verifyJwt, upload.array('images'), updatePost)
router.route('/all-posts').get(verifyJwt, getAllPosts)


export default router