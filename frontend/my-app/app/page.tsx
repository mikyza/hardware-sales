'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, ShoppingCart, User as UserIcon, X, MessageCircle, Plus, Minus, Package, Settings, LogOut,
  Wrench, Car, Bike, Hammer, Zap, Trash2, CheckCircle2, Users, ShoppingBag, Flame, Layers, ChevronDown,
  ShieldCheck, Box, Activity, MapPin, Clock, ChevronRight, Image as ImageIcon, Link as LinkIcon, Smartphone,
  Truck, Loader2, AlertCircle, Eye, EyeOff, RefreshCw, TrendingUp, ArrowRight, Phone, Mail, BadgeCheck,
  Headphones, ExternalLink, SlidersHorizontal, Menu, Store, Tags
} from 'lucide-react';

// =====================================================================
// CONFIG & HELPERS
// =====================================================================
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://hardware-sales.onrender.com').replace(/\/$/, '');

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega',
  'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni',
  'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
  'Wajir', 'West Pokot'
];

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
const getImageUrl = (url?: string) => (!url ? FALLBACK_IMG : /^https?:\/\//.test(url) ? url : `${API_BASE_URL}${url}`);

const ksh = (n: any) => `Ksh ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

/** Mirrors the server's pricing so the UI never disagrees with checkout. */
const finalPrice = (p: any): number => {
  if (!p?.isOffer || !p.offerDiscount) return p?.price ?? 0;
  const d = Number(p.offerDiscount);
  const v = p.offerType === 'percent' ? p.price * (1 - d / 100) : p.price - d;
  return Math.max(0, Math.round(v));
};
const offerLabel = (p: any) => (p.offerType === 'percent' ? `${p.offerDiscount}% OFF` : `${ksh(p.offerDiscount)} OFF`);

const normalizePhone = (raw: string): string | null => {
  const m = String(raw || '').replace(/\D/g, '').match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
};
const toLocalPhone = (p: string) => `0${p.slice(3)}`;

const formatAddress = (a: any) =>
  typeof a === 'string'
    ? a
    : [a?.specificDetails, a?.subLocation, a?.town, a?.subCounty, a?.county && `${a.county} County`].filter(Boolean).join(', ');

const formatDate = (d: any) => (d ? new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '');

/** Picks black/white text so buttons stay readable whatever accent colour the admin chooses. */
const readableOn = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#0b1220' : '#ffffff';
};

const getIcon = (name: string, size = 20) => {
  switch ((name || '').toLowerCase()) {
    case 'car': case 'vehicle spare parts': return <Car size={size} />;
    case 'bike': case 'motorcycle & motorbike parts': return <Bike size={size} />;
    case 'hammer': case 'building & plumbing supplies': return <Hammer size={size} />;
    case 'zap': case 'electrical & solar': return <Zap size={size} />;
    case 'wrench': case 'power & hand tools': return <Wrench size={size} />;
    default: return <Package size={size} />;
  }
};

const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  awaiting_payment: { label: 'Awaiting payment', tone: 'amber' },
  pending: { label: 'Pending', tone: 'amber' },
  processing: { label: 'Processing', tone: 'blue' },
  shipped: { label: 'Shipped', tone: 'purple' },
  delivered: { label: 'Delivered', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'red' }
};
const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: 'Paid', tone: 'green' },
  pending: { label: 'Unpaid', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' }
};

const GLOBAL_CSS = `
.ph-root{--border:#1e293b;--muted:#94a3b8;color:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.ph-root *{scrollbar-width:thin;scrollbar-color:#334155 transparent}
.ph-card{background:var(--panel);border:1px solid var(--border);border-radius:1rem}
.ph-input{width:100%;background:color-mix(in srgb,var(--bg) 75%,transparent);border:1px solid var(--border);color:#f1f5f9;border-radius:.75rem;padding:.7rem .9rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s}
.ph-input::placeholder{color:#64748b}
.ph-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 25%,transparent)}
.ph-input:disabled{opacity:.5}
.ph-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;background:var(--primary);color:var(--on-primary);font-weight:700;font-size:.875rem;border-radius:.75rem;padding:.7rem 1.1rem;transition:filter .15s,transform .1s,opacity .15s;cursor:pointer}
.ph-btn:hover:not(:disabled){filter:brightness(1.1)}
.ph-btn:active:not(:disabled){transform:scale(.98)}
.ph-btn:disabled{opacity:.5;cursor:not-allowed}
.ph-btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid var(--border);color:#cbd5e1;font-weight:600;font-size:.875rem;border-radius:.75rem;padding:.65rem 1rem;transition:background .15s,border-color .15s;cursor:pointer}
.ph-btn-ghost:hover:not(:disabled){background:rgba(255,255,255,.05);border-color:#334155}
.ph-btn-ghost:disabled{opacity:.5;cursor:not-allowed}
.ph-tint{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);border:1px solid color-mix(in srgb,var(--primary) 35%,transparent)}
.ph-accent{color:var(--primary)}
.ph-skel{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09),rgba(255,255,255,.04));background-size:200% 100%;animation:ph-shimmer 1.4s infinite}
@keyframes ph-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes ph-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ph-slide{from{transform:translateX(100%)}to{transform:none}}
.ph-pop{animation:ph-pop .18s ease-out}
.ph-slide{animation:ph-slide .22s ease-out}
.ph-root :focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.ph-hide-scroll::-webkit-scrollbar{display:none}.ph-hide-scroll{scrollbar-width:none}
@media (prefers-reduced-motion:reduce){.ph-pop,.ph-slide,.ph-skel{animation:none}}
`;

const TONES: Record<string, string> = {
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  red: 'bg-red-500/10 text-red-400 border-red-500/25',
  blue: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  purple: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  slate: 'bg-slate-500/10 text-slate-300 border-slate-500/25'
};
const Badge = ({ tone = 'slate', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONES[tone] || TONES.slate}`}>{children}</span>
);

