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

// 1. User Schema 
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isSuspended: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. Hardware Category Schema (Updated with Subcategories)
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "wrench" },
    subCategories: [{ type: String }] // Added to support nested panels
});
const Category = mongoose.model('Category', CategorySchema);

// 3. Hardware Product Schema (Updated for General Offers & Pricing)
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true }, 
    subCategory: { type: String, required: true }, 
    price: { type: Number, required: true },
    stock: { type: Number, default: 10 },
    description: { type: String, default: "" },
    image: { type: String, required: true }, // Can be an uploaded file path OR a direct link
    isOffer: { type: Boolean, default: false }, // Replaced weekly deal with general offers
    offerDiscount: { type: Number, default: 0 }, // e.g., 10 for 10% off or 500 for KES 500 off
    offerDescription: { type: String, default: "" },
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

// 5. Order Schema (Updated for Tracking & Structured Kenyan Shipping)
const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: Array,
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shippingAddress: {
        county: { type: String, required: true },
        subCounty: { type: String, required: true },
        town: { type: String, required: true },
        specificDetails: { type: String, required: true }
    },
    trackingNumber: { type: String }, // For user to track
    trackingHistory: [{
        status: { type: String },
        location: { type: String },
        timestamp: { type: Date, default: Date.now },
        message: { type: String }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// 6. Admin UI & Background Control Settings (Expanded)
const StoreSettingsSchema = new mongoose.Schema({
    storeName: { type: String, default: "ProHardware & Auto Spares" },
    tagline: { type: String, default: "Your #1 Store for Vehicle Parts, Motorbikes & Tools" },
    heroTitle: { type: String, default: "Heavy Duty Hardware & Quality Vehicle Spare Parts" },
    heroSubtitle: { type: String, default: "Genuine motorcycle parts, power tools, and industrial supplies delivered fast." },
    backgroundImage: { type: String, default: "" }, // Allows admin to change background
    primaryColor: { type: String, default: "#d97706" }, 
    layoutType: { type: String, default: "modern" }, // Added for layout swapping
    contactPhone: { type: String, default: "+254 700 000 000" },
    contactEmail: { type: String, default: "support@prohardware.com" }
});
const StoreSettings = mongoose.model('StoreSettings', StoreSettingsSchema);

// 7. System Logs Schema (New for Admin Auditing)
const LogSchema = new mongoose.Schema({
    actionType: { type: String, required: true }, // e.g., 'ACCOUNT_CREATION', 'TRANSACTION', 'PRODUCT_ADDED'
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', LogSchema);

// --- MULTER STORAGE SETUP ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'hardware-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- FULL INITIAL PRODUCTS CATALOGUE ---
const initialProducts = [
    // ==================== 1. VEHICLE SPARE PARTS ====================
    {
        name: "Bosch Platinum Spark Plugs (Set of 4)",
        category: "Vehicle Spare Parts",
        subCategory: "Engine",
        price: 3200,
        stock: 45,
        description: "High-performance spark plugs engineered for superior fuel efficiency and fast ignition.",
        image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Toyota 1NZ Engine Oil Filter",
        category: "Vehicle Spare Parts",
        subCategory: "Filters",
        price: 850,
        stock: 120,
        description: "Genuine OEM engine oil filter providing optimal filtration and engine protection.",
        image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Brembo Heavy-Duty Front Brake Pads",
        category: "Vehicle Spare Parts",
        subCategory: "Brakes",
        price: 4500,
        stock: 30,
        description: "Ceramic front brake pads offering high thermal resistance and low dust generation.",
        image: "https://images.unsplash.com/photo-1600706432520-256d47b59690?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "KYB Excel-G Gas Shock Absorber (Pair)",
        category: "Vehicle Spare Parts",
        subCategory: "Suspension",
        price: 12500,
        stock: 15,
        description: "Nitrogen gas-charged shock absorbers for improved stability and road control.",
        image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Heavy Duty 12V 70Ah Maintenance-Free Car Battery",
        category: "Vehicle Spare Parts",
        subCategory: "Electrical & Battery",
        price: 14000,
        stock: 20,
        description: "Long-lasting lead-acid starter battery designed for commercial and passenger cars.",
        image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=600"
    },

    // ==================== 2. MOTORCYCLE & MOTORBIKE PARTS ====================
    {
        name: "Tubeless Motorcycle Tire (110/90-16)",
        category: "Motorcycle & Motorbike Parts",
        subCategory: "Tires & Tubes",
        price: 4200,
        stock: 35,
        description: "All-terrain durable rubber motorcycle tire suitable for urban and rough roads.",
        image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Heavy Duty 428H Drive Chain & Sprocket Kit",
        category: "Motorcycle & Motorbike Parts",
        subCategory: "Chains & Drive",
        price: 2800,
        stock: 50,
        description: "Hardened steel drive chain and matching sprocket kit for 125cc-150cc motorbikes.",
        image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "DOT Approved Modular Full-Face Helmet",
        category: "Motorcycle & Motorbike Parts",
        subCategory: "Rider Protective Gear",
        price: 5500,
        stock: 25,
        description: "Aerodynamic full-face helmet with dual visor, removable inner liner, and impact protection.",
        image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Stainless Steel Brake & Clutch Cable Set",
        category: "Motorcycle & Motorbike Parts",
        subCategory: "Cables & Levers",
        price: 750,
        stock: 80,
        description: "Friction-resistant replacement control cables for smooth brake and clutch operation.",
        image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600"
    },

    // ==================== 3. POWER & HAND TOOLS ====================
    {
        name: "Bosch Professional 650W Impact Drill",
        category: "Power & Hand Tools",
        subCategory: "Power Drills",
        price: 8200,
        stock: 18,
        description: "Versatile corded impact drill for masonry, wood, and metal drilling applications.",
        image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Makita 4.5-Inch Angle Grinder 840W",
        category: "Power & Hand Tools",
        subCategory: "Grinders & Cutters",
        price: 7800,
        stock: 22,
        description: "Compact angle grinder featuring dust-proof motor construction and high RPM stability.",
        image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "14-Piece Chrome Vanadium Combination Spanner Set",
        category: "Power & Hand Tools",
        subCategory: "Hand Tools",
        price: 3600,
        stock: 40,
        description: "Precision-forged 8mm to 24mm spanner set in a heavy-duty portable storage roll.",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Pro-Series Circular Saw 1400W",
        category: "Power & Hand Tools",
        subCategory: "Saws & Woodworking",
        price: 11500,
        stock: 12,
        description: "High-torque woodworking circular saw with adjustable depth and angle beveling.",
        image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&q=80&w=600"
    },

    // ==================== 4. BUILDING & PLUMBING SUPPLIES ====================
    {
        name: "PPR Hot & Cold Water Pipes 20mm (4m)",
        category: "Building & Plumbing Supplies",
        subCategory: "Pipes & Fittings",
        price: 650,
        stock: 200,
        description: "Pressure-resistant non-toxic polypropylene pipes for hot and cold plumbing networks.",
        image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Bamburi Power Plus 32.5N Cement (50kg)",
        category: "Building & Plumbing Supplies",
        subCategory: "Cement & Adhesives",
        price: 820,
        stock: 500,
        description: "Premium quality Portland cement formulated for structural masonry and plastering.",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Galvanized Steel Wood Screws Pack (500 Pcs)",
        category: "Building & Plumbing Supplies",
        subCategory: "Fasteners & Fixings",
        price: 1200,
        stock: 100,
        description: "Corrosion-resistant countersunk wood screws suitable for timber construction.",
        image: "https://images.unsplash.com/photo-1608613304899-ea8098527e38?auto=format&fit=crop&q=80&w=600"
    },

    // ==================== 5. ELECTRICAL & SOLAR ====================
    {
        name: "Monocrystalline High-Efficiency Solar Panel 350W",
        category: "Electrical & Solar",
        subCategory: "Solar Panels & Systems",
        price: 16500,
        stock: 15,
        description: "Tempered glass 24V solar module with 21% energy conversion efficiency.",
        image: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "2.5mm Twin & Earth Electrical Copper Cable (100m Roll)",
        category: "Electrical & Solar",
        subCategory: "Wiring & Cables",
        price: 9500,
        stock: 30,
        description: "Pure copper insulated cable for domestic power distribution and socket wiring.",
        image: "https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&q=80&w=600"
    },
    {
        name: "Double Pole MCB Circuit Breaker 63A",
        category: "Electrical & Solar",
        subCategory: "Switches & Circuit Protection",
        price: 1100,
        stock: 60,
        description: "DIN-rail mounted miniature circuit breaker designed for electrical overload protection.",
        image: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&q=80&w=600"
    }
];

// --- SEEDING DEFAULT ADMINS, CATEGORIES & PRODUCTS ON STARTUP ---
const seedDatabase = async () => {
    try {
        const settings = await StoreSettings.findOne();
        if (!settings) await StoreSettings.create({});

        // Updated Categories to include structured subCategories array
        const defaultCategories = [
            { name: "Vehicle Spare Parts", description: "Engine components, brakes, suspension, and filters", icon: "car", subCategories: ["Engine", "Filters", "Brakes", "Suspension", "Electrical & Battery"] },
            { name: "Motorcycle & Motorbike Parts", description: "Tires, chains, sprockets, cables, and helmets", icon: "bike", subCategories: ["Tires & Tubes", "Chains & Drive", "Rider Protective Gear", "Cables & Levers"] },
            { name: "Power & Hand Tools", description: "Drills, angle grinders, spanners, and saws", icon: "wrench", subCategories: ["Power Drills", "Grinders & Cutters", "Hand Tools", "Saws & Woodworking"] },
            { name: "Building & Plumbing Supplies", description: "Pipes, fittings, cement, and fasteners", icon: "hammer", subCategories: ["Pipes & Fittings", "Cement & Adhesives", "Fasteners & Fixings"] },
            { name: "Electrical & Solar", description: "Heavy duty wiring, solar panels, and breakers", icon: "zap", subCategories: ["Solar Panels & Systems", "Wiring & Cables", "Switches & Circuit Protection"] }
        ];

        for (let cat of defaultCategories) {
            await Category.updateOne({ name: cat.name }, { $setOnInsert: cat }, { upsert: true });
        }

        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            await Product.insertMany(initialProducts);
            console.log(`✅ Automatically seeded ${initialProducts.length} items across all categories into MongoDB Atlas!`);
        }

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
                    const adminUser = await User.create({
                        fullName: adminData.fullName,
                        email: adminData.email,
                        password: hashedPassword,
                        role: 'admin'
                    });
                    
                    // Log admin creation
                    await Log.create({ actionType: 'ACCOUNT_CREATION', user: adminUser._id, details: { method: 'Auto-seed', role: 'admin' } });
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

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Restricted to Admin panel only.' });
    }
};

// --- API ROUTES ---

// ==================== 1. USER AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
    const { fullName, email, password, phone } = req.body;
    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Please provide full name, email and password' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) return res.status(400).json({ message: 'Email address is already registered' });

        const assignedRole = (normalizedEmail === 'njorogemichael37@gmail.com') ? 'admin' : 'user';

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            fullName, 
            email: normalizedEmail, 
            phone, 
            password: hashedPassword, 
            role: assignedRole 
        });

        await Cart.create({ user: user._id, items: [] });
        
        // Log account creation timestamp & details
        await Log.create({ actionType: 'ACCOUNT_CREATION', user: user._id, details: { email: user.email, role: user.role }});

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        if (user.isSuspended) {
            return res.status(403).json({ message: 'Account Suspended! Contact hardware administration.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

        // Log login activity
        await Log.create({ actionType: 'USER_LOGIN', user: user._id, details: { email: user.email }});

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

        res.json({
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

app.get('/api/auth/me', protect, async (req, res) => {
    res.json(req.user);
});

// ==================== 2. CART ROUTES ====================

app.get('/api/cart', protect, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });
        res.json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve shopping cart' });
    }
});

app.post('/api/cart/add', protect, async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Calculate active price (Apply discount if item is on offer)
        const activePrice = product.isOffer ? (product.price - product.offerDiscount) : product.price;

        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += (quantity || 1);
        } else {
            cart.items.push({ product: productId, quantity: quantity || 1, price: activePrice });
        }

        cart.updatedAt = Date.now();
        await cart.save();
        
        const updatedCart = await Cart.findById(cart._id).populate('items.product');
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
});

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

