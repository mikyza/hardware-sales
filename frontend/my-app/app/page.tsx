'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShoppingCart, User as UserIcon, Menu, X, MessageCircle, 
  Plus, Package, Settings, LogOut, Wrench, Car, Bike, Hammer, Zap, 
  Trash2, Edit, AlertCircle, CheckCircle, Users, ShoppingBag
} from 'lucide-react';

// --- API CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hardware-sales.onrender.com';

// --- HELPER TO FORMAT IMAGE URLS ---
const getImageUrl = (url: string) => {
  if (!url) return "https://via.placeholder.com/400?text=No+Image";
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

// --- ICON MAPPER ---
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'car': return <Car size={20} />;
    case 'bike': return <Bike size={20} />;
    case 'hammer': return <Hammer size={20} />;
    case 'zap': return <Zap size={20} />;
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
  const [newProduct, setNewProduct] = useState({ name: "", category: "", subCategory: "", price: "", stock: "", description: "" });
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", icon: "wrench" });

  // --- UI STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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
        alert(`Welcome, ${data.user.fullName}!`);
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
        alert("Added to cart!");
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
    Object.entries(newProduct).forEach(([key, val]) => formData.append(key, val));
    if (newProductFile) formData.append('image', newProductFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, { method: 'POST', headers: adminHeaders, body: formData });
      if (res.ok) {
        alert("Product added!");
        fetchInitialData();
        setNewProduct({ name: "", category: "", subCategory: "", price: "", stock: "", description: "" });
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

  // --- FILTERING ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory || p.subCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);


  // ==========================================
  // RENDER: ADMIN DASHBOARD
  // ==========================================
  const renderAdminPanel = () => (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <Settings className="text-amber-600" size={32} /> Admin Control Panel
        </h2>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 mb-8 bg-white p-2 rounded-lg shadow-sm">
          {['dashboard', 'products', 'categories', 'orders', 'users', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveAdminTab(tab as any)} className={`px-4 py-2 rounded-md font-semibold capitalize whitespace-nowrap ${activeAdminTab === tab ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        {activeAdminTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
              <p className="text-slate-500 text-sm">Total Products</p>
              <p className="text-3xl font-bold">{products.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500">
              <p className="text-slate-500 text-sm">Total Categories</p>
              <p className="text-3xl font-bold">{categories.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
              <p className="text-slate-500 text-sm">Total Orders</p>
              <p className="text-3xl font-bold">{adminData.orders.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
              <p className="text-slate-500 text-sm">Total Users</p>
              <p className="text-3xl font-bold">{adminData.users.length}</p>
            </div>
          </div>
        )}

        {activeAdminTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={20} /> Add Hardware Item</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Price (Ksh)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" required />
                  <input type="number" placeholder="Stock Qty" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" required />
                </div>
                <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" required>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
                <input type="text" placeholder="Sub-Category (e.g., Brakes)" value={newProduct.subCategory} onChange={e => setNewProduct({...newProduct, subCategory: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" required />
                <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-amber-500 outline-none" rows={3}></textarea>
                <input type="file" onChange={e => e.target.files && setNewProductFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" />
                <button type="submit" className="w-full bg-slate-900 text-white p-3 rounded font-bold hover:bg-amber-600 transition">Save Product</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm overflow-x-auto">
              <h3 className="font-bold text-lg mb-4 text-slate-800">Inventory</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 flex items-center gap-3">
                        <img src={getImageUrl(p.image)} className="w-10 h-10 rounded object-cover" alt="" />
                        <span className="font-medium line-clamp-1">{p.name}</span>
                      </td>
                      <td className="p-3 text-sm text-slate-500">{p.category}</td>
                      <td className="p-3 font-semibold text-amber-600">Ksh {p.price}</td>
                      <td className="p-3 text-sm">{p.stock}</td>
                      <td className="p-3"><button className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="bg-white p-6 rounded-xl shadow-sm overflow-x-auto">
            <h3 className="font-bold text-lg mb-4 text-slate-800">User Management</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminData.users.map((u: any) => (
                  <tr key={u._id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{u.fullName}</td>
                    <td className="p-3 text-slate-500 text-sm">{u.email}</td>
                    <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>{u.role}</span></td>
                    <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${u.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{u.isSuspended ? 'Suspended' : 'Active'}</span></td>
                    <td className="p-3">
                      {u.role !== 'admin' && (
                        <button onClick={() => toggleUserSuspension(u._id)} className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300">
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
           <div className="bg-white p-6 rounded-xl shadow-sm overflow-x-auto">
             <h3 className="font-bold text-lg mb-4 text-slate-800">Order Processing</h3>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-100 text-slate-600 text-sm">
                   <th className="p-3">Order ID</th>
                   <th className="p-3">Customer</th>
                   <th className="p-3">Total</th>
                   <th className="p-3">Status</th>
                   <th className="p-3">Update Status</th>
                 </tr>
               </thead>
               <tbody>
                 {adminData.orders.map((o: any) => (
                   <tr key={o._id} className="border-b hover:bg-slate-50">
                     <td className="p-3 text-xs text-slate-500">{o._id.substring(0, 8)}</td>
                     <td className="p-3 font-medium text-sm">{o.user?.fullName}</td>
                     <td className="p-3 font-bold text-amber-600">Ksh {o.totalAmount}</td>
                     <td className="p-3 capitalize">
                       <span className={`px-2 py-1 text-xs rounded-full ${o.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{o.status}</span>
                     </td>
                     <td className="p-3">
                        <select value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)} className="text-sm border p-1 rounded">
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
             <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4">Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <input type="text" placeholder="Category Name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full p-2 border rounded outline-none" required />
                  <input type="text" placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} className="w-full p-2 border rounded outline-none" />
                  <select value={newCategory.icon} onChange={e => setNewCategory({...newCategory, icon: e.target.value})} className="w-full p-2 border rounded outline-none">
                    <option value="wrench">Wrench (Tools)</option>
                    <option value="car">Car (Vehicle Parts)</option>
                    <option value="bike">Bike (Motorcycle)</option>
                    <option value="hammer">Hammer (Building)</option>
                    <option value="zap">Zap (Electrical)</option>
                  </select>
                  <button type="submit" className="w-full bg-slate-900 text-white p-2 rounded">Save Category</button>
                </form>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm">
               <h3 className="font-bold text-lg mb-4">Current Categories</h3>
               <ul className="space-y-2">
                 {categories.map(c => (
                   <li key={c._id} className="flex items-center gap-3 p-3 bg-slate-50 rounded border">
                     <span className="text-slate-500">{getIcon(c.icon)}</span>
                     <span className="font-medium">{c.name}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="bg-white p-6 rounded-xl shadow-sm max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Store Appearance & Info</h3>
            <form onSubmit={updateStoreSettings} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600">Store Name</label>
                <input type="text" value={storeSettings.storeName} onChange={e => setStoreSettings({...storeSettings, storeName: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Tagline</label>
                <input type="text" value={storeSettings.tagline} onChange={e => setStoreSettings({...storeSettings, tagline: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Hero Title</label>
                <input type="text" value={storeSettings.heroTitle} onChange={e => setStoreSettings({...storeSettings, heroTitle: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Contact Phone</label>
                <input type="text" value={storeSettings.contactPhone} onChange={e => setStoreSettings({...storeSettings, contactPhone: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <button type="submit" className="bg-amber-600 text-white px-6 py-2 rounded font-bold hover:bg-amber-700">Apply Settings</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );


  // ==========================================
  // MAIN RENDER: USER FACING STORE
  // ==========================================
  
  if (currentUser?.role === 'admin') {
    return (
      <div className="min-h-screen font-sans bg-slate-100">
        <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50">
          <h1 className="font-bold text-xl flex items-center gap-2"><Wrench className="text-amber-500"/> {storeSettings.storeName} Admin</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-700 transition"><LogOut size={16}/> Logout</button>
        </header>
        {renderAdminPanel()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-amber-500" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
                <Wrench className="text-amber-500 hidden sm:block" /> {storeSettings.storeName}
              </h1>
              <p className="text-xs text-slate-400 italic hidden sm:block">{storeSettings.tagline}</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
            <input 
              type="text" placeholder="Search vehicle parts, tools..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none placeholder-slate-400 transition"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative cursor-pointer hover:text-amber-400 transition" onClick={() => setShowCart(true)}>
              <ShoppingCart size={24} />
              {(cart.items?.length > 0) && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-slate-900">
                  {cart.items.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                </span>
              )}
            </div>

            {currentUser ? (
              <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-slate-300 hover:text-red-400 transition">
                <LogOut size={20} /> <span>Logout</span>
              </button>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition">
                <UserIcon size={20} /> <span className="hidden md:block">Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH */}
      <div className="md:hidden p-4 bg-slate-800 border-b border-slate-700">
        <div className="relative">
          <input 
            type="text" placeholder="Search hardware..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded bg-slate-700 text-white outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row relative">
        {/* SIDEBAR NAVIGATION */}
        <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-0 left-0 h-full w-72 bg-white shadow-2xl lg:shadow-none lg:border-r border-slate-200 z-50 transition-transform duration-300 ease-in-out`}>
          <div className="p-4 flex justify-between items-center lg:hidden border-b bg-slate-900 text-white">
            <span className="font-bold text-lg flex items-center gap-2"><Wrench className="text-amber-500"/> Categories</span>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>
          <div className="p-4 overflow-y-auto h-full pb-24">
            <button 
              onClick={() => {setSelectedCategory("All"); setIsMobileMenuOpen(false);}}
              className={`w-full text-left py-3 px-4 rounded-lg font-bold mb-2 flex items-center gap-3 transition ${selectedCategory === "All" ? "bg-amber-100 text-amber-800 border-l-4 border-amber-600" : "hover:bg-slate-100 text-slate-700"}`}
            >
              <ShoppingBag size={20} /> All Inventory
            </button>
            
            {categories.map((cat) => (
              <div key={cat._id} className="mb-2">
                <button 
                  onClick={() => {setSelectedCategory(cat.name); setIsMobileMenuOpen(false);}}
                  className={`w-full text-left py-3 px-4 rounded-lg font-bold flex items-center gap-3 transition ${selectedCategory === cat.name ? "bg-amber-100 text-amber-800 border-l-4 border-amber-600" : "hover:bg-slate-100 text-slate-700"}`}
                >
                  <span className="text-slate-500">{getIcon(cat.icon)}</span> {cat.name}
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN STOREFRONT */}
        <main className="flex-1 w-full lg:w-[calc(100%-18rem)]">
          {/* HERO BANNER */}
          <section className="p-4 md:p-6 lg:p-8">
            <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative shadow-xl h-[250px] md:h-[350px] flex items-center p-8 md:p-16">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="bg-amber-500 text-slate-900 font-bold px-3 py-1 rounded-full text-xs md:text-sm uppercase tracking-wider mb-4 inline-block">Industrial Grade</span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
                  {storeSettings.heroTitle}
                </h2>
                <p className="text-slate-300 md:text-lg mb-6">{storeSettings.tagline}</p>
                <a href="#inventory" className="bg-amber-600 text-white px-6 md:px-8 py-3 rounded-lg font-bold hover:bg-amber-500 transition shadow-lg shadow-amber-600/30">Shop Now</a>
              </div>
            </div>
          </section>

          {/* HARDWARE CATALOG */}
          <section id="inventory" className="p-4 md:p-6 lg:p-8 pt-0">
            <div className="flex justify-between items-end mb-6 pb-2 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                {selectedCategory === "All" ? "Complete Inventory" : selectedCategory}
              </h2>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{filteredProducts.length} items</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(product => (
                <div key={product._id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-shadow border border-slate-100 overflow-hidden flex flex-col group">
                  <div className="h-40 md:h-48 overflow-hidden relative bg-slate-50 p-4 flex justify-center items-center">
                    <img src={getImageUrl(product.image)} alt={product.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-md" />
                    {product.stock < 5 && (
                      <span className="absolute top-2 left-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded border border-red-200">Low Stock</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1 border-t border-slate-50">
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{product.subCategory}</p>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base mb-1 line-clamp-2 leading-tight">{product.name}</h3>
                    <p className="text-amber-600 font-extrabold text-lg mb-4 mt-auto">Ksh {product.price}</p>
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-amber-600 transition-colors flex justify-center items-center gap-2 text-sm font-bold shadow-md"
                    >
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-20 px-4 bg-white rounded-xl border border-slate-100 mt-4">
                <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Parts Found</h3>
                <p className="text-slate-500">We couldn't find any hardware matching your current filter.</p>
                <button onClick={() => {setSearchQuery(""); setSelectedCategory("All");}} className="mt-6 text-amber-600 font-bold hover:underline">Clear all filters</button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* WHATSAPP SUPPORT */}
      <a 
        href={`https://wa.me/${storeSettings.contactPhone.replace(/\s+/g, '')}`} 
        target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-xl hover:scale-110 transition-transform z-40 flex items-center justify-center border-4 border-white"
      >
        <MessageCircle size={28} />
      </a>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 pt-16 pb-8 border-t-4 border-amber-600">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-white text-xl font-extrabold mb-4 flex items-center gap-2"><Wrench className="text-amber-500"/> {storeSettings.storeName}</h3>
            <p className="text-sm leading-relaxed mb-6">{storeSettings.tagline}</p>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-amber-500 transition">Shop Catalog</a></li>
              <li><a href="#" className="hover:text-amber-500 transition">Returns & Warranty</a></li>
              <li><a href="#" className="hover:text-amber-500 transition">Bulk Corporate Orders</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">📞 <span className="font-medium text-white">{storeSettings.contactPhone}</span></li>
              <li className="flex items-center gap-2">✉️ <span className="font-medium text-white">support@prohardware.com</span></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm border-t border-slate-800 pt-8">
          &copy; {new Date().getFullYear()} {storeSettings.storeName}. All rights reserved. Built for professional performance.
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. AUTHENTICATION MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl border-t-4 border-amber-600">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition bg-slate-100 p-2 rounded-full">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-center text-slate-500 text-sm mb-8">Access your orders and fast checkout.</p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <input type="text" required value={authForm.fullName} onChange={e => setAuthForm({...authForm, fullName: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                    <input type="tel" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              
              <button type="submit" className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold hover:bg-amber-700 transition shadow-lg mt-4">
                {authMode === 'login' ? 'Secure Login' : 'Register Account'}
              </button>
            </form>
            
            <p className="text-center mt-6 text-sm text-slate-600 font-medium">
              {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="ml-2 text-amber-600 hover:underline font-bold">
                {authMode === 'login' ? 'Sign up here' : 'Log in here'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* 2. CART DRAWER MODAL */}
      {showCart && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease-out]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart /> Your Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-slate-300 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!cart.items || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <ShoppingBag size={64} className="text-slate-200" />
                  <p className="text-lg font-medium">Your cart is completely empty.</p>
                </div>
              ) : (
                cart.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <img src={getImageUrl(item.product?.image)} alt="" className="w-20 h-20 object-contain bg-white rounded border" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{item.product?.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-extrabold text-amber-600">Ksh {item.price}</span>
                        <button onClick={() => handleRemoveFromCart(item.product?._id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {(cart.items && cart.items.length > 0) && (
              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <div className="flex justify-between text-lg font-bold text-slate-800 mb-4">
                  <span>Total Amount</span>
                  <span className="text-amber-600">Ksh {cart.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)}</span>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Shipping / Garage Address</label>
                  <textarea 
                    value={checkoutAddress} onChange={e => setCheckoutAddress(e.target.value)} 
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                    rows={2} placeholder="Enter full delivery location or mechanics shop..."
                  ></textarea>
                </div>
                <button onClick={handleCheckout} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-600/30 transition flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
