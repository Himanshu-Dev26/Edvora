import express from "express";
import { requireAuth } from "@clerk/express";
import {
  getAllCourse,
  getCourseId,
  deleteCourse,
} from "../controllers/courseController.js";
import { protectEducator } from "../middlewares/authMiddleware.js";

const courseRouter = express.Router();

// ✅ Public routes
courseRouter.get("/all", getAllCourse);
courseRouter.get("/:id", getCourseId);

// ✅ Educator protected route (Delete Course)
courseRouter.delete("/delete/:courseId", requireAuth(), protectEducator, deleteCourse);

export default courseRouter;
