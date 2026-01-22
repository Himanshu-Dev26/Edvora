import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";
import { CourseProgress } from "../models/CourseProgress.js";

// ✅ Get users data (Auto Create User)
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    let user = await User.findById(userId);

    // ✅ Auto-create user if not found
    if (!user) {
      const name =
        req.auth?.sessionClaims?.fullName ||
        req.auth?.sessionClaims?.name ||
        "User";

      const email =
        req.auth?.sessionClaims?.email ||
        req.auth?.sessionClaims?.email_address ||
        "";

      const imageUrl =
        req.auth?.sessionClaims?.imageUrl ||
        req.auth?.sessionClaims?.picture ||
        "";

      user = await User.create({
        _id: userId,
        name,
        email,
        imageUrl,
        enrolledCourses: [],
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ User enrolled courses
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    const userData = await User.findById(userId).populate("enrolledCourses");

    // ✅ if user missing, return empty array (no crash)
    if (!userData) {
      return res.json({ success: true, enrolledCourses: [] });
    }

    return res.json({
      success: true,
      enrolledCourses: userData.enrolledCourses || [],
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Purchase course
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);

    if (!userData || !courseData) {
      return res.json({ success: false, message: "Data Not Found" });
    }

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: (
        courseData.coursePrice -
        (courseData.discount * courseData.coursePrice) / 100
      ).toFixed(2),
    };

    const newPurchase = await Purchase.create(purchaseData);

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
    const currency = process.env.CURRENCY.toLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}/`,
      line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    return res.json({ success: true, session_url: session.url });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Update user course progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { courseId, lectureId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.json({ success: true, message: "Lecture Already Completed" });
      }

      progressData.lectureCompleted.push(lectureId);
      progressData.completed = true;
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }

    return res.json({ success: true, message: "Progress Updated" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Get user course progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { courseId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    const progressData = await CourseProgress.findOne({ userId, courseId });
    return res.json({ success: true, progressData });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Add user rating
export const addUserRating = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { courseId, rating } = req.body;

    if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
      return res.json({ success: false, message: "Invalid details" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.json({ success: false, message: "Course Not found!" });
    }

    const user = await User.findById(userId);

    if (!user || !user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: false,
        message: "User has not purchased this course.",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );

    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }

    await course.save();
    return res.json({ success: true, message: "Rating Added" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
