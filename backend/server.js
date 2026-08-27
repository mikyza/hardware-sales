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

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Uploads directory for product & UI background images
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGODB_URI 
  || process.env.MONGO_URI 
  || 'mongodb+srv://wambuicathrine217_db_user:JM8U3oBz4UxE0DQ9@cluster0.arqtzh6.mongodb.net/hardware_sales?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to Hardware Database successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS & MODELS ---

// 1. User Schema (Includes Role & Suspension Status)
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isSuspended: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. Hardware Category Schema
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "wrench" }
});
const Category = mongoose.model('Category', CategorySchema);

// 3. Hardware Product Schema
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true }, // e.g. Vehicle Parts, Motorcycle, Tools
    subCategory: { type: String, required: true }, // e.g. Engine, Brakes, Tires
    price: { type: Number, required: true },
    stock: { type: Number, default: 10 },
    description: { type: String, default: "" },
    image: { type: String, required: true },
    isWeeklyDeal: { type: Boolean, default: false },
    weeklyGiftDescription: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', ProductSchema);

// 4. User Cart Schema
const CartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, default: 1 },
            price: { type: Number, required: true }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});
const Cart = mongoose.model('Cart', CartSchema);

// 5. Order Schema
const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: Array,
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shippingAddress: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 6. Admin UI & Background Control Settings
const StoreSettingsSchema = new mongoose.Schema({
    storeName: { type: String, default: "ProHardware & Auto Spares" },
    tagline: { type: String, default: "Your #1 Store for Vehicle Parts, Motorbikes & Tools" },
    heroTitle: { type: String, default: "Heavy Duty Hardware & Quality Vehicle Spare Parts" },
    heroSubtitle: { type: String, default: "Genuine motorcycle parts, power tools, and industrial supplies delivered fast." },
    backgroundImage: { type: String, default: "" },
    primaryColor: { type: String, default: "#d97706" }, // Hardware Gold/Amber
    contactPhone: { type: String, default: "+254 700 000 000" },
    contactEmail: { type: String, default: "support@prohardware.com" }
});
const StoreSettings = mongoose.model('StoreSettings', StoreSettingsSchema);

// --- MULTER STORAGE SETUP ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'hardware-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- SEEDING DEFAULT ADMINS & CATEGORIES ---
const seedDatabase = async () => {
    try {
        // 1. Seed Store Settings
        const settings = await StoreSettings.findOne();
        if (!settings) await StoreSettings.create({});

        // 2. Seed Default Categories for Hardware, Vehicle & Motorcycle Parts
        const defaultCategories = [
            { name: "Vehicle Spare Parts", description: "Engine components, brakes, suspension, and filters", icon: "car" },
            { name: "Motorcycle & Motorbike Parts", description: "Tires, chains, sprockets, cables, and helmets", icon: "bike" },
            { name: "Power & Hand Tools", description: "Drills, angle grinders, spanners, and saws", icon: "wrench" },
            { name: "Building & Plumbing Supplies", description: "Pipes, fittings, cement, and fasteners", icon: "hammer" },
            { name: "Electrical & Solar", description: "Heavy duty wiring, solar panels, and breakers", icon: "zap" }
        ];

        for (let cat of defaultCategories) {
            await Category.updateOne({ name: cat.name }, { $setOnInsert: cat }, { upsert: true });
        }

        // 3. Seed Max 2 Admin Accounts
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount < 2) {
            const defaultAdmins = [
                { fullName: "Primary Hardware Admin", email: "admin@hardware.com", pass: "HardwareAdmin123!" },
                { fullName: "Secondary Hardware Admin", email: "admin2@hardware.com", pass: "HardwareAdmin456!" }
            ];

            for (let i = adminCount; i < 2; i++) {
                const adminData = defaultAdmins[i];
                const existing = await User.findOne({ email: adminData.email });
                if (!existing) {
                    const hashedPassword = await bcrypt.hash(adminData.pass, 10);
                    await User.create({
                        fullName: adminData.fullName,
                        email: adminData.email,
                        password: hashedPassword,
                        role: 'admin'
                    });
                    console.log(`✅ Seeded Admin Account #${i + 1}: ${adminData.email}`);
                }
            }
        }
    } catch (err) {
        console.error("Error seeding initial data:", err);
    }
};
seedDatabase();

// --- AUTHENTICATION & SECURITY MIDDLEWARES ---