app.delete('/api/cart/clear', protect, async (req, res) => {
    try {
        await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear cart' });
    }
});

// ==================== 3. PRODUCT & CATEGORY ROUTES ====================

app.get('/api/products', async (req, res) => {
    const { category, search, isOffer } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (isOffer) query.isOffer = true;

    try {
        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch hardware products' });
    }
});

// Add Hardware Product (Admin Only) - Now supports direct image links and file uploads
app.post('/api/products', protect, adminOnly, upload.single('image'), async (req, res) => {
    try {
        const { name, category, subCategory, price, stock, description, imageLink } = req.body;
        
        // Use uploaded file OR provided direct link string
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : (imageLink || req.body.image);

        if (!name || !category || !subCategory || !price || !imageUrl) {
            return res.status(400).json({ message: 'Please fill in all required product fields including an image or link' });
        }

        const product = new Product({
            name, category, subCategory, price: Number(price), stock: Number(stock) || 10,
            description, image: imageUrl
        });

        const savedProduct = await product.save();
        await Log.create({ actionType: 'PRODUCT_ADDED', user: req.user._id, details: { productName: name }});
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create product' });
    }
});

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

app.delete('/api/products/:id', protect, adminOnly, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
});

// General Offers Engine (Admin Only) - Replaces limited "Weekly Deal"
app.put('/api/products/:id/offer', protect, adminOnly, async (req, res) => {
    try {
        const { isOffer, offerDiscount, offerDescription } = req.body;
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { isOffer, offerDiscount: Number(offerDiscount) || 0, offerDescription },
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product offer settings' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

app.post('/api/categories', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, icon, subCategories } = req.body;
        const category = await Category.create({ name, description, icon, subCategories: subCategories || [] });
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Category already exists or invalid data' });
    }
});

