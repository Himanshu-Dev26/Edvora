import express from "express";

import {
  addCourse,
  educatorDashboardData,
  getEducatorCourses,
  getEnrolledStudentsData,
  updateRoleToEducator,
  updateCourse,
} from "../controllers/educatorController.js";

import { protectEducator } from "../middlewares/authMiddleware.js";
import upload from "../configs/multer.js";

const educatorRouter = express.Router();

// ✅ add educator role
educatorRouter.get("/update-role", updateRoleToEducator);

// ✅ Add Course
educatorRouter.post("/add-course", upload.single("image"), protectEducator, addCourse);

// ✅ Update Course (EDIT MODE)
educatorRouter.put(
  "/update-course/:courseId",
  upload.single("image"),
  protectEducator,
  updateCourse
);

// ✅ Educator Courses
educatorRouter.get("/courses", protectEducator, getEducatorCourses);

// ✅ Dashboard
educatorRouter.get("/dashboard", protectEducator, educatorDashboardData);

// ✅ Enrolled Students
educatorRouter.get("/enrolled-students", protectEducator, getEnrolledStudentsData);

export default educatorRouter;