// Verify JWT Token & Check User Status
const protect = async (req, res, next) => {
    let token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized, no security token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) return res.status(401).json({ message: 'User account no longer exists' });
        if (user.isSuspended) return res.status(403).json({ message: 'Your account has been suspended by an Admin.' });

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Admin Privilege Guard
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Restricted to Admin panel only.' });
    }
};

// --- API ROUTES ---

// ==================== 1. USER AUTH ROUTES ====================

// User Signup (Auto creates user-specific cart)
app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Please provide full name, email and password' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'Email address is already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ fullName, email, phone, password: hashedPassword, role: 'user' });

        // Initialize user cart
        await Cart.create({ user: user._id, items: [] });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// User & Admin Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        if (user.isSuspended) {
            return res.status(403).json({ message: 'Account Suspended! Contact hardware administration.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get Current User Profile
app.get('/api/auth/me', protect, async (req, res) => {
    res.json(req.user);
});

// ==================== 2. CART ROUTES (USER-SPECIFIC) ====================

// Get User Cart
app.get('/api/cart', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve shopping cart' });
    }
});

// Add Item to Cart
app.post('/api/cart/add', protect, async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += (quantity || 1);
        } else {
            cart.items.push({ product: productId, quantity: quantity || 1, price: product.price });
        }

        cart.updatedAt = Date.now();
        await cart.save();
        
        const updatedCart = await Cart.findById(cart._id).populate('items.product');
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
});

// Remove Single Item from Cart
app.delete('/api/cart/item/:productId', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
            cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
            await cart.save();
        }
        const updatedCart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove item from cart' });
    }
});

// Clear Entire Cart
app.delete('/api/cart/clear', protect, async (req, res) => {
    try {
        await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear cart' });
    }
});

// ==================== 3. PRODUCT & CATEGORY ROUTES ====================

// Fetch All Products (Supports Category Filter & Search)
app.get('/api/products', async (req, res) => {
    const { category, search } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    try {
        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch hardware products' });
    }
});

// Add Hardware Product (Admin Only)
app.post('/api/products', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, category, subCategory, price, stock, description } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.image;

        if (!name || !category || !subCategory || !price || !imageUrl) {
            return res.status(400).json({ message: 'Please fill in all required product fields' });
        }

        const product = new Product({
            name, category, subCategory, price: Number(price), stock: Number(stock) || 10,
            description, image: imageUrl
        });

        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create product' });
    }
});

// --- BULK SEED PRODUCTS ROUTE (Admin Only) ---
app.post('/api/products/seed', protect, adminOnly, async (req, res) => {
    try {
        const products = req.body.products || req.body; 
        
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Please provide a valid array of products to seed.' });
        }

        const seededProducts = await Product.insertMany(products);
        res.status(201).json({ 
            message: 'Products seeded successfully via API', 
            count: seededProducts.length,
            products: seededProducts
        });
    } catch (error) {
        console.error("API Seeding Error:", error);
        res.status(500).json({ message: 'Failed to seed products', error: error.message });
    }
});

// --- METHOD 3: MANUAL BROWSER/API SEED ENDPOINT (Bypasses network restriction when online) ---
app.get('/api/seed-products-manually', async (req, res) => {
    try {
        const sampleProducts = [
            {
                name: "Heavy Duty Hammer",
                category: "Power & Hand Tools",
                subCategory: "Spanners",
                price: 1500,
                stock: 25,
                description: "High-grade steel hammer with a comfortable rubber grip.",
                image: "/uploads/hardware-default.jpg"
            },
            {
                name: "Cordless Power Drill 18V",
                category: "Power & Hand Tools",
                subCategory: "Drills",
                price: 8500,
                stock: 10,
                description: "High performance lithium-ion drill with variable speed settings.",
                image: "/uploads/hardware-default.jpg"
            },
            {
                name: "Motorcycle Brake Pads Set",
                category: "Motorcycle & Motorbike Parts",
                subCategory: "Brakes",
                price: 1200,
                stock: 40,
                description: "Durable organic brake pads compatible with standard commuter bikes.",
                image: "/uploads/hardware-default.jpg"
            },
            {
                name: "Heavy Duty Vehicle Jack 3Ton",
                category: "Vehicle Spare Parts",
                subCategory: "Engine",
                price: 14500,
                stock: 5,
                description: "Hydraulic floor jack designed for cars, SUVs, and light trucks.",
                image: "/uploads/hardware-default.jpg"
            }
        ];

        const seeded = await Product.insertMany(sampleProducts);
        res.status(201).json({ 
            success: true, 
            message: "Database seeded successfully online via Method 3!", 
            count: seeded.length,
            products: seeded 
        });
    } catch (error) {
        console.error("Manual Seeding Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Hardware Product (Admin Only)
app.put('/api/products/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const updates = { ...req.body };
        if (req.file) updates.image = `/uploads/${req.file.filename}`;

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product details' });
    }
});

// Delete Hardware Product (Admin Only)
app.delete('/api/products/:id', protect, adminOnly, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
});

// Set Weekly Deal Product (Admin Only)
app.put('/api/products/weekly-deal/:id', protect, adminOnly, async (req, res) => {
    try {
        await Product.updateMany({}, { isWeeklyDeal: false, weeklyGiftDescription: "" });
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { isWeeklyDeal: true, weeklyGiftDescription: req.body.weeklyGiftDescription || "Special Hardware Discount!" },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to set weekly deal' });
    }
});

// Get Hardware Categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

// Add Hardware Category (Admin Only)
app.post('/api/categories', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, icon } = req.body;
        const category = await Category.create({ name, description, icon });
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Category already exists or invalid data' });
    }
});

