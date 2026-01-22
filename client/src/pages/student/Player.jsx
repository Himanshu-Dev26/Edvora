import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { useParams } from "react-router-dom";
import { assets } from "../../assets/assets";
import humanizeDuration from "humanize-duration";
import YouTube from "react-youtube";
import Footer from "../../components/student/Footer";
import Rating from "../../components/student/Rating";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../components/student/Loading";
import Signature from "../../components/Signature";

const Player = () => {
  const {
    enrolledCourses,
    calculateChapterTime,
    backendUrl,
    getToken,
    userData,
    fetchUserEnrolledCourses,
  } = useContext(AppContext);

  const { courseId } = useParams();

  const [courseData, setCourseData] = useState(null);
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [initialRating, setInitialRating] = useState(0);

  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // ✅ Get YouTube Video ID properly (works for watch?v= and youtu.be)
  const getYouTubeId = (url) => {
    try {
      const u = new URL(url);

      // youtube.com/watch?v=VIDEOID
      const v = u.searchParams.get("v");
      if (v) return v;

      // youtu.be/VIDEOID
      if (u.hostname.includes("youtu.be")) {
        return u.pathname.split("/")[1] || null;
      }

      // youtube.com/embed/VIDEOID
      if (u.pathname.includes("/embed/")) {
        return u.pathname.split("/embed/")[1] || null;
      }

      return null;
    } catch (err) {
      return null;
    }
  };

  const getCourseData = () => {
    enrolledCourses.forEach((course) => {
      if (course._id === courseId) {
        setCourseData(course);

        course.courseRatings?.forEach((item) => {
          if (item.userId === userData?._id) {
            setInitialRating(item.rating);
          }
        });
      }
    });
  };

  const toggleSection = (index) => {
    setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      getCourseData();
    }
  }, [enrolledCourses]);

  const markLectureAsCompleted = async (lectureId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/update-course-progress",
        { courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getCourseProgress();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const getCourseProgress = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        backendUrl + "/api/user/get-course-progress",
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setProgressData(data.progressData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleRate = async (rating) => {
    try {
      const token = await getToken();

      const { data } = await axios.post(
        backendUrl + "/api/user/add-rating",
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        fetchUserEnrolledCourses();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    getCourseProgress();
  }, []);

  // ✅ Get first lecture
  const getFirstLecture = () => {
    if (!courseData) return null;

    for (let i = 0; i < courseData.courseContent.length; i++) {
      const chapter = courseData.courseContent[i];
      if (chapter.chapterContent && chapter.chapterContent.length > 0) {
        const lecture = chapter.chapterContent[0];
        return { ...lecture, chapter: i + 1, lecture: 1 };
      }
    }
    return null;
  };

  const handleThumbnailClick = () => {
    const first = getFirstLecture();
    if (first) {
      setPlayerData(first);
    } else {
      toast.info("No lectures available to play.");
    }
  };

  // Reset loading state on player change
  useEffect(() => {
    if (playerData) setIsLoadingVideo(true);
    else setIsLoadingVideo(false);
  }, [playerData]);

  const youtubeOpts = {
    width: "100%",
    playerVars: {
      autoplay: 1,
    },
  };

  const videoId = playerData?.lectureUrl ? getYouTubeId(playerData.lectureUrl) : null;

  return courseData ? (
    <>
      <div className="p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36">
        {/* Left column */}
        <div className="text-gray-800">
          <h2 className="text-xl font-semibold">Course Structure</h2>

          <div className="pt-5">
            {courseData.courseContent.map((chapter, index) => (
              <div className="border border-gray-300 bg-white mb-2 rounded" key={index}>
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-center gap-2">
                    <img
                      className={`transform transition-transform ${
                        openSections[index] ? "rotate-180" : ""
                      }`}
                      src={assets.down_arrow_icon}
                      alt="down_arrow_icon"
                    />
                    <p className="font-medium md:text-base text-sm">
                      {chapter.chapterTitle}
                    </p>
                  </div>

                  <p className="text-sm md:text-default">
                    {chapter.chapterContent.length} lectures -{" "}
                    {calculateChapterTime(chapter)}
                  </p>
                </div>

                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openSections[index] ? "max-h-9g" : "max-h-0"
                  }`}
                >
                  <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                    {chapter.chapterContent.map((lecture, i) => (
                      <li key={i} className="flex items-start gap-2 py-1">
                        <img
                          onClick={() =>
                            setPlayerData({
                              ...lecture,
                              chapter: index + 1,
                              lecture: i + 1,
                            })
                          }
                          className="w-4 h-4 mt-1 cursor-pointer"
                          src={
                            progressData?.lectureCompleted?.includes(lecture.lectureId)
                              ? assets.blue_tick_icon
                              : assets.play_icon
                          }
                          alt="play_icon"
                        />

                        <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default">
                          <p>{lecture.lectureTitle}</p>

                          <div className="flex gap-2">
                            {lecture.lectureUrl && (
                              <p
                                onClick={() =>
                                  setPlayerData({
                                    ...lecture,
                                    chapter: index + 1,
                                    lecture: i + 1,
                                  })
                                }
                                className="text-blue-500 cursor-pointer"
                              >
                                Watch
                              </p>
                            )}

                            <p>
                              {humanizeDuration(lecture.lectureDuration * 60 * 1000, {
                                units: ["h", "m"],
                              })}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 py-3 mt-10">
            <h1 className="text-xl font-bold">Rate this Course:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>
        </div>

        {/* Right column */}
        <div className="md:mt-10">
          {playerData ? (
            <div className="relative">
              {/* ✅ If invalid YouTube URL */}
              {!videoId ? (
                <div className="w-full aspect-video flex items-center justify-center bg-gray-200 rounded">
                  <p className="text-gray-600 text-sm">
                    Video URL is invalid (YouTube ID not found)
                  </p>
                </div>
              ) : (
                <>
                  {isLoadingVideo && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
                      <Loading />
                    </div>
                  )}

                  <YouTube
                    videoId={videoId}
                    iframeClassName="w-full aspect-video"
                    opts={youtubeOpts}
                    onReady={() => setIsLoadingVideo(false)}
                    onStateChange={(e) => {
                      // buffering -> show loading
                      if (e.data === 3) setIsLoadingVideo(true);
                      // playing -> hide loading
                      if (e.data === 1) setIsLoadingVideo(false);
                    }}
                  />
                </>
              )}

              <div className="flex justify-between items-center mt-1">
                <p>
                  {playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}
                </p>

                <button
                  onClick={() => markLectureAsCompleted(playerData.lectureId)}
                  className="text-blue-600"
                >
                  {progressData?.lectureCompleted?.includes(playerData.lectureId)
                    ? "Completed"
                    : "Mark As Complete"}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="relative cursor-pointer select-none"
              onClick={handleThumbnailClick}
            >
              <img
                src={courseData.courseThumbnail}
                alt="courseThumbnail"
                className="w-full object-cover aspect-video rounded"
              />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-black/50 shadow-xl">
                  <img
                    src={assets.play_icon}
                    alt="play_overlay"
                    className="w-8 h-8"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Signature />
      <Footer />
    </>
  ) : (
    <Loading />
  );
};

export default Player;
