'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, User as UserIcon, Menu, X, MessageCircle, 
  Plus, Package, Settings, LogOut, Wrench, Car, Bike, Hammer, Zap, 
  Trash2, Edit, AlertCircle, CheckCircle, Users, ShoppingBag, Gift,
  Flame, Filter, Layers, ChevronDown, ShieldCheck, Box
} from 'lucide-react';

// --- API CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hardware-sales.onrender.com';

// --- HELPER TO FORMAT IMAGE URLS (UNSPLASH & LOCAL RENDER UPLOADS) ---
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
    primaryColor: "#d97706",
    contactPhone: "+254 700 000 000"
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
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // --- ADMIN STATE ---
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard'|'products'|'categories'|'users'|'orders'|'settings'>('dashboard');
  const [adminData, setAdminData] = useState({ users: [], orders: [] });
  const [newProduct, setNewProduct] = useState({ 
    name: "", category: "", subCategory: "", price: "", stock: "10", description: "", isWeeklyDeal: false, weeklyGiftDescription: "" 
  });
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", icon: "wrench" });

  // --- UI & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [showDealsOnly, setShowDealsOnly] = useState(false);
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
      if (currentUser?.role === 'admin') fetchAdminData();
    }
  }, [token, currentUser?.role]);

  // Reset subcategory filter when category changes
  useEffect(() => {
    setSelectedSubCategory("All");
  }, [selectedCategory]);

  // --- FETCHERS ---
  const fetchInitialData = async () => {
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/settings`)
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (setRes.ok) setStoreSettings(await setRes.json());
    } catch (err) { console.error("Error fetching initial data", err); }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setCart(await res.json());
    } catch (err) { console.error("Error fetching cart", err); }
  };

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [usersRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/orders`, { headers })
      ]);
      if (usersRes.ok && ordersRes.ok) {
        setAdminData({ users: await usersRes.json(), orders: await ordersRes.json() });
      }
    } catch (err) { console.error("Admin data fetch failed", err); }
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
      if (res.ok) {
        setCart(await res.json());
      }
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
    if (!checkoutAddress) return alert("Please provide a shipping address.");
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shippingAddress: checkoutAddress })
      });
      if (res.ok) {
        alert("Order placed successfully!");
        setCart({ items: [] });
        setShowCart(false);
        setCheckoutAddress("");
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
    Object.entries(newProduct).forEach(([key, val]) => formData.append(key, String(val)));
    if (newProductFile) formData.append('image', newProductFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { method: 'POST', headers: adminHeaders, body: formData });
      if (res.ok) {
        alert("Product added!");
        fetchInitialData();
        setNewProduct({ name: "", category: "", subCategory: "", price: "", stock: "10", description: "", isWeeklyDeal: false, weeklyGiftDescription: "" });
        setNewProductFile(null);
      } else alert(await res.text());
    } catch (err) { alert("Error adding product"); }
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
    } catch (err) { alert("Failed to update settings"); }
  };

  // --- DYNAMIC CATEGORIES & SUBCATEGORIES COMPUTATION ---
  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    const catSet = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(catSet).map(name => ({ _id: name, name, icon: name }));
  }, [categories, products]);

  const availableSubCategories = useMemo(() => {
    const relevantProducts = products.filter(p => selectedCategory === "All" || p.category === selectedCategory);
    const subSet = new Set(relevantProducts.map(p => p.subCategory).filter(Boolean));
    return Array.from(subSet);
  }, [products, selectedCategory]);

  // --- FILTERING LOGIC ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === "All" || p.subCategory === selectedSubCategory;
      const matchesDeals = !showDealsOnly || p.isWeeklyDeal;
      return matchesSearch && matchesCategory && matchesSubCategory && matchesDeals;
    });
  }, [products, searchQuery, selectedCategory, selectedSubCategory, showDealsOnly]);


  // ==========================================
  // RENDER: DARK THEME ADMIN DASHBOARD
  // ==========================================
  const renderAdminPanel = () => (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-extrabold text-white mb-6 flex items-center gap-3">
          <Settings className="text-amber-500" size={32} /> Admin Control Panel
        </h2>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mb-8 bg-slate-900 p-2 rounded-xl border border-slate-800">
          {['dashboard', 'products', 'categories', 'orders', 'users', 'settings'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveAdminTab(tab as any)} 
              className={`px-5 py-2.5 rounded-lg font-semibold capitalize whitespace-nowrap transition-all ${
                activeAdminTab === tab 
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeAdminTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-blue-500 shadow-xl">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Products</p>
              <p className="text-3xl font-extrabold text-white">{products.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-amber-500 shadow-xl">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Categories</p>
              <p className="text-3xl font-extrabold text-white">{displayCategories.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-emerald-500 shadow-xl">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Orders</p>
              <p className="text-3xl font-extrabold text-white">{adminData.orders.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 border-l-4 border-l-purple-500 shadow-xl">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Registered Users</p>
              <p className="text-3xl font-extrabold text-white">{adminData.users.length}</p>
            </div>
          </div>
        )}

        {activeAdminTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><Plus size={20} className="text-amber-500"/> Add Hardware Item</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none placeholder-slate-500 text-sm" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Price (Ksh)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none text-sm" required />
                  <input type="number" placeholder="Stock Qty" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none text-sm" required />
                </div>
                <input type="text" placeholder="Category (e.g., Vehicle Spare Parts)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none text-sm" required />
                <input type="text" placeholder="Sub-Category (e.g., Brakes)" value={newProduct.subCategory} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none text-sm" required />
                <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg focus:border-amber-500 outline-none text-sm" rows={3}></textarea>
                
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-400 cursor-pointer">
                    <input type="checkbox" checked={newProduct.isWeeklyDeal} onChange={e => setNewProduct({...newProduct, isWeeklyDeal: e.target.checked})} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0" />
                    Mark as Weekly Deal
                  </label>
                  {newProduct.isWeeklyDeal && (
                    <input type="text" placeholder="Gift Description (e.g., Free 1L Engine Oil)" value={newProduct.weeklyGiftDescription} onChange={e => setNewProduct({...newProduct, weeklyGiftDescription: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded text-xs outline-none" />
                  )}
                </div>

                <input type="file" onChange={e => e.target.files && setNewProductFile(e.target.files[0])} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20" />
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-lg font-bold transition shadow-lg shadow-amber-600/30 text-sm">Save Product</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
              <h3 className="font-bold text-lg text-white mb-4">Inventory Catalogue</h3>
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-slate-800/50">
                      <td className="p-3 flex items-center gap-3">
                        <img src={getImageUrl(p.image)} className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700" alt="" />
                        <div>
                          <p className="font-medium text-white line-clamp-1">{p.name}</p>
                          <p className="text-[10px] text-amber-500 font-bold">{p.subCategory}</p>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{p.category}</td>
                      <td className="p-3 font-semibold text-amber-400">Ksh {p.price}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${p.stock > 10 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3"><button className="text-red-400 hover:text-red-300 transition"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
            <h3 className="font-bold text-lg text-white mb-4">User Management</h3>
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {adminData.users.map((u: any) => (
                  <tr key={u._id} className="hover:bg-slate-800/50">
                    <td className="p-3 font-medium text-white">{u.fullName}</td>
                    <td className="p-3 text-slate-400 text-xs">{u.email}</td>
                    <td className="p-3"><span className={`px-2 py-1 text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>{u.role}</span></td>
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

        {activeAdminTab === 'orders' && (
           <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
             <h3 className="font-bold text-lg text-white mb-4">Order Processing</h3>
             <table className="w-full text-left border-collapse text-sm">
               <thead>
                 <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                   <th className="p-3">Order ID</th>
                   <th className="p-3">Customer</th>
                   <th className="p-3">Total</th>
                   <th className="p-3">Status</th>
                   <th className="p-3">Update Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {adminData.orders.map((o: any) => (
                   <tr key={o._id} className="hover:bg-slate-800/50">
                     <td className="p-3 text-xs text-slate-500">{o._id.substring(0, 8)}</td>
                     <td className="p-3 font-medium text-white">{o.user?.fullName}</td>
                     <td className="p-3 font-bold text-amber-400">Ksh {o.totalAmount}</td>
                     <td className="p-3 capitalize">
                       <span className={`px-2 py-1 text-xs font-bold rounded-full ${o.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{o.status}</span>
                     </td>
                     <td className="p-3">
                        <select value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)} className="text-xs bg-slate-800 border border-slate-700 text-white p-1.5 rounded outline-none focus:border-amber-500">
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
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="font-bold text-lg text-white mb-4">Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4 text-sm">
                  <input type="text" placeholder="Category Name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500" required />
                  <input type="text" placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500" />
                  <select value={newCategory.icon} onChange={e => setNewCategory({...newCategory, icon: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500">
                    <option value="wrench">Wrench (Tools)</option>
                    <option value="car">Car (Vehicle Parts)</option>
                    <option value="bike">Bike (Motorcycle)</option>
                    <option value="hammer">Hammer (Building)</option>
                    <option value="zap">Zap (Electrical)</option>
                  </select>
                  <button type="submit" className="w-full bg-amber-600 text-white p-3 rounded-lg font-bold hover:bg-amber-500 transition">Save Category</button>
                </form>
             </div>
             <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
               <h3 className="font-bold text-lg text-white mb-4">Current Categories</h3>
               <ul className="space-y-2">
                 {displayCategories.map(c => (
                   <li key={c._id} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                     <span className="text-amber-500">{getIcon(c.icon || c.name)}</span>
                     <span className="font-medium text-white text-sm">{c.name}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl max-w-2xl">
            <h3 className="font-bold text-lg text-white mb-4">Store Appearance & Info</h3>
            <form onSubmit={updateStoreSettings} className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-400">Store Name</label>
                <input type="text" value={storeSettings.storeName} onChange={e => setStoreSettings({...storeSettings, storeName: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Tagline</label>
                <input type="text" value={storeSettings.tagline} onChange={e => setStoreSettings({...storeSettings, tagline: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Hero Title</label>
                <input type="text" value={storeSettings.heroTitle} onChange={e => setStoreSettings({...storeSettings, heroTitle: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                <input type="text" value={storeSettings.contactPhone} onChange={e => setStoreSettings({...storeSettings, contactPhone: e.target.value})} className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-lg outline-none focus:border-amber-500 mt-1" />
              </div>
              <button type="submit" className="bg-amber-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-amber-500 transition shadow-lg shadow-amber-600/30">Apply Settings</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );


  // ==========================================
  // MAIN RENDER: DARK THEME USER STOREFRONT
  // ==========================================
  
  if (currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen font-sans bg-slate-950 text-slate-100">
        <header className="bg-slate-900 border-b border-slate-800 text-white p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="font-bold text-xl flex items-center gap-2"><Wrench className="text-amber-500"/> {storeSettings.storeName} Admin</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-bold transition"><LogOut size={16}/> Logout</button>
        </header>
        {renderAdminPanel()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-amber-500 hover:text-amber-400 transition" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-black flex items-center gap-2 tracking-tight text-white">
                <Wrench className="text-amber-500 hidden sm:block" /> {storeSettings.storeName}
              </h1>
              <p className="text-xs text-slate-400 italic hidden sm:block">{storeSettings.tagline}</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
            <input 
              type="text" 
              placeholder="Search spare parts, tools, electricals..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder-slate-500 transition text-sm"
            />
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative cursor-pointer hover:text-amber-400 transition p-2 rounded-lg hover:bg-slate-800" onClick={() => setShowCart(true)}>
              <ShoppingCart size={24} />
              {(cart.items?.length > 0) && (
                <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-slate-900">
                  {cart.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                </span>
              )}
            </div>

            {currentUser ? (
              <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-slate-400 hover:text-red-400 transition text-sm font-semibold">
                <LogOut size={18} /> <span>Logout</span>
              </button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-amber-500 transition shadow-lg shadow-amber-600/20 text-sm">
                <UserIcon size={18} /> <span className="hidden md:block">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH */}
      <div className="md:hidden p-4 bg-slate-900 border-b border-slate-800">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search spare parts, tools..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none placeholder-slate-500"
          />
          <Search className="absolute left-3 top-3 text-slate-500" size={18} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row relative">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-0 left-0 h-full w-72 bg-slate-900 lg:bg-transparent border-r border-slate-800/80 z-50 transition-transform duration-300 ease-in-out`}>
          <div className="p-4 flex justify-between items-center lg:hidden border-b border-slate-800 bg-slate-950 text-white">
            <span className="font-bold text-lg flex items-center gap-2"><Wrench className="text-amber-500"/> Categories</span>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>
          <div className="p-4 overflow-y-auto h-full pb-24 space-y-2">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-3 mb-2">Categories</p>
            <button 
              onClick={() => {setSelectedCategory("All"); setIsMobileMenuOpen(false);}}
              className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition text-sm ${selectedCategory === "All" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "hover:bg-slate-800/60 text-slate-300"}`}
            >
              <ShoppingBag size={18} /> All Inventory
            </button>
            
            {displayCategories.map((cat) => (
              <button 
                key={cat._id}
                onClick={() => {setSelectedCategory(cat.name); setIsMobileMenuOpen(false);}}
                className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition text-sm ${selectedCategory === cat.name ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "hover:bg-slate-800/60 text-slate-300"}`}
              >
                <span className="text-amber-500">{getIcon(cat.icon || cat.name)}</span> {cat.name}
              </button>
            ))}

            {/* WEEKLY DEALS FILTER */}
            <div className="pt-4 border-t border-slate-800 mt-4">
              <button 
                onClick={() => setShowDealsOnly(!showDealsOnly)}
                className={`w-full text-left py-3 px-4 rounded-xl font-bold flex items-center gap-3 transition text-sm ${showDealsOnly ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" : "bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-500/50"}`}
              >
                <Flame size={18} className={showDealsOnly ? "text-white" : "text-amber-500"} /> Weekly Deals & Offers
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN STOREFRONT */}
        <main className="flex-1 w-full lg:w-[calc(100%-18rem)]">
          {/* HERO BANNER */}
          <section className="p-4 md:p-6 lg:p-8">
            <div className="w-full bg-slate-900 rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl h-[260px] md:h-[320px] flex items-center p-8 md:p-14">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-4 inline-flex items-center gap-1">
                  <ShieldCheck size={14} /> Industrial Grade Quality
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
                  {storeSettings.heroTitle}
                </h2>
                <p className="text-slate-400 text-sm md:text-base mb-6">{storeSettings.tagline}</p>
                <a href="#inventory" className="bg-amber-600 text-white px-7 py-3 rounded-xl font-bold hover:bg-amber-500 transition shadow-lg shadow-amber-600/30 inline-block text-sm">Explore Catalog</a>
              </div>
            </div>
          </section>

          {/* CATALOG HEADER & SUB-CATEGORY FILTER DROPDOWN */}
          <section id="inventory" className="p-4 md:p-6 lg:p-8 pt-0">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  {selectedCategory === "All" ? "Complete Inventory" : selectedCategory}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Showing {filteredProducts.length} hardware products</p>
              </div>

              {/* DYNAMIC SUB-CATEGORY DROPDOWN */}
              {availableSubCategories.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 self-start sm:self-auto">
                  <Filter size={16} className="text-amber-500" />
                  <span className="text-xs text-slate-400 font-medium">Sub-Category:</span>
                  <select 
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="bg-transparent text-xs font-bold text-amber-400 outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-slate-900 text-white">All Sub-Categories</option>
                    {availableSubCategories.map(sub => (
                      <option key={sub} value={sub} className="bg-slate-900 text-white">{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(product => (
                <div key={product._id} className="bg-slate-900 rounded-2xl border border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col group shadow-lg">
                  {/* Image Container */}
                  <div className="h-44 md:h-52 overflow-hidden relative bg-slate-950/60 p-4 flex justify-center items-center">
                    <img 
                      src={getImageUrl(product.image)} 
                      alt={product.name} 
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          Low Stock ({product.stock})
                        </span>
                      )}
                      {product.isWeeklyDeal && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                          <Flame size={12} /> Weekly Deal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Container */}
                  <div className="p-4 flex flex-col flex-1 border-t border-slate-800/60">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">{product.subCategory || product.category}</p>
                    <h3 className="font-bold text-slate-100 text-xs md:text-sm mb-2 line-clamp-2 leading-snug">{product.name}</h3>
                    
                    {/* Gift promotion badge if available */}
                    {product.weeklyGiftDescription && (
                      <div className="mb-3 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5 text-[10px] text-amber-300">
                        <Gift size={12} className="text-amber-400 shrink-0" />
                        <span className="line-clamp-1">{product.weeklyGiftDescription}</span>
                      </div>
                    )}

                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-[10px]">Price</p>
                        <p className="text-amber-400 font-extrabold text-base md:text-lg">Ksh {product.price}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">In Stock: {product.stock}</span>
                    </div>

                    <button 
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className={`w-full mt-3 py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-xs transition shadow-md ${
                        product.stock === 0 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                      }`}
                    >
                      <ShoppingCart size={14} /> {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* EMPTY STATE */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-20 px-4 bg-slate-900 rounded-2xl border border-slate-800 mt-4">
                <AlertCircle className="mx-auto text-slate-600 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-200 mb-1">No Hardware Products Found</h3>
                <p className="text-slate-500 text-xs">Try selecting a different sub-category or clearing search queries.</p>
                <button 
                  onClick={() => {setSearchQuery(""); setSelectedCategory("All"); setSelectedSubCategory("All"); setShowDealsOnly(false);}} 
                  className="mt-5 text-amber-400 font-bold text-xs hover:underline"
                >
                  Reset all filters
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
        className="fixed bottom-6 right-6 bg-emerald-500 text-slate-950 p-3.5 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 flex items-center justify-center border-2 border-slate-900"
      >
        <MessageCircle size={26} />
      </a>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-white text-xl font-black mb-4 flex items-center gap-2"><Wrench className="text-amber-500"/> {storeSettings.storeName}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">{storeSettings.tagline}</p>
          </div>
          <div>
            <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Catalogue Links</h3>
            <ul className="space-y-2 text-xs">
              <li><a href="#inventory" onClick={() => setSelectedCategory("Vehicle Spare Parts")} className="hover:text-amber-400 transition">Vehicle Spare Parts</a></li>
              <li><a href="#inventory" onClick={() => setSelectedCategory("Motorcycle & Motorbike Parts")} className="hover:text-amber-400 transition">Motorcycle Spare Parts</a></li>
              <li><a href="#inventory" onClick={() => setSelectedCategory("Power & Hand Tools")} className="hover:text-amber-400 transition">Power & Hand Tools</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Contact & Support</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-300">📞 {storeSettings.contactPhone}</li>
              <li className="flex items-center gap-2 text-slate-300">✉️ support@prohardware.com</li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs border-t border-slate-800/80 pt-8 text-slate-500">
          &copy; {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved. Built for heavy-duty industrial performance.
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl w-full max-w-md p-8 relative shadow-2xl border border-slate-800">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full">
              <X size={18} />
            </button>
            <h2 className="text-2xl font-black text-white text-center mb-1">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-center text-slate-400 text-xs mb-6">Log in to process orders and cart items.</p>
            
            <form onSubmit={handleAuth} className="space-y-4 text-sm">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                    <input type="text" required value={authForm.fullName} onChange={e => setAuthForm({...authForm, fullName: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-amber-500 outline-none transition text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number</label>
                    <input type="tel" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-amber-500 outline-none transition text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email Address</label>
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-amber-500 outline-none transition text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Password</label>
                <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-950 border border-slate-800 text-white rounded-xl focus:border-amber-500 outline-none transition text-sm" />
              </div>
              
              <button type="submit" className="w-full bg-amber-600 text-white py-3.5 rounded-xl font-bold hover:bg-amber-500 transition shadow-lg shadow-amber-600/30 mt-2 text-sm">
                {authMode === 'login' ? 'Secure Login' : 'Register Account'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-xs text-slate-400">
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="ml-2 text-amber-400 hover:underline font-bold">
                {authMode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 2. CART DRAWER MODAL */}
      {showCart && (
        <div className="fixed inset-0 bg-slate-950/80 z-[60] flex justify-end backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-800">
            <div className="p-4 bg-slate-950 border-b border-slate-800 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="text-amber-500" size={20} /> Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-white"><X size={22} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!cart.items || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <ShoppingBag size={48} className="text-slate-700" />
                  <p className="text-sm font-medium">Your cart is empty.</p>
                </div>
              ) : (
                cart.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <img src={getImageUrl(item.product?.image)} alt="" className="w-16 h-16 object-contain bg-slate-900 rounded-lg p-1 border border-slate-800" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-200 text-xs line-clamp-2">{item.product?.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-extrabold text-amber-400 text-sm">Ksh {item.price}</span>
                        <button onClick={() => handleRemoveFromCart(item.product?._id)} className="text-red-400 hover:bg-red-500/10 p-1 rounded transition"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {(cart.items && cart.items.length > 0) && (
              <div className="p-6 bg-slate-950 border-t border-slate-800">
                <div className="flex justify-between text-base font-bold text-slate-200 mb-4">
                  <span>Total Amount</span>
                  <span className="text-amber-400">Ksh {cart.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)}</span>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Delivery / Workshop Address</label>
                  <textarea 
                    value={checkoutAddress} onChange={e => setCheckoutAddress(e.target.value)} 
                    className="w-full p-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs focus:border-amber-500 outline-none resize-none"
                    rows={2} placeholder="Enter your full street address or mechanic shop name..."
                  ></textarea>
                </div>
                <button onClick={handleCheckout} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
