import { Webhook } from "svix";
import Stripe from "stripe";
import User from "../model/User.js"; // ✅ FIXED PATH
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

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
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          imageUrl: data.image_url || "https://via.placeholder.com/150",
          enrolledCourses: [],
        };

        await User.create(userData);
        return res.json({});
      }

      case "user.updated": {
        const userData = {
          email: data.email_addresses?.[0]?.email_address || "no-email@user.com",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
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

// ✅ Stripe Webhook
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      if (!session.data.length) return;

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);

      if (!purchaseData) return;

      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId.toString());

      if (!userData || !courseData) return;

      // ✅ Avoid duplicate push
      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      if (!userData.enrolledCourses.includes(courseData._id)) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      purchaseData.status = "completed";
      await purchaseData.save();
    } catch (error) {
      console.log("Stripe success webhook error:", error.message);
    }
  };

  const handlePaymentFailed = async (paymentIntent) => {
    try {
      const paymentIntentId = paymentIntent.id;

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });

      if (!session.data.length) return;

      const { purchaseId } = session.data[0].metadata;
      const purchaseData = await Purchase.findById(purchaseId);

      if (!purchaseData) return;

      purchaseData.status = "failed";
      await purchaseData.save();
    } catch (error) {
      console.log("Stripe failed webhook error:", error.message);
    }
  };

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(event.data.object);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    default:
      break;
  }

  return response.json({ received: true });
};
