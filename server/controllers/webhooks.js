import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

/* =========================
   ✅ CLERK WEBHOOKS
========================= */
export const clerkWebhooks = async (req, res) => {
  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    const payload = JSON.stringify(req.body);

    await whook.verify(payload, {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          _id: data.id,
          email: data.email_addresses?.[0]?.email_address || "no-email@user.com",
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          imageUrl: data.image_url || "https://via.placeholder.com/150",
          enrolledCourses: [],
        };

        await User.create(userData);
        return res.json({});
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses?.[0]?.email_address || "no-email@user.com",
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          imageUrl: data.image_url || "https://via.placeholder.com/150",
        };

        await User.findByIdAndUpdate(data.id, userData);
        return res.json({});
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        return res.json({});
      }

      default:
        return res.json({ success: true });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/* =========================
   ✅ STRIPE WEBHOOKS
   ✅ BEST EVENT: checkout.session.completed
========================= */
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // ✅ req.body MUST BE RAW BUFFER (handled in server.js)
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // ✅ When checkout is successful
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const purchaseId = session?.metadata?.purchaseId;

      if (!purchaseId) {
        console.log("❌ purchaseId missing in session metadata");
        return res.json({ received: true });
      }

      const purchaseData = await Purchase.findById(purchaseId);

      if (!purchaseData) {
        console.log("❌ Purchase not found:", purchaseId);
        return res.json({ received: true });
      }

      // ✅ Already completed? (avoid duplicates)
      if (purchaseData.status === "completed") {
        return res.json({ received: true });
      }

      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId);

      if (!userData || !courseData) {
        console.log("❌ User or Course not found");
        return res.json({ received: true });
      }

      // ✅ IMPORTANT: enrolledStudents is String[] in your schema
      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      // ✅ enrolledCourses is ObjectId[] in your schema
      const courseObjectId = courseData._id.toString();
      const alreadyEnrolled = userData.enrolledCourses
        .map((id) => id.toString())
        .includes(courseObjectId);

      if (!alreadyEnrolled) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = "completed";
      await purchaseData.save();

      console.log("✅ Enrollment updated via Stripe webhook");
    }

    // ✅ Payment failed
    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const purchaseId = session?.metadata?.purchaseId;

      if (purchaseId) {
        await Purchase.findByIdAndUpdate(purchaseId, { status: "failed" });
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.log("❌ Stripe webhook handling error:", error.message);
    return res.status(500).json({ received: true });
  }
};
