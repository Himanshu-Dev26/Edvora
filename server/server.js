import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educatorRoutes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinay from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRoutes.js";

// initialize express
const app = express();

// connect to db
await connectDB();
await connectCloudinay();

// ✅ middleware
app.use(cors());
app.use(clerkMiddleware());

// ✅ JSON parser only for normal JSON routes
app.use(express.json());

// ✅ Routes
app.get("/", (req, res) => {
  res.send("Edemy API is working fine!");
});

// ✅ Clerk webhook needs JSON
app.post("/clerk", express.json(), clerkWebhooks);

// ✅ IMPORTANT ✅
// Do NOT use express.json() here, because educator has multipart/form-data (image upload)
app.use("/api/educator", educatorRouter);

app.use("/api/course", courseRouter);
app.use("/api/user", userRouter);

// ✅ Stripe webhook needs RAW body
app.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
