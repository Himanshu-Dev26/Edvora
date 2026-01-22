import Course from "../models/Course.js";

// ✅ Get all published courses
export const getAllCourse = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select(["-courseContent", "-enrolledStudents"])
      .populate({ path: "educator" });

    return res.json({ success: true, courses });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Get course by id
export const getCourseId = async (req, res) => {
  const { id } = req.params;

  try {
    const courseData = await Course.findById(id).populate({ path: "educator" });

    if (!courseData) {
      return res.json({ success: false, message: "Course not found!" });
    }

    // ✅ Remove lectureUrl if preview is false
    courseData.courseContent?.forEach((chapter) => {
      chapter.chapterContent?.forEach((lecture) => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = "";
        }
      });
    });

    return res.json({ success: true, courseData });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ✅ Delete course (Educator only)
export const deleteCourse = async (req, res) => {
  try {
    const educatorId = req.auth?.userId;
    const { courseId } = req.params;

    if (!educatorId) {
      return res.status(401).json({ success: false, message: "Unauthorized!" });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.json({ success: false, message: "Course not found!" });
    }

    // ✅ Only owner educator can delete
    if (course.educator.toString() !== educatorId.toString()) {
      return res.status(403).json({ success: false, message: "Not allowed!" });
    }

    await Course.findByIdAndDelete(courseId);

    return res.json({ success: true, message: "Course deleted successfully!" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
