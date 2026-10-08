/**
 * ProHardware & Auto Spares — Production API
 * Payments : PayHero (M-Pesa STK Push)
 * SMS      : Ping Africa
 *
 * All secrets come from environment variables (see .env.example). Nothing sensitive is hard-coded.
 */
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// =====================================================================
// 1. CONFIGURATION
// =====================================================================
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URLS = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const PAYHERO = {
  url: process.env.PAYHERO_API_URL || 'https://backend.payhero.co.ke/api/v2',
  channelId: Number(process.env.PAYHERO_CHANNEL_ID),
  callbackSecret: process.env.PAYHERO_CALLBACK_SECRET || '',
  auth: (() => {
    const raw = (process.env.PAYHERO_BASIC_AUTH || '').trim().replace(/^["']|["']$/g, '');
    if (raw) return raw.startsWith('Basic ') ? raw : `Basic ${raw}`;
    const u = process.env.PAYHERO_API_USERNAME;
    const p = process.env.PAYHERO_API_PASSWORD;
    return u && p ? `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}` : '';
  })()
};

const PING = {
  url: process.env.PING_AFRICA_API_URL || 'https://bulk.ping.africa/api/sms/send',
  token: (process.env.PING_AFRICA_API_TOKEN || '').trim(),
  senderId: process.env.PING_AFRICA_SENDER_ID || ''
};

const missing = [];
if (!MONGO_URI) missing.push('MONGODB_URI');
if (!JWT_SECRET) missing.push('JWT_SECRET');
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (!PAYHERO.auth || !PAYHERO.channelId) console.warn('⚠️  PayHero is not fully configured (PAYHERO_BASIC_AUTH / PAYHERO_CHANNEL_ID). Checkout will be unavailable.');
if (!PING.token) console.warn('⚠️  Ping Africa token missing (PING_AFRICA_API_TOKEN). SMS notifications are disabled.');
if (IS_PROD && !PUBLIC_API_URL) console.warn('⚠️  PUBLIC_API_URL is not set — PayHero cannot reach the payment callback; payments will rely on status polling only.');
if (IS_PROD && !PAYHERO.callbackSecret) console.warn('⚠️  PAYHERO_CALLBACK_SECRET is not set — the payment callback is unauthenticated. Set a long random value.');

// =====================================================================
// 2. APP & MIDDLEWARE
// =====================================================================
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || !IS_PROD || FRONTEND_URLS.length === 0 || FRONTEND_URLS.includes(origin.replace(/\/$/, ''))) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Tiny in-memory rate limiter (per IP + route bucket)
const buckets = new Map();
const rateLimit = (name, max, windowMs) => (req, res, next) => {
  const key = `${name}:${req.ip}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return next();
  }
  entry.count += 1;
  if (entry.count > max) {
    res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
    return res.status(429).json({ message: 'Too many attempts. Please wait a moment and try again.' });
  }
  next();
};
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k); }, 60_000).unref();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));

// =====================================================================
// 3. SHARED HELPERS
// =====================================================================
const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

/** Normalises any Kenyan mobile format to 2547XXXXXXXX / 2541XXXXXXXX, or null. */
const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  const m = digits.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
};
const toLocalPhone = (p254) => `0${p254.slice(3)}`;

/** Final unit price after any active offer. offerType: 'fixed' (KES off) | 'percent'. */
const activePrice = (p) => {
  if (!p.isOffer || !p.offerDiscount) return p.price;
  const price = p.offerType === 'percent' ? p.price * (1 - p.offerDiscount / 100) : p.price - p.offerDiscount;
  return Math.max(0, Math.round(price));
};

/** Accepts "10%", "500", 500 → { offerDiscount, offerType } */
const parseDiscount = (raw) => {
  const str = String(raw ?? '').trim();
  const value = parseFloat(str.replace('%', ''));
  if (!Number.isFinite(value) || value <= 0) return { offerDiscount: 0, offerType: 'fixed' };
  return { offerDiscount: value, offerType: str.includes('%') ? 'percent' : 'fixed' };
};

const httpJson = async (url, options = {}, timeoutMs = 20000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
};

// =====================================================================
// 4. MONGOOSE MODELS
// =====================================================================
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isSuspended: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'wrench' },
  subCategories: [{ type: String }]
});
const Category = mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subCategory: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 10, min: 0 },
  description: { type: String, default: '' },
  image: { type: String, required: true },
  isOffer: { type: Boolean, default: false },
  offerDiscount: { type: Number, default: 0 },
  offerType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  offerDescription: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
ProductSchema.index({ name: 'text', description: 'text' });
const Product = mongoose.model('Product', ProductSchema);

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true }
  }],
  updatedAt: { type: Date, default: Date.now }
});
const Cart = mongoose.model('Cart', CartSchema);

const ORDER_STATUSES = ['awaiting_payment', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: Array, // snapshot: { product: {_id,name,image}, quantity, price }
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ORDER_STATUSES, default: 'awaiting_payment' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  payment: {
    provider: { type: String, default: 'payhero' },
    method: { type: String, default: 'mpesa' },
    phone: String,
    externalReference: { type: String, index: true },
    reference: String,
    checkoutRequestId: String,
    mpesaReceipt: String,
    failureReason: String,
    attempts: { type: Number, default: 0 },
    paidAt: Date
  },
  shippingAddress: {
    county: { type: String, required: true },
    subCounty: { type: String, default: '' },
    subLocation: { type: String, default: '' },
    town: { type: String, required: true },
    specificDetails: { type: String, required: true }
  },
  trackingNumber: { type: String, index: true },
  trackingHistory: [{
    status: String,
    location: String,
    timestamp: { type: Date, default: Date.now },
    message: String
  }],
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

const StoreSettingsSchema = new mongoose.Schema({
  storeName: { type: String, default: 'ProHardware & Auto Spares' },
  tagline: { type: String, default: 'Your #1 Store for Vehicle Parts, Motorbikes & Tools' },
  heroTitle: { type: String, default: 'Heavy Duty Hardware & Quality Vehicle Spare Parts' },
  heroSubtitle: { type: String, default: 'Genuine motorcycle parts, power tools, and industrial supplies delivered fast.' },
  backgroundImage: { type: String, default: '' },
  primaryColor: { type: String, default: '#d97706' },
  backgroundColor: { type: String, default: '#020617' },
  panelColor: { type: String, default: '#0f172a' },
  layoutType: { type: String, default: 'modern' },
  contactPhone: { type: String, default: '+254 700 000 000' },
  contactEmail: { type: String, default: 'support@prohardware.com' }
});
const StoreSettings = mongoose.model('StoreSettings', StoreSettingsSchema);

const LogSchema = new mongoose.Schema({
  actionType: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: Object, default: {} },
  timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', LogSchema);
const audit = (actionType, user, details = {}) => Log.create({ actionType, user, details }).catch((e) => console.error('Log error:', e.message));

// =====================================================================
// 5. FILE UPLOADS
// =====================================================================
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `hardware-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed'))
  )
});

