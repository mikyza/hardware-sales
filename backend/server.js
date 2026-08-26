const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
// Serve static images from the uploads folder
app.use('/uploads', express.static(uploadDir));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS & MODELS ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: true }
});
const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    isWeeklyDeal: { type: Boolean, default: false },
    weeklyGiftDescription: { type: String, default: "" }
});
const Product = mongoose.model('Product', ProductSchema);

const SettingsSchema = new mongoose.Schema({
    tagline: { type: String, default: "Quality Fashion for Everyone" }
});
const Settings = mongoose.model('Settings', SettingsSchema);

// --- MULTER CONFIGURATION FOR IMAGE UPLOADS ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'nellybest-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- SEED ADMIN USER ---
const seedAdmin = async () => {
    const adminEmail = "muchirimunene031@gmail.com";
    const adminPassword = "31022663m";
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        await User.create({ email: adminEmail, password: hashedPassword, isAdmin: true });
        console.log("✅ Admin user seeded successfully.");
    }
    
    const settings = await Settings.findOne();
    if (!settings) {
        await Settings.create({});
    }
};
seedAdmin();

// --- AUTH MIDDLEWARE ---
const protect = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token failed' });
    }
};

// --- API ROUTES ---

// 1. Admin Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ token, email: user.email, isAdmin: user.isAdmin });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// 2. Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

// 3. Add New Product (Admin Only, Supports Image Upload)
app.post('/api/products', protect, upload.single('image'), async (req, res) => {
    try {
        const { name, category, subCategory, price } = req.body;
        
        // Use local file path if uploaded, otherwise expect a URL in req.body
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image;

        const product = new Product({
            name,
            category,
            subCategory,
            price,
            image: imageUrl
        });

        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add product' });
    }
});

// 4. Set Item of the Week (Admin Only)
app.put('/api/products/weekly-deal/:id', protect, async (req, res) => {
    try {
        // Reset all products to not be the weekly deal
        await Product.updateMany({}, { isWeeklyDeal: false, weeklyGiftDescription: "" });
        
        // Set the new weekly deal
        const { weeklyGiftDescription } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { isWeeklyDeal: true, weeklyGiftDescription }, 
            { new: true }
        );
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update weekly deal' });
    }
});

// 5. Get Tagline Settings
app.get('/api/settings', async (req, res) => {
    const settings = await Settings.findOne();
    res.json(settings);
});

// 6. Update Tagline (Admin Only)
app.put('/api/settings', protect, async (req, res) => {
    const { tagline } = req.body;
    let settings = await Settings.findOne();
    settings.tagline = tagline;
    await settings.save();
    res.json(settings);
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
