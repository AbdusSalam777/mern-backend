const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const PORT = 3000;
dotenv.config();
const secret = process.env.JWT_SECRET;

const app = express();

//middlewares

app.use(express.json()); //parser

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser()); //cookie-parser

//MongoDB Logic here

mongoose //Connecting to MongoDB server
  .connect(
    "mongodb+srv://abdusalam0381:6rg0VbAFq0dVKJTy@cluster0.yd187o8.mongodb.net/Cart?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error);
  });

const Data_Schema = new mongoose.Schema({
  //Schema-1 for cart-data and order-data
  src: String,
  title: String,
  price: Number,
});

const Order_Schema = new mongoose.Schema({
  //Schema-2 for order-data
  src: String,
  title: String,
  price: Number,
});

const User_Schema = new mongoose.Schema({
  //Schema-3 for cart-data
  email: String,
  password: String,
});

const model_cart = mongoose.model("data", Data_Schema); //model-1 for cart data

const model_user = mongoose.model("user", User_Schema); //model-2 for user data

const order_model = mongoose.model("order", Order_Schema);

app.post("/send-data", async (req, res) => {
  //sending cart data to MongoDb
  const data = req.body;
  const saved = await model_cart.create(data);
  res.status(201).json(saved);
});

app.get("/get-data", async (req, res) => {
  //getting cart data from MongoDB
  try {
    const alldata = await model_cart.find();
    res.status(200).json(alldata);
  } catch (error) {
    console.log(error);
  }
});

app.post("/sign-in", async (req, res) => {
  //Sign-in logic
  //fetching user data from frontend,hashing password and storing data to MongoDB

  try {
    const { email, password } = req.body;
    const isuser = await model_user.findOne({ email });

    if (isuser) {
      return res.status(400).json({ error: "User already exists !" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await model_user.create({
      email: email,
      password: hashedPassword,
    });
    res.status(201).json({ message: "User created successfully !" });
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await model_user.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" }); // ✅ Stop execution
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    //creating JWT(Javascript Web Token)

    const token = jwt.sign({ user: user._id }, secret);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
    });

    res.json({ message: "Login Successful", user: { email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Login Failed !" });
    console.log(error);
  }
});

app.get("/verify", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "No token found !" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    res.status(200).json({ messgae: "User verified !" });
  } catch (error) {
    return res.status(403).json({ message: "Expired token !" });
  }
});

app.get("/count", async (req, res) => {
  try {
    const response = await model_cart.find();
    const items = response.length;
    res.json({ count: items });
  } catch (error) {
    console.log(error);
  }
});

app.delete("/delete-item/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await model_cart.findByIdAndDelete(id);
    res.status(200).json({ message: "Item deleted!" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed!" });
  }
});

app.post("/save-order", async (req, res) => {
 
  const OrderData = req.body;

  try {
  const saved =  await order_model.create(OrderData);
    res.status(201).json({ message: "Order saved", data: saved });
  } catch (error) {
    console.log(error);
  }
});

app.delete("/clear-cart",async(req,res)=>{
  
  const {ids}=req.body;

  try{

   const ids_obj = ids.map((item) => new mongoose.Types.ObjectId(item));
   const result= await model_cart.deleteMany({_id:{$in:ids_obj}});
    res.status(200).json({ message: "Cart items deleted", deletedCount: result.deletedCount });
  }

  catch(error){
    console.log(error);
    
  }
})

app.listen(PORT, () => {
  //listening server on PORT 3000
  console.log(`Server listening on PORT ${PORT}`);
});

console.log(secret);

//bcrypt
//JWT
//cookie-parser