// =====================================================================
// 7. SERVICES — PING AFRICA (SMS) & PAYHERO (M-PESA)
// =====================================================================
/**
 * Sends one SMS through Ping Africa. Never throws — returns true/false so a failing
 * SMS can never break checkout or payment confirmation.
 */
const sendSms = async (phone, message) => {
  const to = normalizePhone(phone);
  if (!to) return false;
  if (!PING.token) { console.warn('⚠️ [SMS] Skipped — PING_AFRICA_API_TOKEN not set'); return false; }
  try {
    const body = { recipient: to, phone: to, to, message };
    if (PING.senderId) body.sender_id = PING.senderId;
    const { ok, status, data } = await httpJson(PING.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${PING.token}` },
      body: JSON.stringify(body)
    }, 15000);
    const flag = data && (data.success ?? data.status);
    const failed = !ok || flag === false || (typeof flag === 'string' && /(error|fail)/i.test(flag));
    if (failed) {
      console.error(`❌ [SMS] Ping Africa rejected message to ${to} (HTTP ${status}):`, JSON.stringify(data));
      return false;
    }
    console.log(`📨 [SMS] Sent to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ [SMS] Ping Africa request failed:', err.message);
    return false;
  }
};

const payheroReady = () => Boolean(PAYHERO.auth && PAYHERO.channelId);

const payheroStkPush = async ({ amount, phone254, externalReference, customerName }) => {
  const callback = PUBLIC_API_URL
    ? `${PUBLIC_API_URL}/api/payments/payhero/callback${PAYHERO.callbackSecret ? `?s=${encodeURIComponent(PAYHERO.callbackSecret)}` : ''}`
    : undefined;
  const { ok, status, data } = await httpJson(`${PAYHERO.url}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: PAYHERO.auth },
    body: JSON.stringify({
      amount: Math.ceil(amount),
      phone_number: toLocalPhone(phone254),
      channel_id: PAYHERO.channelId,
      provider: 'm-pesa',
      external_reference: externalReference,
      customer_name: customerName,
      ...(callback ? { callback_url: callback } : {})
    })
  });
  if (!ok || data.success === false) {
    const reason = data.error_message || data.message || data.error || `PayHero error (HTTP ${status})`;
    throw new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
  }
  return { reference: data.reference, checkoutRequestId: data.CheckoutRequestID };
};

const payheroStatus = async (reference) => {
  const { ok, data } = await httpJson(`${PAYHERO.url}/transaction-status?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: PAYHERO.auth }
  }, 15000);
  if (!ok) return null;
  return { status: String(data.status || '').toUpperCase(), data };
};

