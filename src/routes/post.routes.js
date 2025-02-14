import { Router } from "express";
import {createPost, updatePost} from '../controllers/post.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router()

router.route('/create-post').post(verifyJwt, upload.array('images'),createPost)
router.route('/update-post/:id').patch(verifyJwt, upload.array('images'), updatePost)


export default router