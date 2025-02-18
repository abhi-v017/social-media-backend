import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.middleware.js"
import { followUnFollowUser } from "../controllers/followers.controller.js";

const router = Router()


router.route("/follow/:userId").post(verifyJwt, followUnFollowUser);

export default router