// =====================================================================
// 8. ORDER / PAYMENT LIFECYCLE
// =====================================================================
const money = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;

/** Idempotent: only the first caller flips an order to paid. */
const markOrderPaid = async (orderId, { receipt, phone } = {}) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: 'paid' } },
    {
      $set: {
        paymentStatus: 'paid',
        status: 'processing',
        'payment.mpesaReceipt': receipt || undefined,
        'payment.paidAt': new Date(),
        'payment.failureReason': undefined
      },
      $push: { trackingHistory: { status: 'Payment Confirmed', location: 'M-Pesa', message: `M-Pesa payment confirmed${receipt ? ` (Ref ${receipt})` : ''}. Your order is being prepared.` } }
    },
    { new: true }
  );
  if (!order) return null; // already processed

  // Reduce stock & empty the cart
  await Promise.all(order.items.map((it) => Product.updateOne({ _id: it.product?._id }, { $inc: { stock: -it.quantity } }).catch(() => {})));
  await Product.updateMany({ stock: { $lt: 0 } }, { $set: { stock: 0 } });
  await Cart.findOneAndUpdate({ user: order.user }, { items: [], updatedAt: Date.now() });
  await audit('PAYMENT_SUCCESS', order.user, { orderId: order._id, amount: order.totalAmount, receipt });

  const customer = await User.findById(order.user).select('fullName phone');
  const smsPhone = phone || order.payment.phone || customer?.phone;
  sendSms(smsPhone, `Payment of ${money(order.totalAmount)} received${receipt ? ` (M-Pesa ${receipt})` : ''}. Order ${order.trackingNumber} is being processed. Thank you for shopping with ${process.env.STORE_NAME || 'ProHardware'}!`);
  if (process.env.ADMIN_ALERT_PHONE) sendSms(process.env.ADMIN_ALERT_PHONE, `New paid order ${order.trackingNumber} — ${money(order.totalAmount)} from ${customer?.fullName || 'a customer'}.`);
  return order;
};

const markOrderFailed = async (orderId, reason) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: 'pending' },
    { $set: { paymentStatus: 'failed', 'payment.failureReason': reason || 'Payment was not completed' } },
    { new: true }
  );
  if (order) await audit('PAYMENT_FAILED', order.user, { orderId: order._id, reason });
  return order;
};

/** Starts (or restarts) an STK push for an unpaid order. */
const startPayment = async (order, user, phone254) => {
  const attempt = (order.payment?.attempts || 0) + 1;
  const externalReference = `${order._id}-${attempt}`;
  const result = await payheroStkPush({ amount: order.totalAmount, phone254, externalReference, customerName: user.fullName });
  order.paymentStatus = 'pending';
  order.status = 'awaiting_payment';
  order.payment = {
    ...(order.payment?.toObject?.() || {}),
    provider: 'payhero', method: 'mpesa', phone: phone254,
    externalReference, reference: result.reference, checkoutRequestId: result.checkoutRequestId,
    failureReason: undefined, attempts: attempt
  };
  await order.save();
  return order;
};

