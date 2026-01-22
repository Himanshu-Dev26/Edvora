import { clerkClient } from "@clerk/express";

// ✅ Protect educator route
export const protectEducator = async (req, res, next) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized! Login required.",
      });
    }

    const response = await clerkClient.users.getUser(userId);

    if (response.publicMetadata?.role !== "educator") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized Access!",
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
