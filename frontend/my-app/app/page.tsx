'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, User as UserIcon, Menu, X, MessageCircle, 
  Plus, Package, Settings, LogOut, Wrench, Car, Bike, Hammer, Zap, 
  Trash2, Edit, AlertCircle, CheckCircle, Users, ShoppingBag, Gift,
  Flame, Filter, Layers, ChevronDown, ShieldCheck, Box, Activity, 
  MapPin, Link as LinkIcon, Clock, ChevronRight, Image as ImageIcon
} from 'lucide-react';

// --- API CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hardware-sales.onrender.com';

// --- KENYA COUNTIES DATA ---
const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", 
  "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", 
  "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", 
  "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", 
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", 
  "Tharaka-Nithi", "Trans-Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"
];

// --- HELPER TO FORMAT IMAGE URLS ---
const getImageUrl = (url: string) => {
  if (!url) return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600";
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url}`;
};

// --- ICON MAPPER FOR CATEGORIES ---
const getIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'car': 
    case 'vehicle spare parts': return <Car size={20} />;
    case 'bike': 
    case 'motorcycle & motorbike parts': return <Bike size={20} />;
    case 'hammer': 
    case 'power & hand tools': return <Hammer size={20} />;
    case 'zap': 
    case 'electrical & solar': return <Zap size={20} />;
    case 'building & plumbing supplies': return <Package size={20} />;
    default: return <Wrench size={20} />;
  }
};

export default function ProHardwareApp() {
  // --- APPLICATION STATE ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({
    storeName: "ProHardware & Auto Spares",
    tagline: "Your #1 Store for Vehicle Parts, Motorbikes & Tools",
    heroTitle: "Heavy Duty Hardware",
    primaryColor: "#d97706", // Amber 600
    backgroundColor: "#020617", // Slate 950
    panelColor: "#0f172a", // Slate 900
    contactPhone: "+254 700 000 000",
    layoutStyle: "grid"
  });
  
  // --- USER & AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", password: "", phone: "" });

  // --- SHOPPING CART & ORDERS ---
  const [cart, setCart] = useState<any>({ items: [] });
  const [showCart, setShowCart] = useState(false);
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  
  // Comprehensive Location State
  const [checkoutLocation, setCheckoutLocation] = useState({
    county: "", subCounty: "", subLocation: "", town: "", exactAddress: ""
  });

  // --- ADMIN STATE ---
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard'|'products'|'categories'|'users'|'orders'|'settings'|'logs'>('dashboard');
  const [adminData, setAdminData] = useState({ users: [], orders: [], logs: [] });
  const [newProduct, setNewProduct] = useState({ 
    name: "", category: "", subCategory: "", price: "", stock: "10", description: "", 
    isOffer: false, offerDiscount: "", imageUrl: "" 
  });
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", icon: "wrench" });

  // --- UI & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const savedToken = localStorage.getItem('hardwareToken');
    const savedUser = localStorage.getItem('hardwareUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (token) {
      fetchCart();
      if (currentUser?.role === 'admin') {
        fetchAdminData();
      } else {
        fetchUserOrders();
      }
    }
  }, [token, currentUser?.role]);

  // --- FETCHERS ---
  const fetchInitialData = async () => {
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/settings`).catch(() => null)
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (setRes && setRes.ok) {
        const settings = await setRes.json();
       setStoreSettings((prev: any) => ({...prev, ...settings}));
      }
    } catch (err) { console.error("Error fetching initial data", err); }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setCart(await res.json());
    } catch (err) { console.error("Error fetching cart", err); }
  };

  const fetchUserOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/me`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setUserOrders(await res.json());
    } catch (err) { console.error("Error fetching user orders", err); }
  };

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [usersRes, ordersRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/orders`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/logs`, { headers }).catch(() => null)
      ]);
      
      const users = usersRes.ok ? await usersRes.json() : [];
      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const logs = logsRes?.ok ? await logsRes.json() : generateMockLogs(users, orders);
      
      setAdminData({ users, orders, logs });
    } catch (err) { console.error("Admin data fetch failed", err); }
  };

  // Generate mock logs if backend endpoint doesn't exist yet
  const generateMockLogs = (users: any[], orders: any[]) => {
    const logs: any[] = [];
    users.forEach(u => logs.push({ type: 'Account Creation', desc: `New user registered: ${u.fullName} (${u.email})`, timestamp: u.createdAt || new Date().toISOString(), user: u }));
    orders.forEach(o => logs.push({ type: 'Transaction', desc: `Order #${o._id.substring(0,8)} placed for Ksh ${o.totalAmount}`, timestamp: o.createdAt || new Date().toISOString(), user: o.user }));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // --- AUTHENTICATION ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('hardwareToken', data.token);
        localStorage.setItem('hardwareUser', JSON.stringify(data.user));
        setShowAuthModal(false);
        setAuthForm({ fullName: "", email: "", password: "", phone: "" });
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (err) { alert("Server connection error"); }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setCart({ items: [] });
    setUserOrders([]);
    localStorage.removeItem('hardwareToken');
    localStorage.removeItem('hardwareUser');
  };

  // --- CART & ORDERS ACTIONS ---
  const handleAddToCart = async (product: any) => {
    if (!token) return setShowAuthModal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ productId: product._id, quantity: 1 })
      });
      if (res.ok) setCart(await res.json());
    } catch (err) { alert("Failed to add item."); }
  };

  const handleRemoveFromCart = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/item/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCart(await res.json());
    } catch (err) { alert("Failed to remove item."); }
  };

  const handleCheckout = async () => {
    if (!checkoutLocation.county || !checkoutLocation.town || !checkoutLocation.exactAddress) {
      return alert("Please fill in all mandatory location details (County, Town, Address).");
    }
    const fullAddress = `${checkoutLocation.exactAddress}, ${checkoutLocation.town}, ${checkoutLocation.subLocation ? checkoutLocation.subLocation + ', ' : ''}${checkoutLocation.subCounty ? checkoutLocation.subCounty + ', ' : ''}${checkoutLocation.county} County`;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shippingAddress: fullAddress })
      });
      if (res.ok) {
        alert("Order placed successfully!");
        setCart({ items: [] });
        setShowCart(false);
        setCheckoutLocation({ county: "", subCounty: "", subLocation: "", town: "", exactAddress: "" });
        fetchUserOrders();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (err) { alert("Checkout failed."); }
  };

  // --- ADMIN ACTIONS ---
  const adminHeaders = { 'Authorization': `Bearer ${token}` };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(newProduct).forEach(([key, val]) => {
      if (key !== 'imageUrl') formData.append(key, String(val));
    });
    
    if (newProductFile) {
      formData.append('image', newProductFile);
    } else if (newProduct.imageUrl) {
      formData.append('imageUrl', newProduct.imageUrl);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { method: 'POST', headers: adminHeaders, body: formData });
      if (res.ok) {
        alert("Product added successfully!");
        fetchInitialData();
        setNewProduct({ name: "", category: "", subCategory: "", price: "", stock: "10", description: "", isOffer: false, offerDiscount: "", imageUrl: "" });
        setNewProductFile(null);
      } else alert(await res.text());
    } catch (err) { alert("Error adding product"); }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: adminHeaders
      });
      if (res.ok) {
        alert("Product deleted successfully!");
        fetchInitialData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "Failed to delete product");
      }
    } catch (err) {
      alert("Error deleting product");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(newCategory)
      });
      if (res.ok) { alert("Category created!"); fetchInitialData(); }
    } catch (err) { alert("Failed to add category"); }
  };

  const toggleUserSuspension = async (userId: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/suspend`, { method: 'PUT', headers: adminHeaders });
      if (res.ok) fetchAdminData();
      else alert((await res.json()).message);
    } catch (err) { alert("Failed to change user status"); }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAdminData();
    } catch (err) { alert("Failed to update order"); }
  };

  const updateStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify(storeSettings)
      });
      if (res.ok) alert("Settings updated!");
      setStoreSettings(storeSettings);
    } catch (err) { 
      alert("Applied locally (Backend sync failed)");
    }
  };

  // --- DYNAMIC CATEGORIES & SUBCATEGORIES COMPUTATION ---
  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    const catSet = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(catSet).map(name => ({ _id: name, name, icon: name }));
  }, [categories, products]);

  const getSubCategoriesForCategory = (catName: string) => {
    const relevantProducts = products.filter(p => p.category === catName);
    const subSet = new Set(relevantProducts.map(p => p.subCategory).filter(Boolean));
    return Array.from(subSet);
  };

  // --- FILTERING LOGIC ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === "All" || p.subCategory === selectedSubCategory;
      const matchesDeals = !showOffersOnly || p.isOffer;
      return matchesSearch && matchesCategory && matchesSubCategory && matchesDeals;
    });
  }, [products, searchQuery, selectedCategory, selectedSubCategory, showOffersOnly]);

  const calculateDiscountPrice = (price: number, discount: string) => {
    const d = parseFloat(discount);
    if (isNaN(d) || d <= 0) return price;
    if (discount.includes('%')) {
      return price - (price * (d / 100));
    }
    return Math.max(0, price - d);
  };


  // ==========================================
  // RENDER: TWO-PANEL ADMIN DASHBOARD
  // ==========================================
  const renderAdminPanel = () => (
    <div className="flex min-h-[calc(100vh-4rem)]" style={{ backgroundColor: storeSettings.backgroundColor }}>
      {/* Admin Sidebar Panel */}
      <aside className="w-64 border-r flex flex-col shrink-0" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
        <div className="p-6">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-3">
            <ShieldCheck size={24} style={{ color: storeSettings.primaryColor }} /> Control Panel
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: <Layers size={18}/>, label: 'Dashboard' },
            { id: 'products', icon: <Box size={18}/>, label: 'Products' },
            { id: 'categories', icon: <Filter size={18}/>, label: 'Categories' },
            { id: 'orders', icon: <ShoppingCart size={18}/>, label: 'Orders' },
            { id: 'users', icon: <Users size={18}/>, label: 'Users' },
            { id: 'logs', icon: <Activity size={18}/>, label: 'Activity Logs' },
            { id: 'settings', icon: <Settings size={18}/>, label: 'Settings' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveAdminTab(tab.id as any)} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeAdminTab === tab.id 
                  ? 'text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              style={activeAdminTab === tab.id ? { backgroundColor: storeSettings.primaryColor } : {}}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Admin Main Content Panel */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* TAB CONTENTS */}
        {activeAdminTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Products', value: products.length, color: 'border-l-blue-500' },
              { label: 'Categories', value: displayCategories.length, color: 'border-l-amber-500' },
              { label: 'Total Orders', value: adminData.orders.length, color: 'border-l-emerald-500' },
              { label: 'Registered Users', value: adminData.users.length, color: 'border-l-purple-500' },
            ].map((stat, i) => (
              <div key={i} className={`p-6 rounded-2xl border border-slate-800 border-l-4 shadow-xl`} style={{ backgroundColor: storeSettings.panelColor, ...({ borderLeftColor: stat.color.split('-')[2] })}}>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeAdminTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Plus size={20} style={{ color: storeSettings.primaryColor }}/> Add Hardware Item</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Original Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" required />
                  <input type="number" placeholder="Stock Qty" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" required />
                  <input type="text" placeholder="Sub-Category" value={newProduct.subCategory} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" required />
                </div>
                <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none text-sm" rows={3}></textarea>
                
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: storeSettings.primaryColor }}>
                    <input type="checkbox" checked={newProduct.isOffer} onChange={e => setNewProduct({...newProduct, isOffer: e.target.checked})} className="rounded bg-slate-900 border-slate-700 focus:ring-0" />
                    Enable Special Offer (Prize Off)
                  </label>
                  {newProduct.isOffer && (
                    <input type="text" placeholder="Discount (e.g. 500 or 10%)" value={newProduct.offerDiscount} onChange={e => setNewProduct({...newProduct, offerDiscount: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded text-xs outline-none" />
                  )}
                </div>

                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
                  <p className="text-xs font-bold text-slate-400">Product Image (Upload OR Link)</p>
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-slate-500" />
                    <input type="file" onChange={e => e.target.files && setNewProductFile(e.target.files[0])} className="w-full text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="text-slate-500" />
                    <input type="url" placeholder="Or paste image URL link..." value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded text-xs outline-none" />
                  </div>
                </div>

                <button type="submit" className="w-full text-white p-3 rounded-lg font-bold transition shadow-lg text-sm" style={{ backgroundColor: storeSettings.primaryColor }}>Save Product</button>
              </form>
            </div>

            <div className="lg:col-span-2 p-6 rounded-2xl border shadow-xl overflow-x-auto" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
              <h3 className="font-bold text-lg text-white mb-4">Inventory Catalogue</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price & Offers</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-slate-800/30">
                      <td className="p-3 flex items-center gap-3">
                        <img src={getImageUrl(p.image)} className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700" alt="" />
                        <div>
                          <p className="font-medium text-white line-clamp-1">{p.name}</p>
                          <p className="text-[10px] font-bold" style={{ color: storeSettings.primaryColor }}>{p.subCategory}</p>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{p.category}</td>
                      <td className="p-3 font-semibold">
                        {p.isOffer ? (
                          <div className="flex flex-col">
                            <span className="text-slate-500 line-through text-[10px]">Ksh {p.price}</span>
                            <span className="text-emerald-400">Ksh {calculateDiscountPrice(p.price, p.offerDiscount)}</span>
                          </div>
                        ) : (
                          <span className="text-white">Ksh {p.price}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${p.stock > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => handleDeleteProduct(p._id)} className="text-red-400 hover:text-red-300 transition">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="p-6 rounded-2xl border shadow-xl overflow-x-auto" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <h3 className="font-bold text-lg text-white mb-4">User Management</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {adminData.users.map((u: any) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-medium text-white">{u.fullName}</td>
                    <td className="p-3 text-slate-400 text-xs">{u.email}</td>
                    <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}>{u.role}</span></td>
                    <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${u.isSuspended ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u.isSuspended ? 'Suspended' : 'Active'}</span></td>
                    <td className="p-3">
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleUserSuspension(u._id)} className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'logs' && (
          <div className="p-6 rounded-2xl border shadow-xl overflow-x-auto" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <h3 className="font-bold text-lg text-white mb-4">Complete System Logs</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">User Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {adminData.logs.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-medium">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${log.type === 'Transaction' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{log.desc}</td>
                    <td className="p-3 text-xs text-slate-400">{log.user?.fullName || log.user?.email || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'orders' && (
           <div className="p-6 rounded-2xl border shadow-xl overflow-x-auto" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
             <h3 className="font-bold text-lg text-white mb-4">Order Processing</h3>
             <table className="w-full text-left border-collapse text-sm">
               <thead>
                 <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                   <th className="p-3">Order ID</th>
                   <th className="p-3">Customer & Location</th>
                   <th className="p-3">Total</th>
                   <th className="p-3">Status</th>
                   <th className="p-3">Update Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {adminData.orders.map((o: any) => (
                   <tr key={o._id} className="hover:bg-slate-800/30">
                     <td className="p-3 text-xs text-slate-500">{o._id.substring(0, 8)}</td>
                     <td className="p-3">
                        <p className="font-medium text-white">{o.user?.fullName}</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs">{o.shippingAddress}</p>
                     </td>
                     <td className="p-3 font-bold" style={{ color: storeSettings.primaryColor }}>Ksh {o.totalAmount}</td>
                     <td className="p-3 capitalize">
                       <span className={`px-2 py-1 text-xs font-bold rounded-full ${o.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{o.status}</span>
                     </td>
                     <td className="p-3">
                        <select value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)} className="text-xs bg-slate-800 border border-slate-700 text-white p-1.5 rounded outline-none">
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}

        {activeAdminTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
                <h3 className="font-bold text-lg text-white mb-4">Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4 text-sm">
                  <input type="text" placeholder="Category Name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none" required />
                  <input type="text" placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none" />
                  <select value={newCategory.icon} onChange={e => setNewCategory({...newCategory, icon: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none">
                    <option value="wrench">Wrench (Tools)</option>
                    <option value="car">Car (Vehicle Parts)</option>
                    <option value="bike">Bike (Motorcycle)</option>
                    <option value="hammer">Hammer (Building)</option>
                    <option value="zap">Zap (Electrical)</option>
                  </select>
                  <button type="submit" className="w-full text-white p-3 rounded-lg font-bold transition" style={{ backgroundColor: storeSettings.primaryColor }}>Save Category</button>
                </form>
             </div>
             <div className="p-6 rounded-2xl border shadow-xl" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
               <h3 className="font-bold text-lg text-white mb-4">Current Categories</h3>
               <ul className="space-y-2">
                 {displayCategories.map(c => (
                   <li key={c._id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                     <span style={{ color: storeSettings.primaryColor }}>{getIcon(c.icon || c.name)}</span>
                     <span className="font-medium text-white text-sm">{c.name}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="p-6 rounded-2xl border shadow-xl max-w-3xl" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <h3 className="font-bold text-lg text-white mb-4">Advanced Store Appearance & Capabilities</h3>
            <form onSubmit={updateStoreSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Store Name</label>
                  <input type="text" value={storeSettings.storeName} onChange={e => setStoreSettings({...storeSettings, storeName: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Tagline</label>
                  <input type="text" value={storeSettings.tagline} onChange={e => setStoreSettings({...storeSettings, tagline: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Hero Title</label>
                  <input type="text" value={storeSettings.heroTitle} onChange={e => setStoreSettings({...storeSettings, heroTitle: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none mt-1" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Primary Accent Color</label>
                  <div className="flex gap-3 mt-1">
                    <input type="color" value={storeSettings.primaryColor} onChange={e => setStoreSettings({...storeSettings, primaryColor: e.target.value})} className="h-10 w-10 rounded cursor-pointer bg-slate-800 border-none" />
                    <input type="text" value={storeSettings.primaryColor} onChange={e => setStoreSettings({...storeSettings, primaryColor: e.target.value})} className="flex-1 p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Background Color (Theme)</label>
                  <div className="flex gap-3 mt-1">
                    <input type="color" value={storeSettings.backgroundColor} onChange={e => setStoreSettings({...storeSettings, backgroundColor: e.target.value})} className="h-10 w-10 rounded cursor-pointer bg-slate-800 border-none" />
                    <input type="text" value={storeSettings.backgroundColor} onChange={e => setStoreSettings({...storeSettings, backgroundColor: e.target.value})} className="flex-1 p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Panel/Card Color</label>
                  <div className="flex gap-3 mt-1">
                    <input type="color" value={storeSettings.panelColor} onChange={e => setStoreSettings({...storeSettings, panelColor: e.target.value})} className="h-10 w-10 rounded cursor-pointer bg-slate-800 border-none" />
                    <input type="text" value={storeSettings.panelColor} onChange={e => setStoreSettings({...storeSettings, panelColor: e.target.value})} className="flex-1 p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                  <input type="text" value={storeSettings.contactPhone} onChange={e => setStoreSettings({...storeSettings, contactPhone: e.target.value})} className="w-full p-3 bg-slate-800/50 border border-slate-700 text-white rounded-lg outline-none mt-1" />
                </div>
              </div>
              <div className="md:col-span-2 pt-4">
                <button type="submit" className="w-full text-white px-6 py-4 rounded-lg font-bold transition shadow-lg" style={{ backgroundColor: storeSettings.primaryColor }}>Apply All Settings</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );


  // ==========================================
  // MAIN RENDER: DYNAMIC THEME USER STOREFRONT
  // ==========================================
  
  if (currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen font-sans text-slate-100" style={{ backgroundColor: storeSettings.backgroundColor }}>
        <header className="border-b text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
          <h1 className="font-bold text-xl flex items-center gap-2">
            <Wrench style={{ color: storeSettings.primaryColor }}/> {storeSettings.storeName}
          </h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-bold transition"><LogOut size={16}/> Logout</button>
        </header>
        {renderAdminPanel()}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 font-sans" style={{ backgroundColor: storeSettings.backgroundColor }}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md shadow-2xl border-b" style={{ backgroundColor: `${storeSettings.panelColor}f2`, borderColor: '#1e293b' }}>
        <div className="max-w-[1400px] mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden transition" style={{ color: storeSettings.primaryColor }} onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-black flex items-center gap-2 tracking-tight text-white">
                <Wrench className="hidden sm:block" style={{ color: storeSettings.primaryColor }} /> {storeSettings.storeName}
              </h1>
              <p className="text-xs text-slate-400 italic hidden sm:block">{storeSettings.tagline}</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <input 
              type="text" 
              placeholder="Search spare parts, tools, electricals..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border text-white focus:outline-none transition text-sm shadow-inner"
              style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}
            />
            <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative cursor-pointer transition p-2 rounded-xl hover:bg-white/5" onClick={() => setShowCart(true)}>
              <ShoppingCart size={24} />
              {(cart.items?.length > 0) && (
                <span className="absolute -top-1 -right-1 text-slate-950 text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2" style={{ backgroundColor: storeSettings.primaryColor, borderColor: storeSettings.panelColor }}>
                  {cart.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-4">
                <button onClick={() => setShowOrderTracking(true)} className="hidden md:flex items-center gap-2 hover:text-white transition text-sm font-semibold" style={{ color: storeSettings.primaryColor }}>
                  <MapPin size={18} /> <span>Track Orders</span>
                </button>
                <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-slate-400 hover:text-red-400 transition text-sm font-semibold">
                  <LogOut size={18} /> <span>Logout</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg text-sm" style={{ backgroundColor: storeSettings.primaryColor }}>
                <UserIcon size={18} /> <span className="hidden md:block">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH */}
      <div className="md:hidden p-4 border-b" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border text-white text-sm outline-none"
            style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}
          />
          <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row relative items-start gap-6 pt-6">
        {/* FIXED CATEGORY SIDEBAR WITH SUBCATEGORIES ACCORDION */}
        <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-7rem)] w-72 border-r lg:border lg:rounded-2xl z-50 transition-transform duration-300 ease-in-out shadow-2xl overflow-y-auto`} style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
          <div className="p-4 flex justify-between items-center lg:hidden border-b" style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}>
            <span className="font-bold text-lg flex items-center gap-2"><Wrench style={{ color: storeSettings.primaryColor }}/> Categories</span>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>
          
          <div className="p-4 pb-24 space-y-2">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-4">Browse Catalog</p>
            
            <button 
              onClick={() => {setSelectedCategory("All"); setSelectedSubCategory("All"); setExpandedCategory(null); setIsMobileMenuOpen(false);}}
              className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition text-sm ${selectedCategory === "All" ? "text-white" : "hover:bg-white/5 text-slate-300"}`}
              style={selectedCategory === "All" ? { backgroundColor: `${storeSettings.primaryColor}33`, color: storeSettings.primaryColor, border: `1px solid ${storeSettings.primaryColor}66` } : {}}
            >
              <ShoppingBag size={18} /> All Inventory
            </button>
            
            {/* Category Accordion */}
            {displayCategories.map((cat) => {
              const subs = getSubCategoriesForCategory(cat.name);
              const isExpanded = expandedCategory === cat.name;
              const isSelected = selectedCategory === cat.name;

              return (
                <div key={cat._id} className="flex flex-col gap-1">
                  <button 
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedCategory(null);
                      } else {
                        setExpandedCategory(cat.name);
                        setSelectedCategory(cat.name);
                        setSelectedSubCategory("All");
                      }
                    }}
                    className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center justify-between transition text-sm ${isSelected ? "" : "hover:bg-white/5 text-slate-300"}`}
                    style={isSelected ? { backgroundColor: `${storeSettings.primaryColor}1a`, color: storeSettings.primaryColor } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ color: isSelected ? storeSettings.primaryColor : '#94a3b8' }}>{getIcon(cat.icon || cat.name)}</span> 
                      {cat.name}
                    </div>
                    {subs.length > 0 && (
                      <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {/* Subcategories Dropdown inside Sidebar */}
                  {isExpanded && subs.length > 0 && (
                    <div className="pl-11 pr-2 py-1 space-y-1">
                      {subs.map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            setSelectedSubCategory(sub as string);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full text-left py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                            selectedSubCategory === sub ? "text-white bg-white/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <ChevronRight size={12} style={{ color: selectedSubCategory === sub ? storeSettings.primaryColor : '#64748b' }} /> {sub as string}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* OFFERS FILTER */}
            <div className="pt-4 border-t mt-6" style={{ borderColor: '#1e293b' }}>
              <button 
                onClick={() => setShowOffersOnly(!showOffersOnly)}
                className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition text-sm ${showOffersOnly ? "text-white shadow-lg shadow-amber-600/20" : "border text-slate-300 hover:border-amber-500/50"}`}
                style={showOffersOnly ? { backgroundColor: storeSettings.primaryColor } : { borderColor: '#1e293b', backgroundColor: storeSettings.backgroundColor }}
              >
                <Flame size={18} className={showOffersOnly ? "text-white" : "text-amber-500"} /> Special Offers
              </button>
            </div>
            
            {/* Mobile order tracking link */}
            {currentUser && (
               <button onClick={() => {setShowOrderTracking(true); setIsMobileMenuOpen(false);}} className="lg:hidden w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 mt-2 border border-slate-800 text-slate-300">
                 <MapPin size={18} style={{ color: storeSettings.primaryColor }}/> Track My Orders
               </button>
            )}
          </div>
        </aside>

        {/* MAIN STOREFRONT */}
        <main className="flex-1 w-full pb-20 px-4 lg:px-0">
          {/* HERO BANNER */}
          <section className="mb-8">
            <div className="w-full rounded-3xl overflow-hidden relative border shadow-2xl h-[260px] md:h-[320px] flex items-center p-8 md:p-14" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="border font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-4 inline-flex items-center gap-1 backdrop-blur-sm" style={{ backgroundColor: `${storeSettings.primaryColor}33`, color: storeSettings.primaryColor, borderColor: `${storeSettings.primaryColor}66` }}>
                  <ShieldCheck size={14} /> Industrial Grade Quality
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight tracking-tight">
                  {storeSettings.heroTitle}
                </h2>
                <p className="text-slate-300 text-sm md:text-base mb-8 max-w-md">{storeSettings.tagline}</p>
                <a href="#inventory" className="text-white px-8 py-3.5 rounded-xl font-bold transition shadow-lg text-sm inline-flex items-center gap-2 hover:scale-105" style={{ backgroundColor: storeSettings.primaryColor }}>
                  Explore Catalog <ChevronRight size={16} />
                </a>
              </div>
            </div>
          </section>

          {/* CATALOG HEADER */}
          <section id="inventory">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 pb-4 border-b" style={{ borderColor: '#1e293b' }}>
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  {selectedSubCategory !== "All" ? selectedSubCategory : selectedCategory === "All" ? "Complete Inventory" : selectedCategory}
                </h2>
                <p className="text-xs text-slate-400 mt-1">Showing {filteredProducts.length} items</p>
              </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(product => {
                const finalPrice = product.isOffer ? calculateDiscountPrice(product.price, product.offerDiscount) : product.price;
                
                return (
                  <div key={product._id} className="rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col group shadow-lg hover:shadow-2xl hover:-translate-y-1" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
                    {/* Image Container */}
                    <div className="h-44 md:h-52 overflow-hidden relative p-4 flex justify-center items-center" style={{ backgroundColor: storeSettings.backgroundColor }}>
                      <img 
                        src={getImageUrl(product.image)} 
                        alt={product.name} 
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl" 
                      />
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                        {product.stock <= 5 && product.stock > 0 && (
                          <span className="bg-red-500/90 text-white shadow-sm text-[10px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-md">
                            Only {product.stock} left
                          </span>
                        )}
                        {product.isOffer && (
                          <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md shadow-amber-500/30" style={{ backgroundColor: '#ef4444' }}>
                            <Flame size={12} /> {product.offerDiscount.includes('%') ? product.offerDiscount : `Ksh ${product.offerDiscount}`} OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info Container */}
                    <div className="p-4 flex flex-col flex-1 border-t" style={{ borderColor: '#1e293b' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: storeSettings.primaryColor }}>{product.subCategory || product.category}</p>
                      <h3 className="font-bold text-slate-100 text-xs md:text-sm mb-3 line-clamp-2 leading-snug group-hover:text-white transition-colors">{product.name}</h3>
                      
                      <div className="mt-auto pt-2 flex items-end justify-between mb-4">
                        <div className="flex flex-col">
                          {product.isOffer && (
                            <span className="text-slate-500 text-[10px] line-through mb-0.5">Ksh {product.price}</span>
                          )}
                          <p className="font-black text-base md:text-lg" style={{ color: storeSettings.primaryColor }}>Ksh {finalPrice}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleAddToCart({...product, finalPrice})}
                        disabled={product.stock === 0}
                        className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-xs transition shadow-md ${
                          product.stock === 0 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'text-white hover:brightness-110 active:scale-95'
                        }`}
                        style={product.stock !== 0 ? { backgroundColor: storeSettings.primaryColor } : {}}
                      >
                        <ShoppingCart size={14} /> {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* EMPTY STATE */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-24 px-4 rounded-3xl border mt-4" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
                <Box className="mx-auto text-slate-700 mb-4" size={64} />
                <h3 className="text-xl font-bold text-slate-200 mb-2">No Hardware Products Found</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">Try selecting a different sub-category, searching for another term, or clearing your current filters.</p>
                <button 
                  onClick={() => {setSearchQuery(""); setSelectedCategory("All"); setSelectedSubCategory("All"); setShowOffersOnly(false); setExpandedCategory(null);}} 
                  className="mt-6 px-6 py-2 rounded-full text-xs font-bold transition border"
                  style={{ color: storeSettings.primaryColor, borderColor: `${storeSettings.primaryColor}66`, backgroundColor: `${storeSettings.primaryColor}1a` }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* WHATSAPP FLOATING BUTTON */}
      <a 
        href={`https://wa.me/${storeSettings.contactPhone.replace(/\s+/g, '')}`} 
        target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 bg-emerald-500 text-slate-950 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 flex items-center justify-center border-4"
        style={{ borderColor: storeSettings.backgroundColor }}
      >
        <MessageCircle size={28} />
      </a>

      {/* FOOTER */}
      <footer className="pt-20 pb-8 border-t mt-20" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
        <div className="max-w-[1400px] mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-white text-xl font-black mb-4 flex items-center gap-2"><Wrench style={{ color: storeSettings.primaryColor }}/> {storeSettings.storeName}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-sm">{storeSettings.tagline}</p>
          </div>
          <div>
            <h3 className="text-white text-sm font-bold mb-5 uppercase tracking-wider">Catalogue Quick Links</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><button onClick={() => {setSelectedCategory("Vehicle Spare Parts"); window.scrollTo(0,0);}} className="hover:text-white transition">Vehicle Spare Parts</button></li>
              <li><button onClick={() => {setSelectedCategory("Power & Hand Tools"); window.scrollTo(0,0);}} className="hover:text-white transition">Industrial Tools</button></li>
              <li><button onClick={() => {setShowOffersOnly(true); window.scrollTo(0,0);}} className="hover:text-white transition flex items-center gap-2"><Flame size={14} style={{color: storeSettings.primaryColor}}/> Special Offers</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-sm font-bold mb-5 uppercase tracking-wider">Contact & Support</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-3"><span className="p-2 rounded-lg bg-slate-800">📞</span> {storeSettings.contactPhone}</li>
              <li className="flex items-center gap-3"><span className="p-2 rounded-lg bg-slate-800">✉️</span> support@prohardware.com</li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs border-t pt-8 text-slate-500" style={{ borderColor: '#1e293b' }}>
          &copy; {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved. Built for heavy-duty performance.
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md" style={{ backgroundColor: 'rgba(2, 6, 23, 0.8)' }}>
          <div className="rounded-3xl w-full max-w-md p-8 relative shadow-2xl border" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full">
              <X size={18} />
            </button>
            <h2 className="text-2xl font-black text-white text-center mb-2">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-center text-slate-400 text-xs mb-8">Log in to process orders and track your items.</p>
            
            <form onSubmit={handleAuth} className="space-y-4 text-sm">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                    <input type="text" required value={authForm.fullName} onChange={e => setAuthForm({...authForm, fullName: e.target.value})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl outline-none transition text-sm" style={{ borderColor: '#1e293b' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
                    <input type="tel" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl outline-none transition text-sm" style={{ borderColor: '#1e293b' }} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl outline-none transition text-sm" style={{ borderColor: '#1e293b' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 text-white rounded-xl outline-none transition text-sm" style={{ borderColor: '#1e293b' }} />
              </div>
              
              <button type="submit" className="w-full text-white py-3.5 rounded-xl font-bold transition shadow-lg mt-4 text-sm hover:brightness-110" style={{ backgroundColor: storeSettings.primaryColor }}>
                {authMode === 'login' ? 'Secure Login' : 'Register Account'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-xs text-slate-400">
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="ml-2 hover:underline font-bold" style={{ color: storeSettings.primaryColor }}>
                {authMode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 2. ORDER TRACKING MODAL */}
      {showOrderTracking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md" style={{ backgroundColor: 'rgba(2, 6, 23, 0.8)' }}>
          <div className="rounded-3xl w-full max-w-3xl p-6 md:p-8 relative shadow-2xl border max-h-[85vh] flex flex-col" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: '#1e293b' }}>
              <h2 className="text-2xl font-black text-white flex items-center gap-2"><MapPin style={{ color: storeSettings.primaryColor }}/> Track My Orders</h2>
              <button onClick={() => setShowOrderTracking(false)} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {userOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto text-slate-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300">No Orders Found</h3>
                  <p className="text-slate-500 text-sm mt-1">You haven't placed any orders yet.</p>
                </div>
              ) : (
                userOrders.map((order: any) => (
                  <div key={order._id} className="bg-slate-950/50 border p-5 rounded-2xl" style={{ borderColor: '#1e293b' }}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Order #{order._id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={12}/> {new Date(order.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize border ${
                        order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        order.status === 'shipped' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center border border-slate-800 p-1">
                               <img src={getImageUrl(item.product?.image || item.product?.imageUrl)} alt="" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div>
                               <p className="font-medium text-slate-200 line-clamp-1">{item.product?.name || 'Hardware Item'}</p>
                               <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className="font-bold text-slate-300">Ksh {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: '#1e293b' }}>
                      <div className="text-xs text-slate-400 max-w-[60%]">
                        <p className="font-bold text-slate-300 mb-1 flex items-center gap-1"><MapPin size={12}/> Delivery Address</p>
                        <p className="line-clamp-2">{order.shippingAddress}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total Amount</p>
                        <p className="font-black text-lg" style={{ color: storeSettings.primaryColor }}>Ksh {order.totalAmount}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CART DRAWER MODAL (With Comprehensive Kenya Locations) */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex justify-end backdrop-blur-sm" style={{ backgroundColor: 'rgba(2, 6, 23, 0.6)' }}>
          <div className="w-full max-w-md h-full shadow-2xl flex flex-col border-l" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }}>
            <div className="p-5 border-b text-white flex justify-between items-center" style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}>
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart style={{ color: storeSettings.primaryColor }} size={24} /> Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!cart.items || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                  <ShoppingBag size={56} className="text-slate-700 opacity-50" />
                  <p className="text-base font-medium">Your cart is empty.</p>
                  <button onClick={() => setShowCart(false)} className="mt-4 px-6 py-2 rounded-full text-sm font-bold border hover:bg-white/5 transition" style={{ color: storeSettings.primaryColor, borderColor: storeSettings.primaryColor }}>Continue Shopping</button>
                </div>
              ) : (
                cart.items.map((item: any, idx: number) => {
                  const pPrice = item.price; // assuming cart stores the final price at time of add
                  return (
                    <div key={idx} className="flex gap-4 p-3 rounded-2xl border" style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}>
                      <img src={getImageUrl(item.product?.image)} alt="" className="w-20 h-20 object-contain rounded-xl p-2 border" style={{ backgroundColor: storeSettings.panelColor, borderColor: '#1e293b' }} />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm line-clamp-2">{item.product?.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">Qty: {item.quantity}</p>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <span className="font-black text-sm" style={{ color: storeSettings.primaryColor }}>Ksh {pPrice}</span>
                          <button onClick={() => handleRemoveFromCart(item.product?._id)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            
            {(cart.items && cart.items.length > 0) && (
              <div className="p-6 border-t shadow-[0_-10px_30px_rgba(0,0,0,0.5)]" style={{ backgroundColor: storeSettings.backgroundColor, borderColor: '#1e293b' }}>
                <div className="flex justify-between text-lg font-black text-slate-200 mb-6">
                  <span>Total Amount</span>
                  <span style={{ color: storeSettings.primaryColor }}>Ksh {cart.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)}</span>
                </div>

                {/* Comprehensive Delivery Location Setup */}
                <div className="mb-6 space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2"><MapPin size={14} style={{ color: storeSettings.primaryColor }}/> Delivery Destination</p>
                  
                  <select 
                    value={checkoutLocation.county} 
                    onChange={e => setCheckoutLocation({...checkoutLocation, county: e.target.value})} 
                    className="w-full p-2.5 bg-slate-950 border text-slate-200 rounded-lg text-xs outline-none focus:ring-1"
                    style={{ borderColor: '#1e293b' }}
                  >
                    <option value="" disabled>Select County (All 47 available)</option>
                    {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c} County</option>)}
                  </select>

                  {checkoutLocation.county && (
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" placeholder="Sub-County (e.g. Kasarani)" 
                        value={checkoutLocation.subCounty} onChange={e => setCheckoutLocation({...checkoutLocation, subCounty: e.target.value})} 
                        className="w-full p-2.5 bg-slate-950 border text-slate-200 rounded-lg text-xs outline-none" style={{ borderColor: '#1e293b' }}
                      />
                      <input 
                        type="text" placeholder="Town / City" 
                        value={checkoutLocation.town} onChange={e => setCheckoutLocation({...checkoutLocation, town: e.target.value})} 
                        className="w-full p-2.5 bg-slate-950 border text-slate-200 rounded-lg text-xs outline-none" style={{ borderColor: '#1e293b' }} required
                      />
                    </div>
                  )}

                  <input 
                    type="text" placeholder="Sub-Location / Estate (Optional)" 
                    value={checkoutLocation.subLocation} onChange={e => setCheckoutLocation({...checkoutLocation, subLocation: e.target.value})} 
                    className="w-full p-2.5 bg-slate-950 border text-slate-200 rounded-lg text-xs outline-none" style={{ borderColor: '#1e293b' }}
                  />

                  <textarea 
                    value={checkoutLocation.exactAddress} onChange={e => setCheckoutLocation({...checkoutLocation, exactAddress: e.target.value})} 
                    className="w-full p-2.5 bg-slate-950 border text-slate-200 rounded-lg text-xs outline-none resize-none" style={{ borderColor: '#1e293b' }}
                    rows={2} placeholder="Exact street address, building, or workshop name..." required
                  ></textarea>
                </div>
                <button onClick={handleCheckout} className="w-full text-slate-950 py-3.5 rounded-xl font-bold text-sm shadow-xl transition flex items-center justify-center gap-2 hover:brightness-110" style={{ backgroundColor: '#10b981' }}>
                  <CheckCircle size={18} /> Confirm & Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
