'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingCart, User, Menu, X, MessageCircle, Upload, Plus, Package, Settings, LogOut } from 'lucide-react';

// --- API CONFIGURATION ---
const API_BASE_URL = 'https://nelly-best-collections-4.onrender.com';

// --- CATEGORIES DATA ---
const CATEGORIES: Record<string, string[]> = {
  "Male Clothes": ["Boxers", "Vests", "Soccer Shorts", "Ankle Socks"],
  "Female Clothes": ["Panties", "Bra's", "Blouse/Tops"],
  "Kids Wear": ["Socks", "Shoes", "Trousers", "Shirts", "Jackets"]
};

// Fallback data if the backend is completely empty
const FALLBACK_PRODUCTS = [
  { id: "fallback-1", name: "Cotton Boxers Pack", category: "Male Clothes", subCategory: "Boxers", price: 850, image: "https://images.unsplash.com/photo-1552514339-38b444747c32?w=400&q=80" },
  { id: "fallback-2", name: "Seamless Panties", category: "Female Clothes", subCategory: "Panties", price: 300, image: "https://images.unsplash.com/photo-1618228965007-96a66dc10cbf?w=400&q=80" },
  { id: "fallback-3", name: "Gym Vest", category: "Male Clothes", subCategory: "Vests", price: 400, image: "https://images.unsplash.com/photo-1509942774315-9cb26574f194?w=400&q=80" },
  { id: "fallback-4", name: "Push-up Bra", category: "Female Clothes", subCategory: "Bra's", price: 750, image: "https://images.unsplash.com/photo-1588661601050-058b888da87c?w=400&q=80" },
];

// Helper to format image URLs from the backend
const getImageUrl = (url: string) => {
  if (!url) return "";
  return url.startsWith('/uploads') ? `${API_BASE_URL}${url}` : url;
};

