import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import Loading from "../../components/student/Loading";
import axios from "axios";
import { toast } from "react-toastify";
import Logger from "../../components/Logger";
import Signature from "../../components/Signature";
import { useNavigate } from "react-router-dom";

const MyCourses = () => {
  const { currency, backendUrl, isEducator, getToken } = useContext(AppContext);
  const [courses, setCourses] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get(backendUrl + "/api/educator/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setCourses(data.courses || []);
      } else {
        toast.error(data.message || "Failed to fetch courses");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // ✅ Delete course handler
  const deleteCourseHandler = async (courseId) => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete this course? (This action can't be undone)"
      );

      if (!confirmDelete) return;

      setDeletingId(courseId);

      const token = await getToken();

      const { data } = await axios.delete(
        backendUrl + "/api/course/delete/" + courseId,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        toast.success(data.message || "Course deleted!");

        // ✅ remove from UI instantly
        setCourses((prev) => prev.filter((c) => c._id !== courseId));
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ✅ Edit course handler
  const editCourseHandler = (courseId) => {
    // ✅ redirect to AddCourse page in edit mode
    navigate(`/educator/add-course?courseId=${courseId}`);
  };

  useEffect(() => {
    if (isEducator) {
      fetchEducatorCourses();
    }
  }, [isEducator]);

  return courses ? (
    <div className="h-full mb-10 flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className="w-full">
        <div className="block sm:hidden ">
          <Logger />
        </div>

        <h2 className="pb-4 text-lg font-medium">My Courses</h2>

        <div className="flex flex-col items-center max-w-6xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
          <table className="md:table-auto table-fixed w-full overflow-hidden">
            <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
              <tr>
                <th className="px-4 py-3 font-semibold truncate">All Courses</th>
                <th className="px-4 py-3 font-semibold truncate">
                  Courses Price
                </th>
                <th className="px-4 py-3 font-semibold truncate">Earnings</th>
                <th className="px-4 py-3 font-semibold truncate">Students</th>
                <th className="px-4 py-3 font-semibold truncate">
                  Course Status
                </th>
                <th className="px-4 py-3 font-semibold truncate">Actions</th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-500">
              {courses.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan="6">
                    No courses found
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr
                    key={course._id}
                    className="border-b border-gray-500/20"
                  >
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <img
                        src={course.courseThumbnail}
                        alt="CourseImage"
                        className="w-16 rounded"
                      />
                      <span className="truncate hidden md:block">
                        {course.courseTitle}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {course.coursePrice -
                        (course.discount * course.coursePrice) / 100 ===
                      0 ? (
                        "Free"
                      ) : (
                        <>
                          {currency}{" "}
                          {(
                            course.coursePrice -
                            (course.discount * course.coursePrice) / 100
                          ).toFixed(2)}
                        </>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {currency}{" "}
                      {Math.floor(
                        (course.enrolledStudents?.length || 0) *
                          (course.coursePrice -
                            (course.discount * course.coursePrice) / 100)
                      ).toFixed(2)}
                    </td>

                    <td className="px-4 py-3">
                      {course.enrolledStudents?.length || 0}
                    </td>

                    <td className="px-4 py-3">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {/* ✅ Edit Button */}
                        <button
                          onClick={() => editCourseHandler(course._id)}
                          className="px-3 py-1 rounded text-white text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          Edit
                        </button>

                        {/* ✅ Delete Button */}
                        <button
                          onClick={() => deleteCourseHandler(course._id)}
                          disabled={deletingId === course._id}
                          className={`px-3 py-1 rounded text-white text-xs ${
                            deletingId === course._id
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {deletingId === course._id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Signature />
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MyCourses;
