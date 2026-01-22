import { clerkClient } from "@clerk/express";
import Course from "../models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";

// ✅ Update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: "educator",
      },
    });

    return res.json({ success: true, message: "You can publish a course now" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Add new course
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.json({ success: false, message: "Thumbnail Not Attached" });
    }

    const parsedCourseData = JSON.parse(courseData);
    parsedCourseData.educator = educatorId;

    // ✅ Upload thumbnail
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);
    parsedCourseData.courseThumbnail = imageUpload.secure_url;

    const newCourse = await Course.create(parsedCourseData);
    await newCourse.save();

    return res.json({ success: true, message: "Course Added", course: newCourse });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ UPDATE COURSE (Edit Mode)
export const updateCourse = async (req, res) => {
  try {
    const educatorId = req.auth.userId;
    const { courseId } = req.params;

    const { courseData } = req.body;
    const imageFile = req.file;

    if (!courseId) {
      return res.json({ success: false, message: "CourseId missing!" });
    }

    const existingCourse = await Course.findById(courseId);

    if (!existingCourse) {
      return res.json({ success: false, message: "Course not found!" });
    }

    // ✅ Only owner educator can update
    if (existingCourse.educator.toString() !== educatorId.toString()) {
      return res.status(403).json({ success: false, message: "Not allowed!" });
    }

    const parsedCourseData = JSON.parse(courseData);

    // ✅ Keep educator fixed (cannot change)
    parsedCourseData.educator = educatorId;

    // ✅ If educator uploads new thumbnail → update
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path);
      parsedCourseData.courseThumbnail = imageUpload.secure_url;
    } else {
      // ✅ Keep old thumbnail if not uploaded
      parsedCourseData.courseThumbnail = existingCourse.courseThumbnail;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, parsedCourseData, {
      new: true,
    });

    return res.json({
      success: true,
      message: "Course Updated Successfully ✅",
      course: updatedCourse,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Get educator courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    const courses = await Course.find({ educator });

    return res.json({ success: true, courses });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Educator dashboard data
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    const courses = await Course.find({ educator });
    const totalCourses = courses.length;

    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    });

    const totalEarnings = Math.round(
      purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0)
    ).toFixed(2);

    const enrolledStudentsData = [];

    for (const course of courses) {
      const students = await User.find(
        { _id: { $in: course.enrolledStudents } },
        "name imageUrl"
      );

      students.forEach((student) => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }

    return res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Get enrolled students data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;

    const courses = await Course.find({ educator });
    const courseIds = courses.map((course) => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: "completed",
    })
      .populate("userId", "name imageUrl")
      .populate("courseId", "courseTitle");

    const enrolledStudents = purchases.map((purchase) => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    return res.json({ success: true, enrolledStudents });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