app.delete('/api/categories/:id', protect, adminOnly, async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete category' });
    }
});

// ==================== 4. KENYAN SHIPPING LOCATIONS ====================

// Fetch All 47 Counties for Shipping Checkout
app.get('/api/shipping/counties', async (req, res) => {
    const counties = [
        "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit",
        "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga",
        "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", "Uasin Gishu", "Elgeyo-Marakwet",
        "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga",
        "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
    ];
    res.json(counties);
});

// ==================== 5. RESTRICTED ADMIN LOGS & USER CONTROL ====================

// View all System Logs (Admin Only)
app.get('/api/admin/logs', protect, adminOnly, async (req, res) => {
    try {
        const logs = await Log.find().populate('user', 'fullName email').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve logs' });
    }
});

app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.put('/api/admin/users/:id/suspend', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be suspended' });

        user.isSuspended = !user.isSuspended;
        await user.save();
        
        await Log.create({ actionType: 'USER_SUSPENDED', user: req.user._id, details: { suspendedUser: user.email, status: user.isSuspended }});

        res.json({ message: `User status changed to ${user.isSuspended ? 'Suspended' : 'Active'}`, isSuspended: user.isSuspended });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle suspension status' });
    }
});

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

app.put('/api/admin/promote/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true }).select('-password');
        await Log.create({ actionType: 'ADMIN_PROMOTION', user: req.user._id, details: { promotedUser: user.email }});
        res.json({ message: 'User successfully promoted to Admin', user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to promote user' });
    }
});