export default function NellyBestCollections() {
  // --- STATE MANAGEMENT ---
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displayCount, setDisplayCount] = useState(8);
  const [tagline, setTagline] = useState("Quality Fashion for Everyone");
  
  // --- AUTH STATE ---
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- ADMIN FORM STATES ---
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "Male Clothes", subCategory: "Boxers" });
  const [newProductFile, setNewProductFile] = useState<File | null>(null);
  const [weeklyDealId, setWeeklyDealId] = useState("");
  const [weeklyGift, setWeeklyGift] = useState("");

  // --- UI STATES ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // --- INITIALIZATION (Fetch data & check auth) ---
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
    }

    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.length > 0 ? data : FALLBACK_PRODUCTS);
          
          const deal = data.find((p: any) => p.isWeeklyDeal);
          if (deal) {
            setWeeklyDealId(deal._id || deal.id);
            setWeeklyGift(deal.weeklyGiftDescription || "");
          }
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
        setProducts(FALLBACK_PRODUCTS);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.tagline) setTagline(data.tagline);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };

    fetchProducts();
    fetchSettings();
  }, []);

  // --- SLIDESHOW LOGIC ---
  const slideImages = useMemo(() => {
    const list = products.length > 0 ? products : FALLBACK_PRODUCTS;
    return list.slice(0, 5).map(p => getImageUrl(p.image) || p.image);
  }, [products]);

  useEffect(() => {
    if (slideImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slideImages.length]);

  // --- FILTERING LOGIC ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.price.toString().includes(searchQuery);
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory || p.subCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // --- AUTH HANDLERS ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAdmin(true);
        setShowLogin(false);
        localStorage.setItem('adminToken', data.token);
        setEmail("");
        setPassword("");
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      alert("Error connecting to server");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('adminToken');
  };

  const addToCart = (product: any) => {
    setCart([...cart, product]);
  };

  // --- ADMIN ACTIONS ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('price', newProduct.price);
    formData.append('category', newProduct.category);
    formData.append('subCategory', newProduct.subCategory);
    if (newProductFile) {
      formData.append('image', newProductFile);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      if (res.ok) {
        alert("Product added successfully!");
        setNewProduct({ name: "", price: "", category: "Male Clothes", subCategory: "Boxers" });
        setNewProductFile(null);
        const updated = await fetch(`${API_BASE_URL}/api/products`).then(r => r.json());
        setProducts(updated);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to add product");
      }
    } catch (error) {
      alert("Error adding product");
    }
  };

  const handleUpdateSettings = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tagline })
      });
      if (res.ok) {
        alert("Tagline updated successfully!");
      } else {
        alert("Failed to update tagline");
      }
    } catch (error) {
      alert("Error updating settings");
    }
  };

  const handleWeeklyDealUpdate = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API_BASE_URL}/api/weekly-deal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ productId: weeklyDealId, weeklyGiftDescription: weeklyGift })
      });
      if (res.ok) {
        alert("Weekly deal updated successfully!");
        const updated = await fetch(`${API_BASE_URL}/api/products`).then(r => r.json());
        setProducts(updated);
      } else {
        alert("Failed to update weekly deal");
      }
    } catch (error) {
      alert("Error updating weekly deal");
    }
  };

  const weeklyDealProduct = products.find(p => p.isWeeklyDeal) || products[0] || FALLBACK_PRODUCTS[0];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={28} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 animate-[pulse_3s_ease-in-out_infinite]">
                Nelly Best Collections
              </h1>
              {isAdmin ? (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="text" 
                    value={tagline} 
                    onChange={(e) => setTagline(e.target.value)} 
                    className="text-xs text-gray-700 border-b border-pink-400 focus:outline-none bg-pink-50 px-1 py-0.5 rounded"
                  />
                  <button onClick={handleUpdateSettings} className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded hover:bg-pink-700">Save</button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">{tagline}</p>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <input 
              type="text" 
              placeholder="Search by name, category, or price..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <a href="#catalog" className="hidden md:block font-medium hover:text-pink-600 transition">Catalog</a>
            <a href="#footer" className="hidden md:block font-medium hover:text-pink-600 transition">Contact</a>
            
            <div className="relative cursor-pointer hover:text-pink-600">
              <ShoppingCart size={24} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>

            {isAdmin ? (
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-medium">
                <LogOut size={20} /> <span className="hidden md:block">Logout</span>
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-full hover:bg-pink-700 transition">
                <User size={20} /> <span className="hidden md:block">Login / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE SEARCH BAR */}
      <div className="md:hidden p-4 bg-white border-b">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-pink-500 outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row relative">
        {/* LEFT NAVIGATION BAR */}
        <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static top-0 left-0 h-full w-64 bg-white shadow-xl lg:shadow-none lg:border-r z-40 transition-transform duration-300 ease-in-out`}>
          <div className="p-4 flex justify-between items-center lg:hidden border-b">
            <span className="font-bold text-lg">Categories</span>
            <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
          </div>
          <div className="p-4 overflow-y-auto h-full pb-24">
            <button 
              onClick={() => {setSelectedCategory("All"); setIsMobileMenuOpen(false);}}
              className={`w-full text-left py-2 px-3 rounded-lg font-medium mb-2 ${selectedCategory === "All" ? "bg-pink-100 text-pink-700" : "hover:bg-gray-100"}`}
            >
              All Products
            </button>
            
            {Object.entries(CATEGORIES).map(([cat, subcats]) => (
              <div key={cat} className="mb-4">
                <button 
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left py-2 px-3 rounded-lg font-bold ${selectedCategory === cat ? "bg-pink-100 text-pink-700" : "hover:bg-gray-100"}`}
                >
                  {cat}
                </button>
                <div className="ml-4 mt-1 space-y-1">
                  {subcats.map(sub => (
                    <button 
                      key={sub}
                      onClick={() => {setSelectedCategory(sub); setIsMobileMenuOpen(false);}}
                      className={`block w-full text-left py-1.5 px-3 text-sm rounded-md ${selectedCategory === sub ? "text-pink-600 bg-pink-50" : "text-gray-600 hover:text-pink-600 hover:bg-gray-50"}`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 w-full lg:w-[calc(100%-16rem)]">
          {isAdmin ? (
            <div className="p-6 bg-pink-50 min-h-screen">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings /> Admin Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Add Product Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus /> Add New Product</h3>
                  <form onSubmit={handleAddProduct} className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Product Name" 
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full p-2 border rounded text-sm outline-none focus:border-pink-500" 
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Price (Ksh)" 
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full p-2 border rounded text-sm outline-none focus:border-pink-500" 
                      required
                    />
                    <select 
                      value={newProduct.category}
                      onChange={(e) => {
                        const cat = e.target.value;
                        const subcats = CATEGORIES[cat] || [];
                        setNewProduct({...newProduct, category: cat, subCategory: subcats[0] || ""});
                      }}
                      className="w-full p-2 border rounded text-sm outline-none focus:border-pink-500"
                    >
                      {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                      value={newProduct.subCategory}
                      onChange={(e) => setNewProduct({...newProduct, subCategory: e.target.value})}
                      className="w-full p-2 border rounded text-sm outline-none focus:border-pink-500"
                    >
                      {(CATEGORIES[newProduct.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Product Image</label>
                      <input 
                        type="file" 
                        onChange={(e) => e.target.files && setNewProductFile(e.target.files[0])}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                      />
                    </div>
                    <button type="submit" className="w-full bg-pink-600 text-white p-2 rounded text-sm font-semibold hover:bg-pink-700">Save Item</button>
                  </form>
                </div>

                {/* Recent Orders */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Package /> Recent Orders</h3>
                  <p className="text-gray-500 text-sm">Orders are managed via direct WhatsApp checkout.</p>
                </div>

                {/* Item of the Week Admin */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                  <h3 className="font-bold text-lg mb-4 text-pink-600">Set Item of the Week</h3>
                  <select 
                    value={weeklyDealId}
                    onChange={(e) => setWeeklyDealId(e.target.value)}
                    className="w-full p-2 border rounded mb-3 text-sm outline-none focus:border-pink-500"
                  >
                    {products.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Free Gift Description (e.g. Free Socks)" 
                    value={weeklyGift}
                    onChange={(e) => setWeeklyGift(e.target.value)}
                    className="w-full p-2 border rounded mb-3 text-sm outline-none focus:border-pink-500"
                  />
                  <button onClick={handleWeeklyDealUpdate} className="w-full bg-pink-600 text-white p-2 rounded text-sm font-semibold hover:bg-pink-700">Update Weekly Deal</button>
                </div>

              </div>
            </div>
          ) : (
            <>
              {/* HERO & SLIDESHOW SECTION */}
              <section className="p-4 md:p-6 lg:p-8 flex flex-col xl:flex-row gap-6">
                <div className="w-full xl:w-2/3 h-[300px] md:h-[400px] rounded-2xl overflow-hidden relative shadow-lg group">
                  {slideImages.map((img, idx) => (
                    <img 
                      key={idx} 
                      src={img} 
                      alt="Banner" 
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentSlide ? "opacity-100" : "opacity-0"}`}
                    />
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h2 className="text-3xl font-bold mb-2">New Arrivals</h2>
                    <p>Upgrade your wardrobe with our latest fashion trends.</p>
                  </div>
                </div>

                {/* Item of the Week (Glowing Effect) */}
                <div className="w-full xl:w-1/3 rounded-2xl p-1 bg-gradient-to-br from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(236,72,153,0.6)] animate-pulse">
                  <div className="bg-white w-full h-full rounded-xl p-6 flex flex-col justify-center items-center text-center">
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 animate-bounce">ITEM OF THE WEEK + FREE GIFT!</span>
                    <img src={getImageUrl(weeklyDealProduct.image) || weeklyDealProduct.image} alt="Weekly Deal" className="w-32 h-32 object-cover rounded-lg mb-4 shadow-md" />
                    <h3 className="font-bold text-xl mb-1">{weeklyDealProduct.name}</h3>
                    <p className="text-pink-600 font-bold text-lg mb-2">Ksh {weeklyDealProduct.price}</p>
                    <p className="text-sm text-gray-500">{weeklyDealProduct.weeklyGiftDescription || "Buy this today and get a free special gift!"}</p>
                    <button onClick={() => addToCart(weeklyDealProduct)} className="mt-4 w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </section>

              {/* PRODUCT CATALOG GRID */}
              <section id="catalog" className="p-4 md:p-6 lg:p-8">
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">{selectedCategory === "All" ? "All Products" : selectedCategory}</h2>
                  <span className="text-sm text-gray-500">{filteredProducts.length} items found</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.slice(0, displayCount).map(product => (
                    <div key={product._id || product.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden group flex flex-col">
                      <div className="h-48 md:h-56 overflow-hidden relative">
                        <img src={getImageUrl(product.image) || product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <span className="absolute top-2 right-2 bg-white/90 text-xs font-bold px-2 py-1 rounded shadow-sm text-gray-700">{product.subCategory}</span>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-pink-600 font-bold mb-3 mt-auto">Ksh {product.price}</p>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-full border border-pink-600 text-pink-600 py-2 rounded-lg hover:bg-pink-600 hover:text-white transition-colors flex justify-center items-center gap-2"
                        >
                          <ShoppingCart size={18} /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {displayCount < filteredProducts.length && (
                  <div className="mt-8 flex justify-center">
                    <button 
                      onClick={() => setDisplayCount(prev => prev + 8)}
                      className="bg-gray-900 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition shadow-md"
                    >
                      Show More Products
                    </button>
                  </div>
                )}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No products found matching your search or category.
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* WHATSAPP FLOATING BUTTON */}
      <a 
        href="https://wa.me/254768450250" 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-[0_4px_14px_rgba(34,197,94,0.5)] hover:scale-110 transition-transform z-50 flex items-center justify-center"
      >
        <MessageCircle size={32} />
      </a>

      {/* FOOTER */}
      <footer id="footer" className="bg-gray-900 text-gray-300 pt-12 pb-6 mt-12 border-t-4 border-pink-600">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white text-xl font-bold mb-4">Nelly Best Collections</h3>
            <p className="text-sm mb-4">Your one-stop shop for high-quality, fashionable clothing for men, women, and kids. Fast delivery and excellent customer service.</p>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-pink-400">Home</a></li>
              <li><a href="#catalog" className="hover:text-pink-400">Shop Catalog</a></li>
              <li><a href="#" className="hover:text-pink-400">About Us</a></li>
              <li><a href="#" className="hover:text-pink-400">Return Policy</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li>📞 Phone: +254 768 450250</li>
              <li>✉️ Email: muchirimunene031@gmail.com</li>
              <li>📍 Location: Mwea, Kenya</li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm border-t border-gray-800 pt-6">
          &copy; {new Date().getFullYear()} Nelly Best Collections. All rights reserved.
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-center mb-6">Welcome Back</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email / Username</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700 transition">
                Login
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