// Expire abandoned checkouts every 10 minutes
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await Order.find({ paymentStatus: 'pending', createdAt: { $lt: cutoff } }).select('_id payment.reference');
    for (const o of stale) {
      const s = o.payment?.reference ? await payheroStatus(o.payment.reference).catch(() => null) : null;
      if (s?.status === 'SUCCESS') await markOrderPaid(o._id);
      else {
        await markOrderFailed(o._id, 'Payment window expired');
        await Order.updateOne({ _id: o._id, paymentStatus: 'failed' }, { status: 'cancelled' });
      }
    }
  } catch (e) { console.error('Stale order sweep failed:', e.message); }
}, 10 * 60 * 1000).unref();

// =====================================================================
// 9. SEED DATA
// =====================================================================
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


const seedDatabase = async () => {
  try {
    if (!(await StoreSettings.findOne())) await StoreSettings.create({});

    const defaultCategories = [
      { name: 'Vehicle Spare Parts', description: 'Engine components, brakes, suspension, and filters', icon: 'car', subCategories: ['Engine', 'Filters', 'Brakes', 'Suspension', 'Electrical & Battery'] },
      { name: 'Motorcycle & Motorbike Parts', description: 'Tires, chains, sprockets, cables, and helmets', icon: 'bike', subCategories: ['Tires & Tubes', 'Chains & Drive', 'Rider Protective Gear', 'Cables & Levers'] },
      { name: 'Power & Hand Tools', description: 'Drills, angle grinders, spanners, and saws', icon: 'wrench', subCategories: ['Power Drills', 'Grinders & Cutters', 'Hand Tools', 'Saws & Woodworking'] },
      { name: 'Building & Plumbing Supplies', description: 'Pipes, fittings, cement, and fasteners', icon: 'hammer', subCategories: ['Pipes & Fittings', 'Cement & Adhesives', 'Fasteners & Fixings'] },
      { name: 'Electrical & Solar', description: 'Heavy duty wiring, solar panels, and breakers', icon: 'zap', subCategories: ['Solar Panels & Systems', 'Wiring & Cables', 'Switches & Circuit Protection'] }
    ];
    for (const cat of defaultCategories) await Category.updateOne({ name: cat.name }, { $setOnInsert: cat }, { upsert: true });

    if ((await Product.countDocuments()) === 0) {
      await Product.insertMany(initialProducts);
      console.log(`✅ Seeded ${initialProducts.length} starter products`);
    }

    // Optional bootstrap admin, driven purely by environment variables
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
      if (!(await User.findOne({ email }))) {
        const admin = await User.create({
          fullName: process.env.ADMIN_NAME || 'Store Administrator',
          email,
          password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
          role: 'admin'
        });
        await audit('ACCOUNT_CREATION', admin._id, { method: 'env-bootstrap', role: 'admin' });
        console.log(`✅ Bootstrap admin created: ${email}`);
      }
    }
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
};

// =====================================================================
// 10. AUTH MIDDLEWARE
// =====================================================================
const protect = asyncH(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ message: 'Your session has expired. Please log in again.' }); }
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return res.status(401).json({ message: 'User account no longer exists.' });
  if (user.isSuspended) return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
  req.user = user;
  next();
});
const adminOnly = (req, res, next) => (req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Access denied. Admins only.' }));

// =====================================================================
// 11. ROUTES
// =====================================================================
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1, payhero: payheroReady(), sms: Boolean(PING.token), time: new Date().toISOString() }));

// ---------- AUTH ----------
app.post('/api/auth/register', rateLimit('register', 10, 15 * 60 * 1000), asyncH(async (req, res) => {
  const { fullName, email, password, phone } = req.body || {};
  if (!fullName?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Full name, email and password are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const normalizedPhone = phone ? normalizePhone(phone) : '';
  if (phone && !normalizedPhone) return res.status(400).json({ message: 'Enter a valid Kenyan phone number (e.g. 0712 345 678).' });

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) return res.status(400).json({ message: 'That email address is already registered.' });

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone || '',
    password: await bcrypt.hash(password, 12),
    role: ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'user'
  });
  await Cart.create({ user: user._id, items: [] });
  audit('ACCOUNT_CREATION', user._id, { email: user.email, role: user.role });
  if (user.phone) sendSms(user.phone, `Welcome to ${process.env.STORE_NAME || 'ProHardware'}, ${user.fullName.split(' ')[0]}! Your account is ready.`);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

app.post('/api/auth/login', rateLimit('login', 10, 15 * 60 * 1000), asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ''), user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
  if (user.isSuspended) return res.status(403).json({ message: 'Account suspended. Contact support.' });
  audit('USER_LOGIN', user._id, { email: user.email });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get('/api/auth/me', protect, (req, res) => res.json(req.user));

// ---------- CART ----------
const loadCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  // Drop deleted products and refresh prices so the customer always sees the real price
  const live = cart.items.filter((i) => i.product);
  let dirty = live.length !== cart.items.length;
  live.forEach((i) => { const p = activePrice(i.product); if (i.price !== p) { i.price = p; dirty = true; } });
  if (dirty) { cart.items = live; await cart.save(); }
  return cart;
};

