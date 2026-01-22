import { createContext, useEffect, useState } from "react";
import humanizeDuration from "humanize-duration";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const currency = import.meta.env.VITE_CURRENCY;

  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [allCourses, setAllCourses] = useState([]);
  const [isEducator, setIsEducator] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [userData, setUserData] = useState(null);

  // ✅ Fetch all courses
  const fetchAllCourses = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/course/all");

      if (data.success) {
        setAllCourses(data.courses);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch user data
  const fetchUserData = async () => {
    try {
      // ✅ Safe educator check
      if (user?.publicMetadata?.role === "educator") {
        setIsEducator(true);
      } else {
        setIsEducator(false);
      }

      const token = await getToken();

      const { data } = await axios.get(backendUrl + "/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.user);
      } else {
        setUserData(null);
        toast.error(data.message);
      }
    } catch (error) {
      setUserData(null);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // ✅ Fetch user enrolled courses
  const fetchUserEnrolledCourses = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get(backendUrl + "/api/user/enrolled-courses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const list = Array.isArray(data.enrolledCourses) ? data.enrolledCourses : [];
        setEnrolledCourses(list.reverse());
      } else {
        setEnrolledCourses([]);
        toast.error(data.message || "No enrolled courses found.");
      }
    } catch (error) {
      setEnrolledCourses([]);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // ✅ Rating calculation
  const calculateRating = (course) => {
    if (!course?.courseRatings || course.courseRatings.length === 0) {
      return 0;
    }
    let totalRating = 0;
    course.courseRatings.forEach((rating) => {
      totalRating += rating.rating;
    });
    return Math.floor(totalRating / course.courseRatings.length);
  };

  // ✅ Chapter time calculation
  const calculateChapterTime = (chapter) => {
    let time = 0;
    chapter.chapterContent?.map((lecture) => (time += lecture.lectureDuration));
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  // ✅ Course duration calculation
  const calculateCourseDuration = (course) => {
    let time = 0;
    course.courseContent?.map((chapter) =>
      chapter.chapterContent?.map((lecture) => (time += lecture.lectureDuration))
    );

    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  };

  // ✅ Number of lectures calculation
  const calculateNoOfLectures = (course) => {
    let totalLectures = 0;
    course.courseContent?.forEach((chapter) => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length;
      }
    });
    return totalLectures;
  };

  useEffect(() => {
    fetchAllCourses();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchUserEnrolledCourses();
    } else {
      setUserData(null);
      setEnrolledCourses([]);
      setIsEducator(false);
    }
  }, [user]);

  const value = {
    currency,
    allCourses,
    navigate,
    isEducator,
    setIsEducator,
    calculateRating,
    calculateChapterTime,
    calculateCourseDuration,
    calculateNoOfLectures,
    fetchUserEnrolledCourses,
    setEnrolledCourses,
    enrolledCourses,
    backendUrl,
    userData,
    setUserData,
    getToken,
    fetchAllCourses,
  };

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};
