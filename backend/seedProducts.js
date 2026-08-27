const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI 
  || process.env.MONGO_URI 
  || 'mongodb+srv://wambuicathrine217_db_user:JM8U3oBz4UxE0DQ9@cluster0.arqtzh6.mongodb.net/hardware_sales?retryWrites=true&w=majority&appName=Cluster0';

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 10 },
    description: { type: String, default: "" },
    image: { type: String, required: true },
    isWeeklyDeal: { type: Boolean, default: false },
    weeklyGiftDescription: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const products = [
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

const seedProducts = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB Atlas for seeding...");

        // Clear existing product collection
        await Product.deleteMany({});
        console.log("🗑️ Cleared existing products.");

        // Insert new expanded catalogue
        const createdProducts = await Product.insertMany(products);
        console.log(`🚀 Successfully seeded ${createdProducts.length} items across all categories!`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding product catalogue:", err);
        process.exit(1);
    }
};

seedProducts();