app.get('/api/cart', protect, asyncH(async (req, res) => res.json(await loadCart(req.user._id))));

app.post('/api/cart/add', protect, asyncH(async (req, res) => {
  const { productId } = req.body || {};
  const qty = Math.max(1, parseInt(req.body?.quantity, 10) || 1);
  if (!isValidId(productId)) return res.status(400).json({ message: 'Invalid product.' });
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  if (product.stock < 1) return res.status(400).json({ message: 'This item is out of stock.' });

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });
  const existing = cart.items.find((i) => i.product.toString() === productId);
  const newQty = Math.min((existing?.quantity || 0) + qty, product.stock);
  if (existing) { existing.quantity = newQty; existing.price = activePrice(product); }
  else cart.items.push({ product: productId, quantity: newQty, price: activePrice(product) });
  cart.updatedAt = Date.now();
  await cart.save();
  res.json(await loadCart(req.user._id));
}));

app.put('/api/cart/item/:productId', protect, asyncH(async (req, res) => {
  const qty = parseInt(req.body?.quantity, 10);
  if (!isValidId(req.params.productId) || !Number.isFinite(qty)) return res.status(400).json({ message: 'Invalid request.' });
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.find((i) => i.product.toString() === req.params.productId);
  if (item) {
    if (qty < 1) cart.items = cart.items.filter((i) => i !== item);
    else { const p = await Product.findById(req.params.productId); item.quantity = Math.min(qty, p ? p.stock : qty); }
    await cart.save();
  }
  res.json(await loadCart(req.user._id));
}));

app.delete('/api/cart/item/:productId', protect, asyncH(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) { cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId); await cart.save(); }
  res.json(await loadCart(req.user._id));
}));

app.delete('/api/cart/clear', protect, asyncH(async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ message: 'Cart cleared.' });
}));

// ---------- PRODUCTS & CATEGORIES ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.get('/api/products', asyncH(async (req, res) => {
  const { category, subCategory, search, isOffer } = req.query;
  const q = {};
  if (category) q.category = category;
  if (subCategory) q.subCategory = subCategory;
  if (search) q.name = { $regex: escapeRegex(String(search)), $options: 'i' };
  if (isOffer === 'true' || isOffer === '1') q.isOffer = true;
  res.json(await Product.find(q).sort({ createdAt: -1 }));
}));

const productFields = (body) => {
  const out = {};
  ['name', 'category', 'subCategory', 'description', 'offerDescription'].forEach((k) => { if (body[k] !== undefined) out[k] = String(body[k]).trim(); });
  if (body.price !== undefined) out.price = Math.max(0, Number(body.price));
  if (body.stock !== undefined) out.stock = Math.max(0, parseInt(body.stock, 10) || 0);
  if (body.isOffer !== undefined) out.isOffer = body.isOffer === true || body.isOffer === 'true';
  if (body.offerDiscount !== undefined) Object.assign(out, parseDiscount(body.offerDiscount));
  return out;
};

app.post('/api/products', protect, adminOnly, upload.single('image'), asyncH(async (req, res) => {
  const fields = productFields(req.body);
  const image = req.file ? `/uploads/${req.file.filename}` : (req.body.imageLink || req.body.imageUrl || req.body.image);
  if (!fields.name || !fields.category || !fields.subCategory || !Number.isFinite(fields.price) || !image) {
    return res.status(400).json({ message: 'Name, category, sub-category, price and an image (upload or link) are required.' });
  }
  const product = await Product.create({ ...fields, image });
  audit('PRODUCT_ADDED', req.user._id, { productName: product.name });
  res.status(201).json(product);
}));

