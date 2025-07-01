const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const secret = process.env.JWT_SECRET;

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://shopcommercify.netlify.app"
    ],
    credentials: true,
  })
);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Schemas
const Data_Schema = new mongoose.Schema({ src: String, title: String, price: Number });
const Order_Schema = new mongoose.Schema({ src: String, title: String, price: Number });
const User_Schema = new mongoose.Schema({ email: String, password: String });

const model_cart = mongoose.model("data", Data_Schema);
const model_user = mongoose.model("user", User_Schema);
const order_model = mongoose.model("order", Order_Schema);

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running on Render 🚀");
});

app.post("/send-data", async (req, res) => {
  const data = req.body;
  const saved = await model_cart.create(data);
  res.status(201).json(saved);
});

app.get("/get-data", async (req, res) => {
  try {
    const alldata = await model_cart.find();
    res.status(200).json(alldata);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.post("/sign-in", async (req, res) => {
  try {
    const { email, password } = req.body;
    const isuser = await model_user.findOne({ email });

    if (isuser) return res.status(400).json({ error: "User already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await model_user.create({ email, password: hashedPassword });

    res.status(201).json({ message: "User created successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await model_user.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ user: user._id }, secret);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.json({ message: "Login Successful", user: { email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Login Failed" });
  }
});

app.get("/verify", (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "No token found!" });

  try {
    jwt.verify(token, secret);
    res.status(200).json({ message: "User verified!" });
  } catch (error) {
    res.status(403).json({ message: "Expired or invalid token!" });
  }
});

app.get("/count", async (req, res) => {
  try {
    const items = await model_cart.countDocuments();
    res.json({ count: items });
  } catch (error) {
    res.status(500).json({ message: "Error fetching count" });
  }
});

app.delete("/delete-item/:id", async (req, res) => {
  try {
    await model_cart.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Item deleted!" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed!" });
  }
});

app.post("/save-order", async (req, res) => {
  try {
    const saved = await order_model.create(req.body);
    res.status(201).json({ message: "Order saved", data: saved });
  } catch (error) {
    res.status(500).json({ error: "Order failed" });
  }
});

app.delete("/clear-cart", async (req, res) => {
  try {
    const { ids } = req.body;
    const ids_obj = ids.map((item) => new mongoose.Types.ObjectId(item));
    const result = await model_cart.deleteMany({ _id: { $in: ids_obj } });
    res.status(200).json({ message: "Cart cleared", deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
