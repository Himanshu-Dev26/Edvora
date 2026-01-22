import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/mongodb.js";
import connectCloudinay from "./configs/cloudinary.js";
import { clerkMiddleware } from "@clerk/express";

import educatorRouter from "./routes/educatorRoutes.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRoutes.js";

import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js";

// initialize express
const app = express();

// ✅ CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://edvora-frontend-six.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Clerk middleware
app.use(clerkMiddleware());

// ✅ Stripe webhook MUST be RAW and MUST come BEFORE express.json()
app.post("/stripe", express.raw({ type: "application/json" }), stripeWebhooks);

// ✅ JSON for all normal APIs (NOT Stripe)
app.use(express.json());

// connect DB + cloudinary
await connectDB();
await connectCloudinay();

// Routes
app.get("/", (req, res) => {
  res.send("Edemy API is working fine!");
});

// ✅ Clerk webhook (needs JSON)
app.post("/clerk", express.json(), clerkWebhooks);

// ✅ APIs
app.use("/api/educator", educatorRouter);
app.use("/api/course", courseRouter);
app.use("/api/user", userRouter);

// Port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