app.post('/api/products/seed', protect, adminOnly, asyncH(async (req, res) => {
  const products = req.body.products || req.body;
  if (!Array.isArray(products) || !products.length) return res.status(400).json({ message: 'Provide a non-empty array of products.' });
  const saved = await Product.insertMany(products);
  res.status(201).json({ message: 'Products seeded.', count: saved.length });
}));

app.put('/api/products/:id', protect, adminOnly, upload.single('image'), asyncH(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid product id.' });
  const updates = productFields(req.body);
  if (req.file) updates.image = `/uploads/${req.file.filename}`;
  else if (req.body.imageLink || req.body.imageUrl) updates.image = req.body.imageLink || req.body.imageUrl;
  const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: 'Product not found.' });
  res.json(product);
}));

app.delete('/api/products/:id', protect, adminOnly, asyncH(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Product deleted.' });
}));

app.put('/api/products/:id/offer', protect, adminOnly, asyncH(async (req, res) => {
  const { isOffer, offerDiscount, offerDescription } = req.body || {};
  const product = await Product.findByIdAndUpdate(req.params.id, { isOffer: Boolean(isOffer), ...parseDiscount(offerDiscount), offerDescription: offerDescription || '' }, { new: true });
  res.json(product);
}));

app.get('/api/categories', asyncH(async (req, res) => res.json(await Category.find({}))));

app.post('/api/categories', protect, adminOnly, asyncH(async (req, res) => {
  const { name, description, icon, subCategories } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ message: 'Category name is required.' });
  try {
    res.status(201).json(await Category.create({ name: name.trim(), description, icon, subCategories: subCategories || [] }));
  } catch { res.status(400).json({ message: 'That category already exists.' }); }
}));

app.delete('/api/categories/:id', protect, adminOnly, asyncH(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted.' });
}));

// ---------- SHIPPING ----------
const COUNTIES = ['Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans-Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi'];
app.get('/api/shipping/counties', (req, res) => res.json(COUNTIES));

// ---------- ORDERS & PAYMENTS ----------
const customerOrderView = (o) => o; // order documents contain nothing secret