// Delete Hardware Category (Admin Only)
app.delete('/api/categories/:id', protect, adminOnly, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete category' });
    }
});

// ==================== 4. RESTRICTED ADMIN PANEL USER CONTROL ====================

// Get All Users (Admin Only)
app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Suspend / Unsuspend User (Admin Only)
app.put('/api/admin/users/:id/suspend', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be suspended' });

        user.isSuspended = !user.isSuspended;
        await user.save();

        res.json({ message: `User status changed to ${user.isSuspended ? 'Suspended' : 'Active'}`, isSuspended: user.isSuspended });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle suspension status' });
    }
});

// Update User Details (Admin Only)
app.put('/api/admin/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { fullName, email, phone },
            { new: true }
        ).select('-password');
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// Delete User Account (Admin Only)
app.delete('/api/admin/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user && user.role === 'admin') {
            return res.status(400).json({ message: 'Cannot delete an Admin account' });
        }
        await User.findByIdAndDelete(req.params.id);
        await Cart.findOneAndDelete({ user: req.params.id });
        res.json({ message: 'User and associated cart deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// Promotes a user to Admin (Enforces Max 2 Admin Limit)
app.put('/api/admin/promote/:id', protect, adminOnly, async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount >= 2) {
            return res.status(400).json({ message: 'Security Limit Reached: Maximum 2 Admin accounts allowed.' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true }).select('-password');
        res.json({ message: 'User successfully promoted to Admin', user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to promote user' });
    }
});

// ==================== 5. STORE UI, BACKGROUND & THEME SETTINGS ====================

// Get UI Settings (Public)
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await StoreSettings.findOne();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load store settings' });
    }
});

// Update UI & Background (Admin Only)
app.put('/api/settings', protect, adminOnly, upload.single('backgroundImage'), async (req, res) => {
    try {
        let settings = await StoreSettings.findOne();
        if (!settings) settings = new StoreSettings();

        const { storeName, tagline, heroTitle, heroSubtitle, primaryColor, contactPhone, contactEmail } = req.body;

        if (storeName) settings.storeName = storeName;
        if (tagline) settings.tagline = tagline;
        if (heroTitle) settings.heroTitle = heroTitle;
        if (heroSubtitle) settings.heroSubtitle = heroSubtitle;
        if (primaryColor) settings.primaryColor = primaryColor;
        if (contactPhone) settings.contactPhone = contactPhone;
        if (contactEmail) settings.contactEmail = contactEmail;
        if (req.file) settings.backgroundImage = `/uploads/${req.file.filename}`;

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update store UI settings' });
    }
});

// ==================== 6. ORDER PROCESSING ====================

// Place Order (Checkout Cart)
app.post('/api/orders', protect, async (req, res) => {
    const { shippingAddress } = req.body;
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your shopping cart is empty' });
        }

        const totalAmount = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        const order = await Order.create({
            user: req.user._id,
            items: cart.items,
            totalAmount,
            shippingAddress
        });

        // Clear cart after checkout
        cart.items = [];
        await cart.save();

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Failed to place order' });
    }
});

// Get User Orders
app.get('/api/orders/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order history' });
    }
});

// Admin View All Orders
app.get('/api/admin/orders', protect, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'fullName email phone').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch customer orders' });
    }
});

// Admin Update Order Status
app.put('/api/admin/orders/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Hardware Sales Server running on port ${PORT}`);
});