const Modal = ({ open, onClose, title, icon, children, size = 'md', side = false }: {
  open: boolean; onClose: () => void; title?: string; icon?: React.ReactNode; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; side?: boolean;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  return (
    <div className={`fixed inset-0 z-[70] flex ${side ? 'justify-end' : 'items-end sm:items-center justify-center p-0 sm:p-4'} bg-slate-950/70 backdrop-blur-sm`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`ph-card flex flex-col shadow-2xl ${side ? 'ph-slide h-full w-full max-w-md rounded-none border-y-0 border-r-0' : `ph-pop w-full ${width} max-h-[92vh] rounded-b-none sm:rounded-2xl`}`}>
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-white"><span className="ph-accent">{icon}</span>{title}</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-full bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
  </label>
);

const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="animate-spin" />;

// =====================================================================
// MAIN APPLICATION
// =====================================================================
export default function ProHardwareApp() {
  // ---------- data ----------
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>({
    storeName: 'ProHardware & Auto Spares', tagline: 'Your #1 Store for Vehicle Parts, Motorbikes & Tools',
    heroTitle: 'Heavy Duty Hardware & Quality Spare Parts', heroSubtitle: 'Genuine parts, tools and supplies delivered across Kenya.',
    primaryColor: '#d97706', backgroundColor: '#020617', panelColor: '#0f172a', contactPhone: '+254 700 000 000',
    contactEmail: 'support@prohardware.com', backgroundImage: ''
  });

  // ---------- session ----------
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);

  // ---------- shopping ----------
  const [cart, setCart] = useState<any>({ items: [] });
  const [cartOpen, setCartOpen] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [quickView, setQuickView] = useState<any>(null);
  const [qvQty, setQvQty] = useState(1);

  // ---------- filters ----------
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('All');
  const [selSub, setSelSub] = useState('All');
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState<'new' | 'low' | 'high' | 'name'>('new');
  const [showFilters, setShowFilters] = useState(false);

  // ---------- checkout ----------
  type Step = 'delivery' | 'payment' | 'waiting' | 'success' | 'failed';
  const [ck, setCk] = useState<{ open: boolean; step: Step; orderId: string | null; tracking: string; receipt: string; reason: string; slow: boolean; amount: number }>(
    { open: false, step: 'delivery', orderId: null, tracking: '', receipt: '', reason: '', slow: false, amount: 0 }
  );
  const [delivery, setDelivery] = useState({ county: '', subCounty: '', subLocation: '', town: '', specificDetails: '' });
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [ckError, setCkError] = useState('');
  const [ckBusy, setCkBusy] = useState(false);
  const pollRef = useRef<any>(null);

  // ---------- admin ----------
  type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'users' | 'logs' | 'settings';
  const [tab, setTab] = useState<Tab>('dashboard');
  const [adminNav, setAdminNav] = useState(false);
  const [viewAsShopper, setViewAsShopper] = useState(false);
  const [admin, setAdmin] = useState<{ users: any[]; orders: any[]; logs: any[]; stats: any }>({ users: [], orders: [], logs: [], stats: null });
  const blankProduct = { name: '', category: '', subCategory: '', price: '', stock: '10', description: '', isOffer: false, offerDiscount: '', offerType: 'fixed', imageUrl: '' };
  const [np, setNp] = useState<any>(blankProduct);
  const [npFile, setNpFile] = useState<File | null>(null);
  const [nc, setNc] = useState({ name: '', description: '', icon: 'wrench' });
  const [savingSettings, setSavingSettings] = useState(false);

  // ---------- feedback ----------
  const [toasts, setToasts] = useState<{ id: number; type: 'ok' | 'err' | 'info'; msg: string }[]>([]);
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const toast = useCallback((type: 'ok' | 'err' | 'info', msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, type, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // =====================================================================
  // API LAYER
  // =====================================================================
  const clearSession = useCallback(() => {
    setToken(null); setCurrentUser(null); setCart({ items: [] }); setUserOrders([]); setAccountMenu(false);
    setAdmin({ users: [], orders: [], logs: [], stats: null });
    localStorage.removeItem('hardwareToken'); localStorage.removeItem('hardwareUser');
  }, []);

  const api = useCallback(async (path: string, opts: { method?: string; body?: any; form?: FormData } = {}) => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body: any;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, { method: opts.method || 'GET', headers, body });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token) { clearSession(); toast('info', 'Your session expired. Please log in again.'); }
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { message: 'Network error — check your connection and try again.' } };
    }
  }, [token, clearSession, toast]);

  const loadPublic = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`), fetch(`${API_BASE_URL}/api/categories`), fetch(`${API_BASE_URL}/api/settings`).catch(() => null)
      ]);
      if (p.ok) setProducts(await p.json());
      if (c.ok) setCategories(await c.json());
      if (s?.ok) { const d = await s.json(); if (d) setStore((prev: any) => ({ ...prev, ...d })); }
    } catch { toast('err', 'Could not load the catalogue. Please refresh.'); }
    finally { setLoading(false); }
  }, [toast]);

  const loadCart = useCallback(async () => { const r = await api('/api/cart'); if (r.ok) setCart(r.data); }, [api]);
  const loadOrders = useCallback(async () => { const r = await api('/api/orders/my-orders'); if (r.ok) setUserOrders(r.data); }, [api]);
  const loadAdmin = useCallback(async () => {
    const [u, o, l, s] = await Promise.all([api('/api/admin/users'), api('/api/admin/orders'), api('/api/admin/logs'), api('/api/admin/stats')]);
    setAdmin({ users: u.ok ? u.data : [], orders: o.ok ? o.data : [], logs: l.ok ? l.data : [], stats: s.ok ? s.data : null });
  }, [api]);

  useEffect(() => {
    const t = localStorage.getItem('hardwareToken'); const u = localStorage.getItem('hardwareUser');
    if (t && u) { try { setToken(t); setCurrentUser(JSON.parse(u)); } catch { clearSession(); } }
    try { const d = localStorage.getItem('hardwareDelivery'); if (d) setDelivery(JSON.parse(d)); } catch { /* ignore */ }
    loadPublic();
    return () => clearInterval(pollRef.current);
  }, [loadPublic, clearSession]);

  useEffect(() => {
    if (!token) return;
    loadCart();
    if (currentUser?.role === 'admin') loadAdmin(); else loadOrders();
  }, [token, currentUser?.role, loadCart, loadOrders, loadAdmin]);

  useEffect(() => { if (currentUser?.phone && !mpesaPhone) setMpesaPhone(currentUser.phone); }, [currentUser, mpesaPhone]);

  // =====================================================================
  // AUTH
  // =====================================================================
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authForm.password.length < 8 && authMode === 'register') return setAuthError('Password must be at least 8 characters.');
    setAuthBusy(true);
    const r = await api(authMode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body: authForm });
    setAuthBusy(false);
    if (!r.ok) return setAuthError(r.data.message || 'Something went wrong. Please try again.');
    setToken(r.data.token); setCurrentUser(r.data.user);
    localStorage.setItem('hardwareToken', r.data.token); localStorage.setItem('hardwareUser', JSON.stringify(r.data.user));
    setAuthOpen(false); setAuthForm({ fullName: '', email: '', password: '', phone: '' });
    toast('ok', `Welcome${r.data.user.fullName ? `, ${r.data.user.fullName.split(' ')[0]}` : ''}!`);
  };
  const logout = () => { clearSession(); setViewAsShopper(false); toast('info', 'You have been logged out.'); };

  // =====================================================================
  // CART
  // =====================================================================
  const addToCart = async (product: any, quantity = 1) => {
    if (!token) { setAuthMode('login'); setAuthOpen(true); return toast('info', 'Log in to add items to your cart.'); }
    setBusyItem(product._id);
    const r = await api('/api/cart/add', { method: 'POST', body: { productId: product._id, quantity } });
    setBusyItem(null);
    if (r.ok) { setCart(r.data); toast('ok', `Added "${product.name}" to cart`); } else toast('err', r.data.message || 'Could not add item.');
  };
  const setQty = async (productId: string, quantity: number) => {
    setBusyItem(productId);
    const r = await api(`/api/cart/item/${productId}`, { method: 'PUT', body: { quantity } });
    setBusyItem(null);
    if (r.ok) setCart(r.data); else toast('err', r.data.message || 'Could not update cart.');
  };
  const removeItem = async (productId: string) => {
    setBusyItem(productId);
    const r = await api(`/api/cart/item/${productId}`, { method: 'DELETE' });
    setBusyItem(null);
    if (r.ok) setCart(r.data);
  };

  const cartItems: any[] = (cart.items || []).filter((i: any) => i.product);
  const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0);
  const cartTotal = cartItems.reduce((a, i) => a + i.price * i.quantity, 0);

  // =====================================================================
  // CHECKOUT & M-PESA PAYMENT
  // =====================================================================
  const openCheckout = () => {
    if (!cartItems.length) return;
    setCartOpen(false); setCkError('');
    setCk({ open: true, step: 'delivery', orderId: null, tracking: '', receipt: '', reason: '', slow: false, amount: cartTotal });
  };
  const closeCheckout = () => {
    clearInterval(pollRef.current);
    setCk((c) => ({ ...c, open: false }));
    loadCart(); if (currentUser?.role !== 'admin') loadOrders();
  };

  const pollOnce = useCallback(async (orderId: string) => {
    const r = await api(`/api/orders/${orderId}/payment-status`);
    if (!r.ok) return 'pending';
    if (r.data.paymentStatus === 'paid') {
      clearInterval(pollRef.current);
      setCk((c) => ({ ...c, step: 'success', receipt: r.data.receipt || '', tracking: r.data.trackingNumber || c.tracking }));
      loadCart(); loadOrders();
      return 'paid';
    }
    if (r.data.paymentStatus === 'failed') {
      clearInterval(pollRef.current);
      setCk((c) => ({ ...c, step: 'failed', reason: r.data.reason || 'The payment was cancelled or declined.' }));
      return 'failed';
    }
    return 'pending';
  }, [api, loadCart, loadOrders]);

  const startPolling = useCallback((orderId: string) => {
    clearInterval(pollRef.current);
    let n = 0;
    pollRef.current = setInterval(async () => {
      n += 1;
      const s = await pollOnce(orderId);
      if (s === 'pending' && n >= 40) { clearInterval(pollRef.current); setCk((c) => ({ ...c, slow: true })); }
    }, 3000);
  }, [pollOnce]);

  const goPayment = () => {
    setCkError('');
    const d = delivery;
    if (!d.county || !d.town.trim() || !d.specificDetails.trim()) return setCkError('Please choose your county and enter your town and exact delivery address.');
    localStorage.setItem('hardwareDelivery', JSON.stringify(d));
    setCk((c) => ({ ...c, step: 'payment' }));
  };

  const placeOrder = async () => {
    setCkError('');
    const p = normalizePhone(mpesaPhone);
    if (!p) return setCkError('Enter a valid Safaricom M-Pesa number, e.g. 0712 345 678.');
    setCkBusy(true);
    const r = await api('/api/orders', { method: 'POST', body: { shippingAddress: delivery, phone: toLocalPhone(p) } });
    setCkBusy(false);
    if (!r.ok) { if (r.data.orderId) setCk((c) => ({ ...c, orderId: r.data.orderId })); return setCkError(r.data.message || 'Could not place your order.'); }
    setCk((c) => ({ ...c, step: 'waiting', orderId: r.data._id, tracking: r.data.trackingNumber, amount: r.data.totalAmount, slow: false, reason: '' }));
    startPolling(r.data._id);
  };

  const retryPayment = async (orderId: string, phone?: string) => {
    const p = normalizePhone(phone || mpesaPhone);
    if (!p) return setCkError('Enter a valid M-Pesa number first.');
    setCkBusy(true); setCkError('');
    const r = await api(`/api/orders/${orderId}/pay`, { method: 'POST', body: { phone: toLocalPhone(p) } });
    setCkBusy(false);
    if (!r.ok) return setCkError(r.data.message || 'Could not send the payment prompt.');
    setMpesaPhone(toLocalPhone(p));
    setCk({ open: true, step: 'waiting', orderId, tracking: r.data.trackingNumber, receipt: '', reason: '', slow: false, amount: r.data.totalAmount });
    setOrdersOpen(false);
    startPolling(orderId);
  };

  // =====================================================================
  // ADMIN ACTIONS
  // =====================================================================
  const ask = (title: string, message: string, action: () => void) => setConfirmDlg({ title, message, action });

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    const { imageUrl, isOffer, offerDiscount, offerType, ...rest } = np;
    Object.entries(rest).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('isOffer', String(isOffer));
    if (isOffer && offerDiscount) fd.append('offerDiscount', offerType === 'percent' ? `${offerDiscount}%` : String(offerDiscount));
    if (npFile) fd.append('image', npFile); else if (imageUrl) fd.append('imageLink', imageUrl);
    const r = await api('/api/products', { method: 'POST', form: fd });
    if (!r.ok) return toast('err', r.data.message || 'Could not save product.');
    toast('ok', 'Product added'); setNp(blankProduct); setNpFile(null); loadPublic(); loadAdmin();
  };
  const deleteProduct = (p: any) => ask('Delete product?', `"${p.name}" will be permanently removed from the store.`, async () => {
    const r = await api(`/api/products/${p._id}`, { method: 'DELETE' });
    if (r.ok) { toast('ok', 'Product deleted'); loadPublic(); loadAdmin(); } else toast('err', r.data.message || 'Delete failed.');
  });
  const updateStock = async (p: any, stock: number) => {
    if (!Number.isFinite(stock) || stock < 0 || stock === p.stock) return;
    const r = await api(`/api/products/${p._id}`, { method: 'PUT', body: { stock } });
    if (r.ok) { toast('ok', 'Stock updated'); loadPublic(); loadAdmin(); } else toast('err', r.data.message || 'Update failed.');
  };
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api('/api/categories', { method: 'POST', body: nc });
    if (r.ok) { toast('ok', 'Category created'); setNc({ name: '', description: '', icon: 'wrench' }); loadPublic(); } else toast('err', r.data.message || 'Could not create category.');
  };
  const deleteCategory = (c: any) => ask('Delete category?', `"${c.name}" will be removed. Products in it are kept.`, async () => {
    const r = await api(`/api/categories/${c._id}`, { method: 'DELETE' });
    if (r.ok) { toast('ok', 'Category deleted'); loadPublic(); } else toast('err', 'Delete failed.');
  });
  const toggleSuspend = (u: any) => ask(u.isSuspended ? 'Reactivate user?' : 'Suspend user?', `${u.fullName} (${u.email})`, async () => {
    const r = await api(`/api/admin/users/${u._id}/suspend`, { method: 'PUT' });
    if (r.ok) { toast('ok', r.data.message); loadAdmin(); } else toast('err', r.data.message || 'Failed.');
  });
  const setOrderStatus = async (id: string, status: string) => {
    const r = await api(`/api/admin/orders/${id}/status`, { method: 'PUT', body: { status } });
    if (r.ok) { toast('ok', 'Order updated'); loadAdmin(); } else toast('err', r.data.message || 'Update failed.');
  };
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const { _id, __v, ...body } = store;
    const r = await api('/api/settings', { method: 'PUT', body: { ...body, backgroundLink: store.backgroundImage } });
    setSavingSettings(false);
    if (r.ok) toast('ok', 'Store settings saved'); else toast('err', r.data.message || 'Could not save settings.');
  };

  // =====================================================================
  // DERIVED CATALOGUE
  // =====================================================================
  const displayCategories = useMemo(() => {
    if (categories.length) return categories;
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((name) => ({ _id: name, name, icon: name }));
  }, [categories, products]);

  const subsFor = useCallback((cat: string) => Array.from(new Set(products.filter((p) => p.category === cat).map((p) => p.subCategory).filter(Boolean))) as string[], [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.subCategory || '').toLowerCase().includes(q)) &&
      (selCat === 'All' || p.category === selCat) && (selSub === 'All' || p.subCategory === selSub) && (!offersOnly || p.isOffer));
    const by: Record<string, (a: any, b: any) => number> = {
      new: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      low: (a, b) => finalPrice(a) - finalPrice(b),
      high: (a, b) => finalPrice(b) - finalPrice(a),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    return [...list].sort(by[sort]);
  }, [products, search, selCat, selSub, offersOnly, sort]);

  const resetFilters = () => { setSearch(''); setSelCat('All'); setSelSub('All'); setOffersOnly(false); setSort('new'); };
  const activeFilters = selCat !== 'All' || offersOnly || search.trim() !== '';

  const waDigits = (() => { const d = String(store.contactPhone || '').replace(/\D/g, ''); return d.startsWith('0') ? `254${d.slice(1)}` : d; })();
  const themeVars = { '--primary': store.primaryColor, '--on-primary': readableOn(store.primaryColor), '--bg': store.backgroundColor, '--panel': store.panelColor, backgroundColor: store.backgroundColor } as React.CSSProperties;

  // =====================================================================
  // RENDER HELPERS
  // =====================================================================
  const priceBlock = (p: any, big = false) => (
    <div className="flex items-baseline gap-2">
      <span className={`font-black ph-accent ${big ? 'text-2xl' : 'text-base sm:text-lg'}`}>{ksh(finalPrice(p))}</span>
      {p.isOffer && p.offerDiscount > 0 && <span className="text-xs text-slate-500 line-through">{ksh(p.price)}</span>}
    </div>
  );
  const imgProps = (src: string, alt: string) => ({
    src: getImageUrl(src), alt, loading: 'lazy' as const,
    onError: (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }
  });

  const renderCard = (p: any) => {
    const out = p.stock <= 0; const low = p.stock > 0 && p.stock <= 5;
    return (
      <article key={p._id} className="ph-card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-2xl">
        <button onClick={() => { setQuickView(p); setQvQty(1); }} aria-label={`View details for ${p.name}`}
          className="relative flex h-40 items-center justify-center bg-[var(--bg)] p-4 sm:h-52">
          <img {...imgProps(p.image, p.name)} className={`max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105 ${out ? 'opacity-40 grayscale' : ''}`} />
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {p.isOffer && p.offerDiscount > 0 && <span className="flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-black text-white shadow"><Flame size={11} />{offerLabel(p)}</span>}
            {low && <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur">Only {p.stock} left</span>}
            {out && <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-slate-300">Sold out</span>}
          </div>
        </button>
        <div className="flex flex-1 flex-col border-t border-[var(--border)] p-3.5 sm:p-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider ph-accent">{p.subCategory || p.category}</p>
          <h3 className="mb-3 line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-snug text-slate-100 sm:text-sm">{p.name}</h3>
          <div className="mt-auto space-y-3">
            {priceBlock(p)}
            <button onClick={() => addToCart(p)} disabled={out || busyItem === p._id} className="ph-btn w-full !py-2.5 !text-xs">
              {busyItem === p._id ? <Spinner size={14} /> : <ShoppingCart size={14} />}{out ? 'Out of stock' : 'Add to cart'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const renderToasts = () => (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ph-pop pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${t.type === 'ok' ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100' : t.type === 'err' ? 'border-red-500/40 bg-red-950/90 text-red-100' : 'border-slate-600 bg-slate-900/95 text-slate-100'}`}>
          {t.type === 'ok' ? <CheckCircle2 size={18} className="mt-px shrink-0 text-emerald-400" /> : t.type === 'err' ? <AlertCircle size={18} className="mt-px shrink-0 text-red-400" /> : <BadgeCheck size={18} className="mt-px shrink-0 ph-accent" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );

  const renderConfirm = () => (
    <Modal open={!!confirmDlg} onClose={() => setConfirmDlg(null)} size="sm">
      <div className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400"><AlertCircle size={26} /></div>
        <h3 className="text-lg font-extrabold text-white">{confirmDlg?.title}</h3>
        <p className="mt-1.5 text-sm text-slate-400">{confirmDlg?.message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="ph-btn-ghost" onClick={() => setConfirmDlg(null)}>Cancel</button>
          <button className="ph-btn !bg-red-600 !text-white" onClick={() => { const a = confirmDlg?.action; setConfirmDlg(null); a?.(); }}>Confirm</button>
        </div>
      </div>
    </Modal>
  );

  const renderAuth = () => (
    <Modal open={authOpen} onClose={() => setAuthOpen(false)} size="sm">
      <div className="overflow-y-auto p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ph-tint"><Wrench size={24} /></div>
          <h2 className="text-2xl font-black text-white">{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-1 text-sm text-slate-400">{authMode === 'login' ? 'Log in to manage your cart and orders.' : 'Takes less than a minute — pay with M-Pesa.'}</p>
        </div>
        {authError && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{authError}</div>}
        <form onSubmit={submitAuth} className="space-y-4">
          {authMode === 'register' && (
            <>
              <Field label="Full name"><input className="ph-input" required autoComplete="name" value={authForm.fullName} onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })} /></Field>
              <Field label="Phone number" hint="Used for M-Pesa and delivery updates by SMS."><input className="ph-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={authForm.phone} onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })} /></Field>
            </>
          )}
          <Field label="Email address"><input className="ph-input" type="email" required autoComplete="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} /></Field>
          <Field label="Password" hint={authMode === 'register' ? 'At least 8 characters.' : undefined}>
            <div className="relative">
              <input className="ph-input !pr-11" type={showPw ? 'text' : 'password'} required autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </Field>
          <button type="submit" disabled={authBusy} className="ph-btn w-full !py-3">{authBusy && <Spinner />}{authMode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-400">
          {authMode === 'login' ? "New here?" : 'Already registered?'}
          <button className="ml-1.5 font-bold ph-accent hover:underline" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Log in'}</button>
        </p>
      </div>
    </Modal>
  );

  const renderCart = () => (
    <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Your cart${cartCount ? ` (${cartCount})` : ''}`} icon={<ShoppingCart size={20} />} side>
      {!cartItems.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-slate-600"><ShoppingBag size={36} /></div>
          <h3 className="text-lg font-bold text-slate-200">Your cart is empty</h3>
          <p className="max-w-xs text-sm text-slate-500">Browse spare parts, tools and supplies, then check out in seconds with M-Pesa.</p>
          <button className="ph-btn mt-2" onClick={() => setCartOpen(false)}>Start shopping</button>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {cartItems.map((it: any) => (
              <div key={it.product._id} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-3">
                <img {...imgProps(it.product.image, it.product.name)} className="h-20 w-20 shrink-0 rounded-lg bg-[var(--panel)] object-contain p-1.5" />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 text-sm font-bold text-slate-100">{it.product.name}</h4>
                    <button onClick={() => removeItem(it.product._id)} aria-label="Remove item" className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)]">
                      <button aria-label="Decrease quantity" disabled={busyItem === it.product._id} onClick={() => setQty(it.product._id, it.quantity - 1)} className="px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"><Minus size={14} /></button>
                      <span className="min-w-[2rem] text-center text-sm font-bold">{it.quantity}</span>
                      <button aria-label="Increase quantity" disabled={busyItem === it.product._id || it.quantity >= it.product.stock} onClick={() => setQty(it.product._id, it.quantity + 1)} className="px-2.5 py-1.5 text-slate-300 hover:bg-white/5 disabled:opacity-40"><Plus size={14} /></button>
                    </div>
                    <span className="text-sm font-black ph-accent">{ksh(it.price * it.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-[var(--border)] bg-[var(--bg)] p-5">
            <div className="flex items-center justify-between text-slate-300"><span className="text-sm">Subtotal</span><span className="text-xl font-black text-white">{ksh(cartTotal)}</span></div>
            <p className="text-xs text-slate-500">Pay securely with M-Pesa. Delivery is arranged after payment.</p>
            <button onClick={openCheckout} className="ph-btn w-full !py-3.5"><Smartphone size={18} />Checkout with M-Pesa</button>
          </div>
        </>
      )}
    </Modal>
  );

  const stepIndex = ({ delivery: 0, payment: 1, waiting: 2, success: 2, failed: 2 } as Record<string, number>)[ck.step];
  const renderCheckout = () => (
    <Modal open={ck.open} onClose={ck.step === 'waiting' ? () => { /* keep open while paying */ } : closeCheckout} title={ck.step === 'success' ? 'Order confirmed' : 'Secure checkout'} icon={<ShieldCheck size={20} />}>
      <div className="overflow-y-auto">
        {ck.step !== 'success' && (
          <ol className="flex items-center gap-2 px-5 pt-5 text-xs font-bold">
            {['Delivery', 'Payment', 'Confirm'].map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${i <= stepIndex ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-white/10 text-slate-400'}`}>{i < stepIndex ? '✓' : i + 1}</span>
                <span className={i <= stepIndex ? 'text-slate-100' : 'text-slate-500'}>{s}</span>
                {i < 2 && <span className="h-px flex-1 bg-[var(--border)]" />}
              </li>
            ))}
          </ol>
        )}

        {ckError && <div role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{ckError}</div>}

        {ck.step === 'delivery' && (
          <div className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-white"><MapPin size={15} className="ph-accent" />Where should we deliver?</h3>
            <Field label="County *">
              <select className="ph-input" value={delivery.county} onChange={(e) => setDelivery({ ...delivery, county: e.target.value })}>
                <option value="">Select your county</option>
                {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Town / City *"><input className="ph-input" value={delivery.town} onChange={(e) => setDelivery({ ...delivery, town: e.target.value })} placeholder="e.g. Wanguru" /></Field>
              <Field label="Sub-county"><input className="ph-input" value={delivery.subCounty} onChange={(e) => setDelivery({ ...delivery, subCounty: e.target.value })} placeholder="e.g. Mwea East" /></Field>
            </div>
            <Field label="Estate / sub-location"><input className="ph-input" value={delivery.subLocation} onChange={(e) => setDelivery({ ...delivery, subLocation: e.target.value })} /></Field>
            <Field label="Exact address *" hint="Street, building, landmark or workshop name — helps the rider find you."><textarea rows={2} className="ph-input resize-none" value={delivery.specificDetails} onChange={(e) => setDelivery({ ...delivery, specificDetails: e.target.value })} /></Field>
            <button className="ph-btn w-full !py-3" onClick={goPayment}>Continue to payment <ArrowRight size={16} /></button>
          </div>
        )}

        {ck.step === 'payment' && (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Order summary</span><button className="ph-accent normal-case hover:underline" onClick={() => setCk((c) => ({ ...c, step: 'delivery' }))}>Edit delivery</button></div>
              <ul className="max-h-36 space-y-2 overflow-y-auto text-sm">
                {cartItems.map((it: any) => <li key={it.product._id} className="flex justify-between gap-3"><span className="line-clamp-1 text-slate-300">{it.quantity} × {it.product.name}</span><span className="shrink-0 font-semibold text-slate-200">{ksh(it.price * it.quantity)}</span></li>)}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3"><span className="font-bold text-slate-300">Total to pay</span><span className="text-xl font-black ph-accent">{ksh(cartTotal)}</span></div>
              <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><MapPin size={12} className="mt-0.5 shrink-0" />{formatAddress(delivery)}</p>
            </div>
            <Field label="M-Pesa phone number" hint="You will receive an M-Pesa prompt on this number to enter your PIN.">
              <div className="relative"><Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input className="ph-input !pl-10" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} /></div>
            </Field>
            <button className="ph-btn w-full !py-3.5" onClick={placeOrder} disabled={ckBusy}>{ckBusy ? <Spinner /> : <Smartphone size={18} />}Pay {ksh(cartTotal)} with M-Pesa</button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500"><ShieldCheck size={13} />Payments are processed securely by PayHero. We never see your PIN.</p>
          </div>
        )}

        {ck.step === 'waiting' && (
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full ph-tint"><Smartphone size={36} className="animate-pulse" /></div>
            <div>
              <h3 className="text-xl font-black text-white">Check your phone</h3>
              <p className="mt-1.5 text-sm text-slate-400">We sent an M-Pesa prompt for <strong className="text-white">{ksh(ck.amount)}</strong> to <strong className="text-white">{normalizePhone(mpesaPhone) ? toLocalPhone(normalizePhone(mpesaPhone)!) : mpesaPhone}</strong>. Enter your M-Pesa PIN to complete the payment.</p>
            </div>
            {!ck.slow ? (
              <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><Spinner size={16} />Waiting for confirmation…</p>
            ) : (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">Still waiting. If you already paid, tap “Check again”. Otherwise you can resend the prompt.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button className="ph-btn-ghost" onClick={async () => { const s = await pollOnce(ck.orderId!); if (s === 'pending') toast('info', 'Payment not confirmed yet — give it a few seconds.'); }}><RefreshCw size={15} />Check again</button>
              <button className="ph-btn-ghost" disabled={ckBusy} onClick={() => ck.orderId && retryPayment(ck.orderId)}>{ckBusy ? <Spinner size={15} /> : <Smartphone size={15} />}Resend prompt</button>
            </div>
            {ck.slow && <button className="text-xs text-slate-500 underline hover:text-slate-300" onClick={closeCheckout}>Close — I’ll check my orders later</button>}
          </div>
        )}

        {ck.step === 'failed' && (
          <div className="space-y-4 p-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400"><AlertCircle size={32} /></div>
              <h3 className="text-xl font-black text-white">Payment not completed</h3>
              <p className="mt-1.5 text-sm text-slate-400">{ck.reason}</p>
              <p className="mt-1 text-xs text-slate-500">You have not been charged unless you see an M-Pesa confirmation SMS.</p>
            </div>
            <Field label="M-Pesa phone number"><input className="ph-input" type="tel" inputMode="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="0712 345 678" /></Field>
            <button className="ph-btn w-full !py-3" disabled={ckBusy} onClick={() => ck.orderId && retryPayment(ck.orderId)}>{ckBusy ? <Spinner /> : <RefreshCw size={16} />}Try payment again</button>
            <button className="ph-btn-ghost w-full" onClick={closeCheckout}>Back to store</button>
          </div>
        )}

        {ck.step === 'success' && (
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={44} /></div>
            <div>
              <h3 className="text-2xl font-black text-white">Payment received — thank you!</h3>
              <p className="mt-1.5 text-sm text-slate-400">Your order is confirmed and being prepared. We’ve sent you an SMS confirmation.</p>
            </div>
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg)]/60 text-left text-sm">
              <div className="flex items-center justify-between p-3.5"><span className="text-slate-400">Amount paid</span><span className="font-black ph-accent">{ksh(ck.amount)}</span></div>
              {ck.receipt && <div className="flex items-center justify-between p-3.5"><span className="text-slate-400">M-Pesa receipt</span><span className="font-mono font-bold text-white">{ck.receipt}</span></div>}
              <div className="flex items-center justify-between gap-3 p-3.5"><span className="text-slate-400">Tracking number</span><button className="font-mono font-bold text-white hover:underline" title="Copy" onClick={() => { navigator.clipboard?.writeText(ck.tracking); toast('ok', 'Tracking number copied'); }}>{ck.tracking}</button></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="ph-btn-ghost" onClick={() => { closeCheckout(); setOrdersOpen(true); }}><Truck size={16} />Track order</button>
              <button className="ph-btn" onClick={closeCheckout}>Keep shopping</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  const renderOrders = () => (
    <Modal open={ordersOpen} onClose={() => setOrdersOpen(false)} title="My orders" icon={<Truck size={20} />} size="lg">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {userOrders.length === 0 ? (
          <div className="py-14 text-center"><Package size={48} className="mx-auto mb-3 text-slate-700" /><h3 className="text-lg font-bold text-slate-300">No orders yet</h3><p className="mt-1 text-sm text-slate-500">When you place an order, you can follow it here.</p></div>
        ) : userOrders.map((o: any) => {
          const unpaid = o.paymentStatus !== 'paid' && o.status !== 'cancelled';
          return (
            <div key={o._id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-white">{o.trackingNumber || `#${o._id.slice(-8).toUpperCase()}`}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Clock size={12} />{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={PAYMENT_STATUS[o.paymentStatus || 'paid']?.tone}>{PAYMENT_STATUS[o.paymentStatus || 'paid']?.label}</Badge>
                  <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label || o.status}</Badge>
                </div>
              </div>
              <ul className="space-y-2.5">
                {o.items?.map((it: any, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <img {...imgProps(it.product?.image, '')} className="h-10 w-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] object-contain p-1" />
                    <div className="min-w-0 flex-1"><p className="line-clamp-1 font-medium text-slate-200">{it.product?.name || 'Hardware item'}</p><p className="text-xs text-slate-500">Qty {it.quantity}</p></div>
                    <span className="font-bold text-slate-300">{ksh(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--border)] pt-3">
                <p className="flex max-w-[65%] items-start gap-1.5 text-xs text-slate-400"><MapPin size={13} className="mt-0.5 shrink-0" />{formatAddress(o.shippingAddress)}</p>
                <p className="text-right"><span className="block text-xs text-slate-500">Total</span><span className="text-lg font-black ph-accent">{ksh(o.totalAmount)}</span></p>
              </div>
              {unpaid && (
                <button className="ph-btn mt-3 w-full" disabled={ckBusy} onClick={() => retryPayment(o._id, o.payment?.phone ? `0${String(o.payment.phone).slice(3)}` : mpesaPhone)}>{ckBusy ? <Spinner /> : <Smartphone size={16} />}Complete payment</button>
              )}
              {o.trackingHistory?.length > 0 && (
                <details className="group mt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-bold ph-accent"><ChevronRight size={14} className="transition group-open:rotate-90" />Tracking history</summary>
                  <ol className="mt-3 space-y-3 border-l border-[var(--border)] pl-4">
                    {[...o.trackingHistory].reverse().map((h: any, i: number) => (
                      <li key={i} className="relative text-xs"><span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--primary)]" /><p className="font-bold text-slate-200">{h.status}</p><p className="text-slate-500">{h.message}</p><p className="text-[11px] text-slate-600">{formatDate(h.timestamp)}</p></li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );

  const renderQuickView = () => (
    <Modal open={!!quickView} onClose={() => setQuickView(null)} size="lg">
      {quickView && (() => {
        const p = quickView; const out = p.stock <= 0;
        return (
          <div className="grid overflow-y-auto sm:grid-cols-2">
            <div className="relative flex min-h-[16rem] items-center justify-center bg-[var(--bg)] p-6">
              <img {...imgProps(p.image, p.name)} className="max-h-72 max-w-full object-contain" />
              {p.isOffer && p.offerDiscount > 0 && <span className="absolute left-4 top-4 flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-xs font-black text-white"><Flame size={13} />{offerLabel(p)}</span>}
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[11px] font-bold uppercase tracking-wider ph-accent">{p.category} · {p.subCategory}</p><h2 className="mt-1 text-xl font-black leading-snug text-white">{p.name}</h2></div>
                <button onClick={() => setQuickView(null)} aria-label="Close" className="rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
              </div>
              {priceBlock(p, true)}
              <p className="text-sm leading-relaxed text-slate-400">{p.description || 'Quality hardware, delivered across Kenya.'}</p>
              <div>{out ? <Badge tone="red">Out of stock</Badge> : p.stock <= 5 ? <Badge tone="amber">Only {p.stock} left</Badge> : <Badge tone="green">In stock</Badge>}</div>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <div className="flex items-center overflow-hidden rounded-xl border border-[var(--border)]">
                  <button aria-label="Decrease" className="px-3 py-3 hover:bg-white/5" onClick={() => setQvQty(Math.max(1, qvQty - 1))}><Minus size={15} /></button>
                  <span className="min-w-[2.5rem] text-center font-bold">{qvQty}</span>
                  <button aria-label="Increase" className="px-3 py-3 hover:bg-white/5" onClick={() => setQvQty(Math.min(p.stock || 1, qvQty + 1))}><Plus size={15} /></button>
                </div>
                <button className="ph-btn flex-1 !py-3" disabled={out || busyItem === p._id} onClick={async () => { await addToCart(p, qvQty); setQuickView(null); }}>{busyItem === p._id ? <Spinner /> : <ShoppingCart size={17} />}Add to cart</button>
              </div>
            </div>
          </div>
        );
      })()}
    </Modal>
  );

  // =====================================================================
  // ADMIN PANEL
  // =====================================================================
  const th = 'p-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500';
  const NAV: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <Layers size={18} />, label: 'Dashboard' }, { id: 'orders', icon: <ShoppingCart size={18} />, label: 'Orders' },
    { id: 'products', icon: <Box size={18} />, label: 'Products' }, { id: 'categories', icon: <Tags size={18} />, label: 'Categories' },
    { id: 'users', icon: <Users size={18} />, label: 'Customers' }, { id: 'logs', icon: <Activity size={18} />, label: 'Activity' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' }
  ];
  const describeLog = (l: any) => l.desc || Object.entries(l.details || {}).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');

  const renderAdmin = () => {
    const st = admin.stats;
    const catSubs = [...new Set([...(displayCategories.find((c: any) => c.name === np.category)?.subCategories || []), ...subsFor(np.category)])];
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel)]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-300 hover:bg-white/5 lg:hidden" aria-label="Menu" onClick={() => setAdminNav(true)}><Menu size={22} /></button>
            <h1 className="flex items-center gap-2 text-lg font-black text-white"><Wrench size={20} className="ph-accent" /><span className="line-clamp-1">{store.storeName}</span><Badge tone="amber">Admin</Badge></h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="ph-btn-ghost !px-3 !py-2" onClick={() => setViewAsShopper(true)}><Store size={16} /><span className="hidden sm:inline">View store</span></button>
            <button className="ph-btn-ghost !px-3 !py-2 hover:!border-red-500/40 hover:!text-red-300" onClick={logout}><LogOut size={16} /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </header>
        <div className="flex">
          {adminNav && <div className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden" onClick={() => setAdminNav(false)} />}
          <aside className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-[var(--border)] bg-[var(--panel)] p-4 transition-transform lg:sticky lg:top-[57px] lg:z-0 lg:h-[calc(100vh-57px)] lg:translate-x-0 ${adminNav ? 'translate-x-0' : '-translate-x-full'}`}>
            <nav className="space-y-1">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => { setTab(n.id); setAdminNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${tab === n.id ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}>
                  {n.icon}{n.label}
                  {n.id === 'orders' && admin.orders.filter((o: any) => o.status === 'processing').length > 0 && <span className="ml-auto rounded-full bg-white/20 px-2 text-[11px]">{admin.orders.filter((o: any) => o.status === 'processing').length}</span>}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-black text-white">{NAV.find((n) => n.id === tab)?.label}</h2><button className="ph-btn-ghost !px-3 !py-2" onClick={() => { loadAdmin(); loadPublic(); }}><RefreshCw size={15} />Refresh</button></div>

            {tab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
                  {[
                    { l: 'Revenue (paid)', v: ksh(st?.revenue || 0), i: <TrendingUp size={18} /> }, { l: 'Paid orders', v: st?.paidOrders ?? 0, i: <CheckCircle2 size={18} /> },
                    { l: 'All orders', v: st?.orders ?? admin.orders.length, i: <ShoppingCart size={18} /> }, { l: 'Products', v: st?.products ?? products.length, i: <Box size={18} /> },
                    { l: 'Customers', v: st?.users ?? admin.users.length, i: <Users size={18} /> }
                  ].map((s) => (
                    <div key={s.l} className="ph-card p-4 sm:p-5"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl ph-tint">{s.i}</div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.l}</p><p className="mt-1 text-xl font-black text-white sm:text-2xl">{s.v}</p></div>
                  ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="ph-card p-5">
                    <h3 className="mb-4 font-extrabold text-white">Recent orders</h3>
                    {admin.orders.length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : (
                      <ul className="divide-y divide-[var(--border)]">
                        {admin.orders.slice(0, 6).map((o: any) => (
                          <li key={o._id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><p className="line-clamp-1 font-semibold text-slate-200">{o.user?.fullName || 'Customer'}</p><p className="font-mono text-xs text-slate-500">{o.trackingNumber}</p></div><div className="flex items-center gap-2"><Badge tone={PAYMENT_STATUS[o.paymentStatus || 'paid']?.tone}>{PAYMENT_STATUS[o.paymentStatus || 'paid']?.label}</Badge><span className="font-black ph-accent">{ksh(o.totalAmount)}</span></div></li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="ph-card p-5">
                    <h3 className="mb-4 font-extrabold text-white">Low stock</h3>
                    {!st?.lowStock?.length ? <p className="text-sm text-slate-500">All products are well stocked.</p> : (
                      <ul className="divide-y divide-[var(--border)]">{st.lowStock.map((p: any) => <li key={p._id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="line-clamp-1 text-slate-200">{p.name}</span><Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge></li>)}</ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="ph-card overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead><tr className="border-b border-[var(--border)]"><th className={th}>Order</th><th className={th}>Customer & delivery</th><th className={th}>Total</th><th className={th}>Payment</th><th className={th}>Status</th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {admin.orders.map((o: any) => (
                      <tr key={o._id} className="align-top hover:bg-white/[.02]">
                        <td className="p-3"><p className="font-mono text-xs font-bold text-white">{o.trackingNumber || o._id.slice(-8)}</p><p className="mt-0.5 text-[11px] text-slate-500">{formatDate(o.createdAt)}</p><p className="mt-0.5 text-[11px] text-slate-500">{o.items?.length || 0} item(s)</p></td>
                        <td className="max-w-xs p-3"><p className="font-semibold text-slate-100">{o.user?.fullName}</p><p className="text-xs text-slate-500">{o.payment?.phone || o.user?.phone}</p><p className="mt-1 text-xs text-slate-400">{formatAddress(o.shippingAddress)}</p></td>
                        <td className="p-3 font-black ph-accent">{ksh(o.totalAmount)}</td>
                        <td className="p-3"><Badge tone={PAYMENT_STATUS[o.paymentStatus || 'paid']?.tone}>{PAYMENT_STATUS[o.paymentStatus || 'paid']?.label}</Badge>{o.payment?.mpesaReceipt && <p className="mt-1 font-mono text-[11px] text-slate-500">{o.payment.mpesaReceipt}</p>}</td>
                        <td className="p-3">
                          <select value={o.status} onChange={(e) => setOrderStatus(o._id, e.target.value)} className="ph-input !w-auto !py-1.5 !text-xs">
                            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k} disabled={o.paymentStatus === 'pending' && ['processing', 'shipped', 'delivered'].includes(k)}>{v.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {admin.orders.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No orders yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'products' && (
              <div className="grid items-start gap-6 xl:grid-cols-3">
                <form onSubmit={addProduct} className="ph-card space-y-3.5 p-5 xl:sticky xl:top-[80px]">
                  <h3 className="flex items-center gap-2 font-extrabold text-white"><Plus size={18} className="ph-accent" />Add product</h3>
                  <input className="ph-input" placeholder="Product name" required value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="ph-input" type="number" min="0" placeholder="Price (Ksh)" required value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} />
                    <input className="ph-input" type="number" min="0" placeholder="Stock" required value={np.stock} onChange={(e) => setNp({ ...np, stock: e.target.value })} />
                  </div>
                  <select className="ph-input" required value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value, subCategory: '' })}>
                    <option value="">Select category</option>{displayCategories.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                  </select>
                  <input className="ph-input" list="subcats" placeholder="Sub-category" required value={np.subCategory} onChange={(e) => setNp({ ...np, subCategory: e.target.value })} />
                  <datalist id="subcats">{catSubs.map((s: any) => <option key={s} value={s} />)}</datalist>
                  <textarea className="ph-input resize-none" rows={3} placeholder="Description" value={np.description} onChange={(e) => setNp({ ...np, description: e.target.value })} />
                  <div className="space-y-2.5 rounded-xl border border-[var(--border)] p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-bold ph-accent"><input type="checkbox" checked={np.isOffer} onChange={(e) => setNp({ ...np, isOffer: e.target.checked })} />Special offer</label>
                    {np.isOffer && <div className="grid grid-cols-[1fr_auto] gap-2"><input className="ph-input" type="number" min="0" placeholder="Discount" value={np.offerDiscount} onChange={(e) => setNp({ ...np, offerDiscount: e.target.value })} /><select className="ph-input !w-auto" value={np.offerType} onChange={(e) => setNp({ ...np, offerType: e.target.value })}><option value="fixed">Ksh off</option><option value="percent">% off</option></select></div>}
                  </div>
                  <div className="space-y-2.5 rounded-xl border border-[var(--border)] p-3">
                    <p className="text-xs font-bold text-slate-400">Image — upload or paste a link</p>
                    <div className="flex items-center gap-2"><ImageIcon size={16} className="shrink-0 text-slate-500" /><input type="file" accept="image/*" onChange={(e) => setNpFile(e.target.files?.[0] || null)} className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" /></div>
                    <div className="flex items-center gap-2"><LinkIcon size={16} className="shrink-0 text-slate-500" /><input className="ph-input !py-2 !text-xs" type="url" placeholder="https://…" value={np.imageUrl} onChange={(e) => setNp({ ...np, imageUrl: e.target.value })} /></div>
                  </div>
                  <button type="submit" className="ph-btn w-full">Save product</button>
                </form>
                <div className="ph-card overflow-x-auto xl:col-span-2">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="border-b border-[var(--border)]"><th className={th}>Product</th><th className={th}>Price</th><th className={th}>Stock</th><th className={th} /></tr></thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {products.map((p: any) => (
                        <tr key={p._id} className="hover:bg-white/[.02]">
                          <td className="p-3"><div className="flex items-center gap-3"><img {...imgProps(p.image, '')} className="h-11 w-11 rounded-lg border border-[var(--border)] bg-[var(--bg)] object-contain p-1" /><div className="min-w-0"><p className="line-clamp-1 font-semibold text-slate-100">{p.name}</p><p className="text-[11px] text-slate-500">{p.category} · {p.subCategory}</p></div></div></td>
                          <td className="p-3">{priceBlock(p)}{p.isOffer && p.offerDiscount > 0 && <Badge tone="red">{offerLabel(p)}</Badge>}</td>
                          <td className="p-3"><input key={`${p._id}-${p.stock}`} type="number" min="0" defaultValue={p.stock} onBlur={(e) => updateStock(p, parseInt(e.target.value, 10))} aria-label={`Stock for ${p.name}`} className={`ph-input !w-20 !py-1.5 text-center !text-xs ${p.stock <= 5 ? '!border-red-500/50' : ''}`} /></td>
                          <td className="p-3 text-right"><button onClick={() => deleteProduct(p)} aria-label={`Delete ${p.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'categories' && (
              <div className="grid gap-6 md:grid-cols-2">
                <form onSubmit={addCategory} className="ph-card space-y-3.5 p-5">
                  <h3 className="font-extrabold text-white">Add category</h3>
                  <input className="ph-input" placeholder="Category name" required value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} />
                  <input className="ph-input" placeholder="Short description" value={nc.description} onChange={(e) => setNc({ ...nc, description: e.target.value })} />
                  <select className="ph-input" value={nc.icon} onChange={(e) => setNc({ ...nc, icon: e.target.value })}><option value="wrench">Wrench — tools</option><option value="car">Car — vehicle parts</option><option value="bike">Bike — motorcycle</option><option value="hammer">Hammer — building</option><option value="zap">Zap — electrical</option></select>
                  <button className="ph-btn w-full" type="submit">Save category</button>
                </form>
                <div className="ph-card p-5"><h3 className="mb-4 font-extrabold text-white">Current categories</h3>
                  <ul className="space-y-2">{displayCategories.map((c: any) => <li key={c._id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><span className="ph-accent">{getIcon(c.icon || c.name)}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{c.name}</p><p className="line-clamp-1 text-xs text-slate-500">{c.description}</p></div>{categories.length > 0 && <button onClick={() => deleteCategory(c)} aria-label={`Delete ${c.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={16} /></button>}</li>)}</ul>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="ph-card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-[var(--border)]"><th className={th}>Name</th><th className={th}>Contact</th><th className={th}>Role</th><th className={th}>Status</th><th className={th} /></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {admin.users.map((u: any) => (
                      <tr key={u._id} className="hover:bg-white/[.02]"><td className="p-3 font-semibold text-slate-100">{u.fullName}</td><td className="p-3 text-xs text-slate-400"><p>{u.email}</p><p>{u.phone}</p></td><td className="p-3"><Badge tone={u.role === 'admin' ? 'blue' : 'slate'}>{u.role}</Badge></td><td className="p-3"><Badge tone={u.isSuspended ? 'red' : 'green'}>{u.isSuspended ? 'Suspended' : 'Active'}</Badge></td><td className="p-3 text-right">{u.role !== 'admin' && <button className="ph-btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => toggleSuspend(u)}>{u.isSuspended ? 'Reactivate' : 'Suspend'}</button>}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'logs' && (
              <div className="ph-card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-[var(--border)]"><th className={th}>When</th><th className={th}>Event</th><th className={th}>Details</th><th className={th}>User</th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {admin.logs.map((l: any, i: number) => (
                      <tr key={l._id || i} className="align-top hover:bg-white/[.02]"><td className="whitespace-nowrap p-3 text-xs text-slate-500">{formatDate(l.timestamp)}</td><td className="p-3"><Badge tone={/PAYMENT_SUCCESS|TRANSACTION/.test(l.actionType || l.type || '') ? 'green' : /FAIL|MISMATCH|SUSPEND/.test(l.actionType || '') ? 'red' : 'purple'}>{(l.actionType || l.type || '').replace(/_/g, ' ')}</Badge></td><td className="max-w-md break-words p-3 text-xs text-slate-300">{describeLog(l)}</td><td className="p-3 text-xs text-slate-400">{l.user?.fullName || l.user?.email || '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'settings' && (
              <form onSubmit={saveSettings} className="ph-card grid max-w-4xl gap-5 p-5 sm:p-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Field label="Store name"><input className="ph-input" value={store.storeName || ''} onChange={(e) => setStore({ ...store, storeName: e.target.value })} /></Field>
                  <Field label="Tagline"><input className="ph-input" value={store.tagline || ''} onChange={(e) => setStore({ ...store, tagline: e.target.value })} /></Field>
                  <Field label="Hero headline"><input className="ph-input" value={store.heroTitle || ''} onChange={(e) => setStore({ ...store, heroTitle: e.target.value })} /></Field>
                  <Field label="Hero sub-headline"><input className="ph-input" value={store.heroSubtitle || ''} onChange={(e) => setStore({ ...store, heroSubtitle: e.target.value })} /></Field>
                  <Field label="Hero background image link"><input className="ph-input" type="url" placeholder="https://…" value={store.backgroundImage || ''} onChange={(e) => setStore({ ...store, backgroundImage: e.target.value })} /></Field>
                </div>
                <div className="space-y-4">
                  {([['primaryColor', 'Accent colour'], ['backgroundColor', 'Page background'], ['panelColor', 'Card / panel colour']] as const).map(([k, label]) => (
                    <Field key={k} label={label}><div className="flex gap-3"><input type="color" value={store[k]} onChange={(e) => setStore({ ...store, [k]: e.target.value })} className="h-11 w-12 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent" /><input className="ph-input" value={store[k]} onChange={(e) => setStore({ ...store, [k]: e.target.value })} /></div></Field>
                  ))}
                  <Field label="Contact phone"><input className="ph-input" value={store.contactPhone || ''} onChange={(e) => setStore({ ...store, contactPhone: e.target.value })} /></Field>
                  <Field label="Contact email"><input className="ph-input" type="email" value={store.contactEmail || ''} onChange={(e) => setStore({ ...store, contactEmail: e.target.value })} /></Field>
                </div>
                <div className="md:col-span-2"><button className="ph-btn w-full !py-3.5" disabled={savingSettings}>{savingSettings && <Spinner />}Save settings</button></div>
              </form>
            )}
          </main>
        </div>
      </div>
    );
  };

  // =====================================================================
  // STOREFRONT
  // =====================================================================
  const renderStore = () => (
    <>
      {currentUser?.role === 'admin' && viewAsShopper && (
        <div className="flex items-center justify-center gap-3 bg-[var(--primary)] px-4 py-2 text-xs font-bold text-[var(--on-primary)]">Previewing the storefront as a shopper<button className="rounded-md bg-black/20 px-2.5 py-1" onClick={() => setViewAsShopper(false)}>Back to admin</button></div>
      )}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--panel)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:h-[72px]">
          <a href="#top" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]"><Wrench size={22} /></span>
            <span className="min-w-0"><span className="block truncate text-base font-black leading-tight text-white sm:text-xl">{store.storeName}</span><span className="hidden truncate text-[11px] text-slate-400 sm:block">{store.tagline}</span></span>
          </a>
          <div className="relative hidden max-w-xl flex-1 md:block">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="ph-input !rounded-xl !py-3 !pl-10" type="search" placeholder="Search parts, tools, electricals…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => setCartOpen(true)} aria-label={`Cart, ${cartCount} items`} className="relative rounded-xl p-2.5 text-slate-200 transition hover:bg-white/5">
              <ShoppingCart size={23} />
              {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-[var(--panel)] bg-[var(--primary)] px-1 text-[10px] font-black text-[var(--on-primary)]">{cartCount}</span>}
            </button>
            {currentUser ? (
              <div className="relative">
                <button onClick={() => setAccountMenu(!accountMenu)} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold hover:bg-white/5" aria-haspopup="menu" aria-expanded={accountMenu}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full ph-tint text-xs font-black">{currentUser.fullName?.[0]?.toUpperCase() || 'U'}</span>
                  <span className="hidden max-w-[7rem] truncate sm:block">{currentUser.fullName?.split(' ')[0]}</span><ChevronDown size={15} className="text-slate-400" />
                </button>
                {accountMenu && (<>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountMenu(false)} />
                  <div role="menu" className="ph-pop ph-card absolute right-0 z-50 mt-2 w-56 overflow-hidden p-1.5 shadow-2xl">
                    <div className="px-3 py-2"><p className="truncate text-sm font-bold text-white">{currentUser.fullName}</p><p className="truncate text-xs text-slate-500">{currentUser.email}</p></div>
                    <button role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => { setAccountMenu(false); setOrdersOpen(true); loadOrders(); }}><Truck size={16} className="ph-accent" />My orders</button>
                    {currentUser.role === 'admin' && <button role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5" onClick={() => { setAccountMenu(false); setViewAsShopper(false); }}><ShieldCheck size={16} className="ph-accent" />Admin panel</button>}
                    <button role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10" onClick={() => { setAccountMenu(false); logout(); }}><LogOut size={16} />Log out</button>
                  </div>
                </>)}
              </div>
            ) : (
              <button onClick={() => { setAuthMode('login'); setAuthOpen(true); }} className="ph-btn !px-4 !py-2.5"><UserIcon size={17} /><span className="hidden sm:inline">Log in</span></button>
            )}
          </div>
        </div>
        <div className="border-t border-[var(--border)] p-3 md:hidden"><div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" /><input className="ph-input !pl-10" type="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" /></div></div>
      </header>

      <div id="top" className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 sm:pt-6">
        {/* HERO */}
        <section className="relative mb-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)]">
          {store.backgroundImage && <img src={getImageUrl(store.backgroundImage)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/85 to-transparent" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--primary)' }} />
          <div className="relative z-10 max-w-2xl px-6 py-10 sm:px-10 sm:py-14">
            <span className="ph-tint mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"><ShieldCheck size={13} />Genuine parts · Pay with M-Pesa</span>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">{store.heroTitle}</h2>
            <p className="mt-3 max-w-lg text-sm text-slate-300 sm:text-base">{store.heroSubtitle || store.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#catalogue" className="ph-btn !px-6 !py-3.5">Shop the catalogue <ChevronRight size={17} /></a>
              <button className="ph-btn-ghost !px-5 !py-3.5" onClick={() => { setOffersOnly(true); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }); }}><Flame size={16} className="ph-accent" />Hot offers</button>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{ i: <Smartphone size={20} />, t: 'Pay with M-Pesa', s: 'Fast, secure STK push' }, { i: <Truck size={20} />, t: 'Delivery nationwide', s: 'All 47 counties' }, { i: <BadgeCheck size={20} />, t: 'Genuine products', s: 'Quality you can trust' }, { i: <Headphones size={20} />, t: 'Friendly support', s: 'Call or WhatsApp us' }].map((x) => (
            <div key={x.t} className="ph-card flex items-center gap-3 p-3.5 sm:p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ph-tint">{x.i}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{x.t}</p><p className="truncate text-xs text-slate-500">{x.s}</p></div></div>
          ))}
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* DESKTOP SIDEBAR */}
          <aside className="ph-card hidden w-72 shrink-0 p-3 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <p className="px-3 pb-2 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Browse catalogue</p>
            <button onClick={() => { setSelCat('All'); setSelSub('All'); }} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${selCat === 'All' ? 'ph-tint' : 'text-slate-300 hover:bg-white/5'}`}><ShoppingBag size={18} />All products<span className="ml-auto text-xs opacity-60">{products.length}</span></button>
            {displayCategories.map((c: any) => {
              const subs = subsFor(c.name); const active = selCat === c.name;
              return (
                <div key={c._id}>
                  <button onClick={() => { setSelCat(active && selSub === 'All' ? 'All' : c.name); setSelSub('All'); }} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-bold transition ${active ? 'ph-tint' : 'text-slate-300 hover:bg-white/5'}`}>
                    {getIcon(c.icon || c.name, 18)}<span className="flex-1">{c.name}</span>{subs.length > 0 && <ChevronDown size={15} className={`transition ${active ? 'rotate-180' : ''}`} />}
                  </button>
                  {active && subs.length > 0 && <div className="ml-6 mt-1 space-y-0.5 border-l border-[var(--border)] pl-3">{subs.map((s) => <button key={s} onClick={() => setSelSub(s)} className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${selSub === s ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{s}</button>)}</div>}
                </div>
              );
            })}
            <button onClick={() => setOffersOnly(!offersOnly)} className={`mt-4 flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-bold transition ${offersOnly ? 'border-transparent bg-[var(--primary)] text-[var(--on-primary)]' : 'border-[var(--border)] text-slate-300 hover:bg-white/5'}`}><Flame size={18} className={offersOnly ? '' : 'text-red-400'} />Special offers</button>
          </aside>

          <main id="catalogue" className="min-w-0 flex-1 scroll-mt-24">
            {/* MOBILE CATEGORY CHIPS */}
            <div className="ph-hide-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
              {['All', ...displayCategories.map((c: any) => c.name)].map((n: string) => <button key={n} onClick={() => { setSelCat(n); setSelSub('All'); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${selCat === n ? 'ph-tint' : 'border-[var(--border)] text-slate-300'}`}>{n}</button>)}
            </div>
            {selCat !== 'All' && subsFor(selCat).length > 0 && (
              <div className="ph-hide-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0 lg:hidden">
                {['All', ...subsFor(selCat)].map((s) => <button key={s} onClick={() => setSelSub(s)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${selSub === s ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400'}`}>{s}</button>)}
              </div>
            )}

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div><h2 className="text-xl font-black text-white sm:text-2xl">{selSub !== 'All' ? selSub : selCat === 'All' ? 'All products' : selCat}</h2><p className="mt-0.5 text-xs text-slate-500">{loading ? 'Loading…' : `${filtered.length} item${filtered.length === 1 ? '' : 's'}`}{offersOnly && ' · special offers'}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setOffersOnly(!offersOnly)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition lg:hidden ${offersOnly ? 'ph-tint' : 'border-[var(--border)] text-slate-300'}`}><Flame size={14} />Offers</button>
                <label className="flex items-center gap-2 text-xs text-slate-400"><SlidersHorizontal size={15} /><span className="sr-only">Sort by</span>
                  <select className="ph-input !w-auto !py-2 !text-xs" value={sort} onChange={(e) => setSort(e.target.value as any)}><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option></select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="ph-card overflow-hidden"><div className="ph-skel h-40 sm:h-52" /><div className="space-y-3 p-4"><div className="ph-skel h-3 w-1/3 rounded" /><div className="ph-skel h-4 w-full rounded" /><div className="ph-skel h-9 w-full rounded-xl" /></div></div>)}</div>
            ) : filtered.length === 0 ? (
              <div className="ph-card px-6 py-20 text-center"><Box size={56} className="mx-auto mb-4 text-slate-700" /><h3 className="text-xl font-bold text-slate-200">No products found</h3><p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">Try a different search term or category.</p>{activeFilters && <button className="ph-btn-ghost mx-auto mt-6" onClick={resetFilters}><X size={15} />Clear filters</button>}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">{filtered.map(renderCard)}</div>
            )}
          </main>
        </div>
      </div>

      <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition hover:scale-110"><MessageCircle size={28} /></a>

      <footer className="border-t border-[var(--border)] bg-[var(--panel)]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 md:grid-cols-3">
          <div><h3 className="flex items-center gap-2 text-lg font-black text-white"><Wrench size={20} className="ph-accent" />{store.storeName}</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">{store.tagline}</p></div>
          <div><h3 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-slate-300">Shop</h3><ul className="space-y-2.5 text-sm text-slate-400">{displayCategories.slice(0, 5).map((c: any) => <li key={c._id}><button className="transition hover:text-white" onClick={() => { setSelCat(c.name); setSelSub('All'); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }); }}>{c.name}</button></li>)}<li><button className="flex items-center gap-1.5 transition hover:text-white" onClick={() => { setOffersOnly(true); document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth' }); }}><Flame size={13} className="ph-accent" />Special offers</button></li></ul></div>
          <div><h3 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-slate-300">Contact</h3><ul className="space-y-3 text-sm text-slate-400"><li><a className="flex items-center gap-3 hover:text-white" href={`tel:${String(store.contactPhone).replace(/\s/g, '')}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5"><Phone size={16} /></span>{store.contactPhone}</a></li><li><a className="flex items-center gap-3 hover:text-white" href={`mailto:${store.contactEmail}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5"><Mail size={16} /></span>{store.contactEmail}</a></li><li><a className="flex items-center gap-3 hover:text-white" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5"><ExternalLink size={16} /></span>Chat on WhatsApp</a></li></ul></div>
        </div>
        <div className="border-t border-[var(--border)] py-5 text-center text-xs text-slate-500">&copy; {new Date().getFullYear()} {store.storeName}. All rights reserved. · Secure payments by M-Pesa</div>
      </footer>
    </>
  );

  // =====================================================================
  // ROOT
  // =====================================================================
  const showAdmin = currentUser?.role === 'admin' && !viewAsShopper;
  return (
    <div className="ph-root min-h-screen" style={themeVars}>
      <style>{GLOBAL_CSS}</style>
      {showAdmin ? renderAdmin() : renderStore()}
      {renderQuickView()}
      {renderCart()}
      {renderCheckout()}
      {renderOrders()}
      {renderAuth()}
      {renderConfirm()}
      {renderToasts()}
    </div>
  );
}