/** Checkout: snapshot the cart at live prices, create the order and send the M-Pesa prompt. */
app.post('/api/orders', protect, rateLimit('checkout', 12, 10 * 60 * 1000), asyncH(async (req, res) => {
  if (!payheroReady()) return res.status(503).json({ message: 'Online payments are temporarily unavailable. Please try again shortly.' });

  const a = req.body?.shippingAddress;
  const addr = typeof a === 'object' && a ? a : null;
  if (!addr?.county || !addr?.town || !(addr.specificDetails || addr.exactAddress)) {
    return res.status(400).json({ message: 'County, town and exact delivery address are required.' });
  }
  const phone254 = normalizePhone(req.body?.phone || req.user.phone);
  if (!phone254) return res.status(400).json({ message: 'Enter a valid M-Pesa phone number (e.g. 0712 345 678).' });

  const cart = await loadCart(req.user._id);
  if (!cart.items.length) return res.status(400).json({ message: 'Your cart is empty.' });

  for (const i of cart.items) {
    if (i.product.stock < i.quantity) return res.status(400).json({ message: `Only ${i.product.stock} of "${i.product.name}" left in stock. Please update your cart.` });
  }

  const items = cart.items.map((i) => ({ product: { _id: i.product._id, name: i.product.name, image: i.product.image }, quantity: i.quantity, price: activePrice(i.product) }));
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.user._id,
    items,
    totalAmount,
    shippingAddress: { county: addr.county, subCounty: addr.subCounty || '', subLocation: addr.subLocation || '', town: addr.town, specificDetails: addr.specificDetails || addr.exactAddress },
    trackingNumber: `TRK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    trackingHistory: [{ status: 'Order Placed', location: 'System', message: 'Order received — waiting for M-Pesa payment.' }]
  });

  try {
    await startPayment(order, req.user, phone254);
  } catch (err) {
    console.error('❌ PayHero STK push failed:', err.message);
    await markOrderFailed(order._id, err.message);
    return res.status(502).json({ message: 'We could not send the M-Pesa prompt. Please check your number and try again.', orderId: order._id });
  }
  audit('TRANSACTION', req.user._id, { orderId: order._id, amount: totalAmount, stage: 'stk_sent' });
  res.status(201).json(order);
}));

/** Retry payment for an unpaid order (new STK push, optionally another number). */
app.post('/api/orders/:id/pay', protect, rateLimit('repay', 12, 10 * 60 * 1000), asyncH(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid order.' });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already paid.' });
  if (order.status === 'cancelled') return res.status(400).json({ message: 'This order was cancelled. Please place a new order.' });
  const phone254 = normalizePhone(req.body?.phone || order.payment?.phone || req.user.phone);
  if (!phone254) return res.status(400).json({ message: 'Enter a valid M-Pesa phone number.' });
  try {
    await startPayment(order, req.user, phone254);
  } catch (err) {
    console.error('❌ PayHero retry failed:', err.message);
    return res.status(502).json({ message: 'We could not send the M-Pesa prompt. Please try again.' });
  }
  res.json(order);
}));

/** Polled by the checkout screen. Falls back to asking PayHero directly if the callback is late. */
app.get('/api/orders/:id/payment-status', protect, asyncH(async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid order.' });
  let order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  if (order.paymentStatus === 'pending' && order.payment?.reference && payheroReady()) {
    const s = await payheroStatus(order.payment.reference).catch(() => null);
    if (s?.status === 'SUCCESS') order = (await markOrderPaid(order._id, { receipt: s.data.MpesaReceiptNumber })) || (await Order.findById(order._id));
    else if (s?.status === 'FAILED') order = (await markOrderFailed(order._id, s.data.ResultDesc || 'Payment was declined or cancelled')) || (await Order.findById(order._id));
  }
  res.json({ orderId: order._id, paymentStatus: order.paymentStatus, status: order.status, receipt: order.payment?.mpesaReceipt || null, reason: order.payment?.failureReason || null, trackingNumber: order.trackingNumber });
}));

/** PayHero webhook. Protected by a shared secret in the URL and an amount check. */
app.post('/api/payments/payhero/callback', asyncH(async (req, res) => {
  if (PAYHERO.callbackSecret) {
    const given = Buffer.from(String(req.query.s || ''));
    const want = Buffer.from(PAYHERO.callbackSecret);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return res.status(401).json({ message: 'Unauthorized' });
  }
  const r = req.body?.response || req.body || {};
  const ref = r.ExternalReference || r.external_reference;
  res.status(200).json({ received: true }); // acknowledge fast; process below
  if (!ref) return;

  const order = await Order.findOne({ 'payment.externalReference': ref });
  if (!order) return console.warn('⚠️ PayHero callback for unknown reference:', ref);
  const success = String(r.Status || r.status || '').toLowerCase() === 'success' && Number(r.ResultCode ?? 0) === 0;
  if (success) {
    if (r.Amount !== undefined && Math.round(Number(r.Amount)) < Math.ceil(order.totalAmount)) {
      await audit('PAYMENT_AMOUNT_MISMATCH', order.user, { orderId: order._id, expected: order.totalAmount, got: r.Amount });
      return console.error(`❌ Amount mismatch on order ${order._id}: expected ${order.totalAmount}, got ${r.Amount}`);
    }
    await markOrderPaid(order._id, { receipt: r.MpesaReceiptNumber, phone: order.payment?.phone });
  } else {
    await markOrderFailed(order._id, r.ResultDesc || 'Payment was declined or cancelled');
  }
}));

app.get('/api/orders/track/:trackingNumber', asyncH(async (req, res) => {
  const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
  if (!order) return res.status(404).json({ message: 'Invalid tracking number.' });
  res.json({ trackingNumber: order.trackingNumber, status: order.status, history: order.trackingHistory });
}));

const myOrders = asyncH(async (req, res) => res.json((await Order.find({ user: req.user._id }).sort({ createdAt: -1 })).map(customerOrderView)));
app.get('/api/orders/my-orders', protect, myOrders);
app.get('/api/orders/me', protect, myOrders);

// ---------- ADMIN ----------
app.get('/api/admin/stats', protect, adminOnly, asyncH(async (req, res) => {
  const [products, categories, users, orders, paid, lowStock, byStatus] = await Promise.all([
    Product.countDocuments(), Category.countDocuments(), User.countDocuments(), Order.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Product.find({ stock: { $lte: 5 } }).select('name stock').sort({ stock: 1 }).limit(8),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  res.json({ products, categories, users, orders, revenue: paid[0]?.revenue || 0, paidOrders: paid[0]?.count || 0, lowStock, byStatus });
}));

app.get('/api/admin/logs', protect, adminOnly, asyncH(async (req, res) => res.json(await Log.find().populate('user', 'fullName email').sort({ timestamp: -1 }).limit(500))));
app.get('/api/admin/users', protect, adminOnly, asyncH(async (req, res) => res.json(await User.find().select('-password').sort({ createdAt: -1 }))));

app.put('/api/admin/users/:id/suspend', protect, adminOnly, asyncH(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') return res.status(400).json({ message: 'Admin accounts cannot be suspended.' });
  user.isSuspended = !user.isSuspended;
  await user.save();
  audit('USER_SUSPENDED', req.user._id, { suspendedUser: user.email, status: user.isSuspended });
  res.json({ message: `User is now ${user.isSuspended ? 'suspended' : 'active'}.`, isSuspended: user.isSuspended });
}));

app.put('/api/admin/users/:id', protect, adminOnly, asyncH(async (req, res) => {
  const { fullName, email, phone } = req.body || {};
  res.json(await User.findByIdAndUpdate(req.params.id, { fullName, email, phone }, { new: true }).select('-password'));
}));

app.delete('/api/admin/users/:id', protect, adminOnly, asyncH(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user?.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin account.' });
  await User.findByIdAndDelete(req.params.id);
  await Cart.findOneAndDelete({ user: req.params.id });
  res.json({ message: 'User deleted.' });
}));

app.put('/api/admin/promote/:id', protect, adminOnly, asyncH(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  audit('ADMIN_PROMOTION', req.user._id, { promotedUser: user.email });
  res.json({ message: 'User promoted to admin.', user });
}));

app.get('/api/admin/orders', protect, adminOnly, asyncH(async (req, res) => res.json(await Order.find().populate('user', 'fullName email phone').sort({ createdAt: -1 }).limit(500))));

app.put('/api/admin/orders/:id/status', protect, adminOnly, asyncH(async (req, res) => {
  const { status, location, message } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (order.paymentStatus !== 'paid' && ['processing', 'shipped', 'delivered'].includes(status)) {
    return res.status(400).json({ message: 'This order has not been paid yet.' });
  }
  order.status = status;
  order.trackingHistory.push({ status, location: location || 'Warehouse', message: message || `Order status updated to ${status.replace('_', ' ')}` });
  await order.save();
  audit('ORDER_STATUS', req.user._id, { orderId: order._id, status });

  if (['shipped', 'delivered'].includes(status)) {
    const customer = await User.findById(order.user).select('phone');
    const text = status === 'shipped'
      ? `Your order ${order.trackingNumber} has been shipped and is on its way.`
      : `Your order ${order.trackingNumber} has been delivered. Thank you for shopping with us!`;
    sendSms(order.payment?.phone || customer?.phone, text);
  }
  res.json(order);
}));

// ---------- STORE SETTINGS ----------
app.get('/api/settings', asyncH(async (req, res) => res.json(await StoreSettings.findOne())));

app.put('/api/settings', protect, adminOnly, upload.single('backgroundImage'), asyncH(async (req, res) => {
  const settings = (await StoreSettings.findOne()) || new StoreSettings();
  ['storeName', 'tagline', 'heroTitle', 'heroSubtitle', 'primaryColor', 'backgroundColor', 'panelColor', 'layoutType', 'contactPhone', 'contactEmail'].forEach((k) => {
    if (req.body[k]) settings[k] = req.body[k];
  });
  if (req.file) settings.backgroundImage = `/uploads/${req.file.filename}`;
  else if (req.body.backgroundLink) settings.backgroundImage = req.body.backgroundLink;
  await settings.save();
  res.json(settings);
}));

// =====================================================================
// 12. ERROR HANDLING & STARTUP
// =====================================================================
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5 MB.' : err.message });
  if (err.message === 'Only image files are allowed' || err.message === 'Origin not allowed by CORS') return res.status(400).json({ message: err.message });
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to database');
    await seedDatabase();
    const server = app.listen(PORT, () => console.log(`🚀 Hardware Sales API running on port ${PORT}`));
    const shutdown = () => { console.log('Shutting down…'); server.close(() => mongoose.connection.close(false).then(() => process.exit(0))); setTimeout(() => process.exit(1), 10000).unref(); };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};
process.on('unhandledRejection', (r) => console.error('Unhandled rejection:', r));
start();