// ==================== 6. STORE UI, BACKGROUND & THEME SETTINGS ====================

app.get('/api/settings', async (req, res) => {
    try {
        const settings = await StoreSettings.findOne();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load store settings' });
    }
});

app.put('/api/settings', protect, adminOnly, upload.single('backgroundImage'), async (req, res) => {
    try {
        let settings = await StoreSettings.findOne();
        if (!settings) settings = new StoreSettings();

        const { storeName, tagline, heroTitle, heroSubtitle, primaryColor, layoutType, contactPhone, contactEmail, backgroundLink } = req.body;

        if (storeName) settings.storeName = storeName;
        if (tagline) settings.tagline = tagline;
        if (heroTitle) settings.heroTitle = heroTitle;
        if (heroSubtitle) settings.heroSubtitle = heroSubtitle;
        if (primaryColor) settings.primaryColor = primaryColor;
        if (layoutType) settings.layoutType = layoutType;
        if (contactPhone) settings.contactPhone = contactPhone;
        if (contactEmail) settings.contactEmail = contactEmail;
        
        if (req.file) {
            settings.backgroundImage = `/uploads/${req.file.filename}`;
        } else if (backgroundLink) {
            settings.backgroundImage = backgroundLink; // Allows background by external link
        }

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update store UI settings' });
    }
});

// ==================== 7. ORDER PROCESSING & TRACKING ====================

app.post('/api/orders', protect, async (req, res) => {
    const { shippingAddress } = req.body; // Expects object: { county, subCounty, town, specificDetails }
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Your shopping cart is empty' });
        }

        const totalAmount = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        
        // Generate a random tracking number
        const trackingNumber = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await Order.create({
            user: req.user._id,
            items: cart.items,
            totalAmount,
            shippingAddress,
            trackingNumber,
            trackingHistory: [{ status: 'Order Placed', location: 'System', message: 'Your order has been received' }]
        });

        cart.items = [];
        await cart.save();

        await Log.create({ actionType: 'TRANSACTION', user: req.user._id, details: { orderId: order._id, amount: totalAmount }});

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Failed to place order' });
    }
});

// User tracks their order by tracking ID
app.get('/api/orders/track/:trackingNumber', async (req, res) => {
    try {
        const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
        if (!order) return res.status(404).json({ message: 'Invalid tracking number' });
        res.json({ trackingNumber: order.trackingNumber, status: order.status, history: order.trackingHistory });
    } catch (error) {
        res.status(500).json({ message: 'Failed to track order' });
    }
});

app.get('/api/orders/my-orders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order history' });
    }
});

app.get('/api/admin/orders', protect, adminOnly, async (req, res) => {
    try {
        const orders = await Order.find().populate('user', 'fullName email phone').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch customer orders' });
    }
});

// Admin updates status AND pushes to User Tracking History
app.put('/api/admin/orders/:id/status', protect, adminOnly, async (req, res) => {
    try {
        const { status, location, message } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        order.status = status;
        order.trackingHistory.push({
            status,
            location: location || 'Warehouse',
            message: message || `Order status updated to ${status}`
        });

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Hardware Sales Server running on port ${PORT}`);
});
