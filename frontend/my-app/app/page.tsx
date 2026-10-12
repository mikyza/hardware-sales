"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingCart, User as UserIcon, LogIn, Menu, X, Plus, Minus,
  Trash2, Shield, Clock, Search, Edit, Package, Activity,
  CheckCircle, AlertCircle, Settings, ChevronRight,
  ShoppingBag, Users, Image as ImageIcon, Video, Download,
  MapPin, Eye, EyeOff, RefreshCw, LogOut, Check, AlertTriangle,
  Smartphone, Truck, CreditCard, BarChart2, DollarSign,
  Award, Calendar, Lock, Unlock, TrendingUp, Filter,
  FileText, Percent, Layers, Globe, Sliders, Bell, ArrowRight,
  ChevronDown, ArrowUpRight, HelpCircle, Star, PhoneCall,
  XCircle, Zap, Ban, UserCheck, UserX, ShieldAlert, FileSpreadsheet,
  Copy, Link2, Headphones, Wallet, Briefcase, StickyNote, MessageSquare,
  Wrench, Car, Bike, ShieldCheck, Hammer, Tags, Flame, Store, Phone, Mail, Loader2, SlidersHorizontal, BadgeCheck, Box
} from 'lucide-react';

// Realtime is optional: the app polls the API, so socket.io-client is not required.
type Socket = any;

export interface ToastMessage { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; }

export interface Product {
  id: number; name: string; brandName: string; category?: string; subCategory?: string; brand?: string; sku?: string; unit?: string;
  price: number; originalPrice?: number; basePrice?: number; buyingPrice?: number | null; flashSalePrice?: number | null;
  stock: number; stockQuantity: number; weightKg?: number; image?: string | null; imageUrl?: string | null; description?: string | null;
  isAvailable?: boolean; isOffer?: boolean; offerDiscount?: number; offerType?: 'fixed' | 'percent'; offerDescription?: string; offerLabel?: string | null;
  onOffer?: boolean; isBlackFridayApplied?: boolean; ratingAvg?: number; ratingCount?: number; wholesaleTiers?: { minQty: number; price: number }[];
  createdAt?: string;
}
export interface UserAccount {
  id: number; fullName: string; email?: string | null; phoneNumber: string;
  role: 'user' | 'customer' | 'admin' | 'support' | 'agent'; referralCode?: string; rewardPoints: number; isActive?: boolean; isSuspended?: boolean; createdAt?: string;
}

const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL || 'https://hardware-sales.onrender.com').replace(/\/$/, '')}/api`;
const FILE_BASE_URL = API_BASE_URL.replace(/\/api$/, '');
const TERMS_VERSION_FALLBACK = '2026-11';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
const getImageUrl = (url?: string | null) => (!url ? FALLBACK_IMG : /^(https?:|data:)/.test(url) ? url : `${FILE_BASE_URL}${url}`);



export interface OrderItem {
  id?: number;
  productId: number;
  quantity: number;
  priceAtPurchase: number;
  brandName?: string;
  name?: string;
  weightKg?: number;
  imageUrl?: string;
}

export interface Order {
  id: number;
  userId?: number | null;
  User?: UserAccount | null;
  items: OrderItem[];
  paymentMethod: string;
  mpesaPhoneNumber?: string;
  county: string;
  town?: string;
  location?: string;
  sublocation?: string;
  streetAddress?: string;
  shippingAddress: string;
  shippingFee: number;
  grandTotal: number;
  status: 'pending' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  paymentDetails?: {
    isPaid?: boolean;
    paidTag?: 'PAID' | 'PENDING' | 'FAILED';
    mpesaReceipt?: string | null;
    failureReason?: string | null;
    method?: string;
    paidAt?: string | null;
    rawCallback?: any;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: number;
  action: string;
  performedByUserId?: number;
  performedByName: string;
  performedByEmail?: string;
  module: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface FinancialMonth {
  monthIndex: number; // 0 = Jan, 11 = Dec
  monthName: string;
  year: number;
  totalRevenue: number;
  totalBuyingCost: number;
  netProfit: number;
  totalKgSold: number;
  orderCount: number;
}

export interface FinancialAnalyticsResponse {
  year: number;
  availableYears: number[];
  monthlyBreakdown: FinancialMonth[];
  summary: {
    totalMoneyReceived: number;
    totalBuyingCosts: number;
    totalNetProfit: number;
    totalKgSold: number;
    totalOrdersCount: number;
    totalPointsAwarded: number;
  };
}

export interface HeroSettings {
  title: string;
  subtitle: string;
  video1: string;
  video2: string;
  img1: string;
  img2: string;
  img3: string;
  ctaButtonText: string;
  secondaryButtonText: string;
  badgeText: string;
  overlayOpacity: string | number;
  announcementTicker: string;
  themeAccentColor: string;
  heroLayoutMode: string;
  enableLiveTicker: boolean;
  promoBadgeColor: string;
  bannerHeight: string;
  featuredTagLabel: string;
  customerTrustBadgeText: string;
  supportHotlineDisplay: string;
  expressLogisticsNote: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
  product: Product;
}


export const normalizeKenyanPhone = (raw: string | null | undefined): string | null => {
  const str = String(raw ?? '').trim();
  if (!str || str.includes('@')) return null;
  let digits = str.replace(/\D/g, '');
  if (digits.startsWith('2540') && digits.length === 13) digits = `254${digits.slice(4)}`;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `254${digits}`;
  return null;
};


export const normPlaceName = (v: string | null | undefined): string =>
  String(v ?? '').toLowerCase().replace(/\bcounty\b/g, '').replace(/[^a-z0-9]/g, '');

/** Looks up a county's freight fee whatever spelling the county is stored under. */
export const getCountyFee = (overrides: { [key: string]: number }, county: string): number | undefined => {
  if (!overrides) return undefined;
  if (overrides[county] !== undefined) return Number(overrides[county]);
  const wanted = normPlaceName(county);
  const key = Object.keys(overrides).find(k => normPlaceName(k) === wanted);
  return key !== undefined ? Number(overrides[key]) : undefined;
};


export const ALL_47_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", 
  "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", 
  "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", 
  "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", 
  "Siaya", "Kisumu", "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi"
] as const;


const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ============================================================================
// 3. UTILITY FUNCTIONS
// ============================================================================

const formatKES = (amount: number) => {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount || 0);
};

const formatShippingAddress = (addr: any) => {
  if (!addr) return 'Standard Regional Delivery';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    return addr.streetAddress || addr.details || addr.location || [addr.town, addr.county].filter(Boolean).join(', ') || JSON.stringify(addr);
  }
  return String(addr);
};

const extractPaymentInfo = (order: any) => {
  if (!order) return { status: 'PENDING', isPaid: false, receipt: null, reason: null, method: 'M-Pesa STK', paidAt: null };
  
  const pd = order.paymentDetails || {};
  const isPaid = pd.isPaid === true || pd.paidTag === 'PAID' || order.status === 'paid' || order.status === 'completed' || order.status === 'delivered';
  const tag = pd.paidTag || (isPaid ? 'PAID' : (pd.failureReason || order.status === 'payment_failed' ? 'FAILED' : 'PENDING'));
  
  return {
    status: tag,
    isPaid: isPaid,
    receipt: pd.mpesaReceipt || pd.rawCallback?.mpesa_code || null,
    reason: pd.failureReason || null,
    method: pd.method || 'M-Pesa STK',
    paidAt: pd.paidAt || null
  };
};

const formatCountdownMs = (ms: number) => {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ============================================================================
// 4. CUSTOM FINANCIAL GROWTH CHART COMPONENT (SVG-BASED)
// Dynamic graph showing real monthly growth from database with empty month visualizers
// ============================================================================

interface FinancialGrowthChartProps {
  monthlyData: FinancialMonth[];
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
  isLoading?: boolean;
}

const FinancialGrowthChart: React.FC<FinancialGrowthChartProps> = ({
  monthlyData,
  selectedYear,
  availableYears,
  onYearChange,
  isLoading = false
}) => {
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'kg'>('revenue');

  // Normalize 12 months array ensuring all 12 months (Jan - Dec) exist even if empty
  const fullYearMonths = useMemo(() => {
    const list: FinancialMonth[] = [];
    for (let i = 0; i < 12; i++) {
      const found = monthlyData?.find(m => m.monthIndex === i);
      if (found) {
        list.push(found);
      } else {
        list.push({
          monthIndex: i,
          monthName: MONTH_NAMES_SHORT[i],
          year: selectedYear,
          totalRevenue: 0,
          totalBuyingCost: 0,
          netProfit: 0,
          totalKgSold: 0,
          orderCount: 0
        });
      }
    }
    return list;
  }, [monthlyData, selectedYear]);

  // Compute maximum values for SVG height scaling
  const maxValue = useMemo(() => {
    let max = 0;
    fullYearMonths.forEach(m => {
      const val = metric === 'revenue' ? m.totalRevenue : metric === 'profit' ? m.netProfit : m.totalKgSold;
      if (val > max) max = val;
    });
    return max > 0 ? max * 1.15 : 10000;
  }, [fullYearMonths, metric]);

  const svgWidth = 800;
  const svgHeight = 280;
  const paddingX = 50;
  const paddingY = 40;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Generate SVG Points for Line / Area Chart
  const points = useMemo(() => {
    return fullYearMonths.map((m, idx) => {
      const val = metric === 'revenue' ? m.totalRevenue : metric === 'profit' ? m.netProfit : m.totalKgSold;
      const x = paddingX + (idx / 11) * graphWidth;
      const y = svgHeight - paddingY - (val / maxValue) * graphHeight;
      return { x, y, val, month: m.monthName, orders: m.orderCount, data: m };
    });
  }, [fullYearMonths, metric, maxValue, graphWidth, graphHeight]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [pathD, points, svgHeight, paddingY]);

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-emerald-900/60 shadow-2xl space-y-6">
      
      {/* Top Controls & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-black text-white">Database Financial Growth Engine</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monthly aggregation from verified paid customer orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Select Year:</span>
            <select 
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="bg-slate-900 text-emerald-400 font-extrabold px-2 py-1 rounded-lg border border-emerald-500/30 focus:outline-none cursor-pointer"
            >
              {(availableYears && availableYears.length > 0 ? availableYears : [2024, 2025, 2026, 2027]).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button 
              onClick={() => setMetric('revenue')}
              className={`px-3 py-1 rounded-lg transition-all ${metric === 'revenue' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Revenue
            </button>
            <button 
              onClick={() => setMetric('profit')}
              className={`px-3 py-1 rounded-lg transition-all ${metric === 'profit' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Net Profit
            </button>
            <button 
              onClick={() => setMetric('kg')}
              className={`px-3 py-1 rounded-lg transition-all ${metric === 'kg' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Grain Volume (Kg)
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Graphics */}
      <div className="relative w-full overflow-x-auto">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
            <span>Retrieving real-time purchase logs from database...</span>
          </div>
        ) : (
          <div className="min-w-[650px]">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yVal = svgHeight - paddingY - ratio * graphHeight;
                const gridVal = Math.round(ratio * maxValue);
                return (
                  <g key={i}>
                    <line 
                      x1={paddingX} 
                      y1={yVal} 
                      x2={svgWidth - paddingX} 
                      y2={yVal} 
                      stroke="#334155" 
                      strokeDasharray="4 4" 
                      strokeWidth="1"
                    />
                    <text 
                      x={paddingX - 8} 
                      y={yVal + 4} 
                      fill="#64748b" 
                      fontSize="10" 
                      textAnchor="end" 
                      fontWeight="600"
                    >
                      {metric === 'kg' ? `${gridVal}kg` : `KES ${gridVal >= 1000 ? `${(gridVal/1000).toFixed(0)}k` : gridVal}`}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area Fill */}
              <path 
                d={areaD} 
                fill={metric === 'revenue' ? "url(#emeraldGrad)" : metric === 'profit' ? "url(#tealGrad)" : "url(#amberGrad)"} 
              />

              {/* Chart Line */}
              <path 
                d={pathD} 
                fill="none" 
                stroke={metric === 'revenue' ? "#10b981" : metric === 'profit' ? "#14b8a6" : "#f59e0b"} 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Month Data Points & Empty Indicators */}
              {points.map((p, idx) => {
                const isEmpty = p.val === 0;

                return (
                  <g key={idx} className="group cursor-pointer">
                    {/* Vertical guideline */}
                    <line 
                      x1={p.x} 
                      y1={paddingY} 
                      x2={p.x} 
                      y2={svgHeight - paddingY} 
                      stroke="#1e293b" 
                      strokeWidth="1"
                      className="group-hover:stroke-slate-500 transition-colors"
                    />

                    {/* Data Point Marker */}
                    {isEmpty ? (
                      /* Empty Month Visual Tag */
                      <g>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="4" 
                          fill="#0f172a" 
                          stroke="#64748b" 
                          strokeWidth="2" 
                        />
                        <text 
                          x={p.x} 
                          y={p.y - 10} 
                          fill="#64748b" 
                          fontSize="9" 
                          textAnchor="middle"
                          fontWeight="700"
                        >
                          Empty
                        </text>
                      </g>
                    ) : (
                      /* Active Month Data Marker */
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="6" 
                        fill={metric === 'revenue' ? "#10b981" : metric === 'profit' ? "#14b8a6" : "#f59e0b"} 
                        stroke="#0f172a" 
                        strokeWidth="3" 
                        className="group-hover:r-8 transition-all"
                      />
                    )}

                    {/* X-Axis Month Name Label */}
                    <text 
                      x={p.x} 
                      y={svgHeight - paddingY + 20} 
                      fill={isEmpty ? "#64748b" : "#f8fafc"} 
                      fontSize="11" 
                      fontWeight={isEmpty ? "500" : "800"} 
                      textAnchor="middle"
                    >
                      {p.month}
                    </text>

                    {/* Hover Tooltip Popup */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <rect 
                        x={p.x - 65} 
                        y={p.y - 55} 
                        width="130" 
                        height="45" 
                        rx="8" 
                        fill="#022c22" 
                        stroke="#10b981" 
                        strokeWidth="1.5" 
                      />
                      <text x={p.x} y={p.y - 38} fill="#ffffff" fontSize="10" fontWeight="800" textAnchor="middle">
                        {p.month} {selectedYear}
                      </text>
                      <text x={p.x} y={p.y - 22} fill="#34d399" fontSize="11" fontWeight="900" textAnchor="middle">
                        {isEmpty ? 'No Purchases' : metric === 'kg' ? `${p.val} kg` : formatKES(p.val)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Monthly Data Matrix Table (Highlights Zero Value / Empty Months) */}
      <div className="pt-4 border-t border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Monthly Ledger Breakdown ({selectedYear})
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {fullYearMonths.map((m) => {
            const isEmpty = m.totalRevenue === 0;

            return (
              <div 
                key={m.monthIndex} 
                className={`p-3 rounded-2xl border transition-all ${
                  isEmpty 
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-500' 
                    : 'bg-slate-800/60 border-emerald-900/40 text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <span>{m.monthName}</span>
                  {isEmpty ? (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      Empty
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      {m.orderCount} Orders
                    </span>
                  )}
                </div>

                <div className="text-sm font-extrabold text-white">
                  {isEmpty ? '-' : formatKES(m.totalRevenue)}
                </div>

                {!isEmpty && (
                  <div className="flex justify-between items-center text-[10px] mt-1 text-slate-400">
                    <span>Profit:</span>
                    <span className="text-teal-400 font-bold">{formatKES(m.netProfit)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

// ============================================================================
// 5. REUSABLE PRODUCT CARD COMPONENT
// Prioritizes phone screen priority (2 items per row on small devices, 4 on desktop)
// ============================================================================

/** Price per bag for a quantity: the best of the normal/flash price and any bulk tier (mirrors the server). */

const TERMS_VERSION = '2026-11';
const MIN_PASSWORD_LENGTH = 8;

/** Advises on strength but never blocks: anything with 8+ characters is allowed. */
const assessPassword = (pw: string) => {
  const tips: string[] = [];
  if (!pw) return { score: 0, label: '', tips, color: 'bg-slate-200', text: 'text-slate-400' };
  const lower = pw.toLowerCase();
  const common = ['password', '12345678', '123456789', '1234567890', 'qwertyui', 'qwerty123', 'iloveyou', 'abc12345', '11111111', '00000000', 'admin123', 'welcome1', 'mwearice'];
  const isCommon = common.some(c => lower.includes(c));
  const hasLower = /[a-z]/.test(pw), hasUpper = /[A-Z]/.test(pw), hasNum = /\d/.test(pw), hasSym = /[^A-Za-z0-9]/.test(pw);
  const variety = [hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length;
  const repeated = /^(.)\1+$/.test(pw) || /(.)\1{3,}/.test(pw);
  const sequence = /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer|asdf|zxcv)/i.test(pw);

  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (pw.length >= 12) score += 1;
  if (variety >= 3) score += 1;
  if (variety === 4 || pw.length >= 16) score += 1;
  if (isCommon || repeated) score = Math.min(score, 1);
  else if (sequence) score = Math.min(score, 2);
  if (pw.length < MIN_PASSWORD_LENGTH) score = 0;

  if (pw.length < MIN_PASSWORD_LENGTH) tips.push(`Use at least ${MIN_PASSWORD_LENGTH} characters (${MIN_PASSWORD_LENGTH - pw.length} more).`);
  if (isCommon) tips.push('This looks like a very common password.');
  else if (repeated) tips.push('Avoid repeating the same character.');
  else if (sequence) tips.push('Avoid simple sequences like 1234 or qwerty.');
  if (pw.length >= MIN_PASSWORD_LENGTH && score < 3) {
    if (!hasUpper || !hasLower) tips.push('Mix upper and lower case letters.');
    if (!hasNum) tips.push('Add a number.');
    if (!hasSym) tips.push('Add a symbol such as ! or #.');
    if (pw.length < 12) tips.push('A longer password (12+ characters) is much harder to guess.');
  }
  const levels = [
    { label: 'Too short', color: 'bg-rose-500', text: 'text-rose-600' },
    { label: 'Weak', color: 'bg-orange-500', text: 'text-orange-600' },
    { label: 'Fair', color: 'bg-amber-400', text: 'text-amber-600' },
    { label: 'Good', color: 'bg-lime-500', text: 'text-lime-600' },
    { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' }
  ];
  return { score, ...levels[score], tips: tips.slice(0, 3) };
};

function PasswordStrength({ value }: { value: string }) {
  if (!value) return <p className="text-[10px] text-slate-400 mt-1">At least {MIN_PASSWORD_LENGTH} characters. A longer mix of letters, numbers and symbols is safer.</p>;
  const a = assessPassword(value);
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-4 gap-1">
          {[1, 2, 3, 4].map(i => <div key={i} className={`h-1.5 rounded-full ${a.score >= i ? a.color : 'bg-slate-200'}`} />)}
        </div>
        <span className={`text-[10px] font-black uppercase ${a.text}`}>{a.label}</span>
      </div>
      {a.tips.length > 0 && <p className="text-[10px] text-slate-500 leading-snug">{a.tips.join(' ')}</p>}
      {value.length >= MIN_PASSWORD_LENGTH && a.score < 3 && <p className="text-[10px] font-bold text-slate-500">You can still use this password, but a stronger one protects your account better.</p>}
    </div>
  );
}

const TERMS_SECTIONS: { title: string; body: string[] }[] = [
  { title: '1. About these terms', body: [
    'These Terms and Conditions govern your use of the ProHardware website and the purchase of rice and related products through it ("the Service"). By creating an account or placing an order you agree to them. If you do not agree, please do not use the Service.'
  ]},
  { title: '2. Your account', body: [
    'You must give accurate information when you register, including a working phone number that can receive SMS verification codes. You are responsible for keeping your password private and for everything done through your account.',
    'You must be at least 18 years old, or have a parent or guardian\'s permission. We may suspend or close accounts that give false information, abuse the Service or are used for fraud.'
  ]},
  { title: '3. Products and prices', body: [
    'All prices are in Kenyan Shillings (KES). Prices, stock, flash-sale offers and bulk (quantity) prices can change at any time; the price shown when you pay is the price you are charged. Flash-sale prices apply only while the sale is running, and where both a flash-sale price and a bulk price apply you get the lower one. Product pictures are for illustration and packaging may vary slightly.'
  ]},
  { title: '4. Orders and payment', body: [
    'Payment is made by M-Pesa STK push, processed by PayHero. An order is confirmed only after your payment is received and verified. If you do not complete the M-Pesa prompt, the order stays unpaid and may be cancelled.',
    'Always keep your M-Pesa confirmation message. If you were charged but your order shows unpaid, contact customer care with your M-Pesa receipt and we will resolve it.'
  ]},
  { title: '5. Delivery', body: [
    'We deliver across Kenya. A delivery fee based on your county is added at checkout. Delivery times are estimates and can be affected by distance, weather and road conditions. You must give a complete, correct delivery address and be reachable on your phone; we are not responsible for delays or failed deliveries caused by wrong or incomplete details.'
  ]},
  { title: '6. Inspection, returns and refunds', body: [
    'Please inspect your rice on delivery. Report a damaged, wrong or short-weight order to customer care as soon as possible, ideally within 24 hours, with photos where you can. Where the problem is confirmed we will replace the item or refund you. Opened food products that are in good condition cannot normally be returned.'
  ]},
  { title: '6a. Reviews', body: [
    'Only customers who have bought and paid for a product can review it. Reviews must be honest and respectful. We may hide reviews that are abusive, misleading, contain personal details or are unrelated to the product. Your first name and the initial of your last name are shown with your review.'
  ]},
  { title: '7. Reward points', body: [
    'You may earn reward points on paid orders. Points have no cash value, cannot be transferred and can be corrected or removed if they were earned by mistake or through misuse of the Service.'
  ]},
  { title: '8. Referral codes and agents', body: [
    'You may enter an agent\'s referral code when you sign up or order. Once a code is linked to your account it stays linked. Using a code does not change the price you pay. Agents earn commission from us; it is never charged to you.',
    'Agents must not mislead customers, make false claims about our products or use another person\'s code or details. We may withdraw an agent\'s role and unpaid commission where these rules are broken.'
  ]},
  { title: '9. Acceptable use', body: [
    'You must not misuse the Service: no fraud, no attempts to break into accounts or systems, no automated scraping or abuse of verification codes, and no use that harms other customers or us.'
  ]},
  { title: '10. Your personal data', body: [
    'We collect your name, phone number, email (if given), delivery details, order and payment records, and the technical information needed to keep the Service secure (such as IP address and sign-in activity). We use it to run your account, process and deliver orders, send verification codes and order messages, prevent fraud and improve the Service.',
    'We share only what is needed with our payment provider (PayHero/M-Pesa), our SMS provider and delivery partners. We do not sell your personal data. Customer care staff can see your account and order details to help you. Under the Kenya Data Protection Act, 2019 you may ask to see, correct or delete your personal data by contacting us.'
  ]},
  { title: '11. Messages', body: [
    'By registering you agree that we may send you SMS or email messages about verification codes, orders, payments and delivery. We may also send occasional promotional offers by SMS. Every promotional message contains an opt-out link, and you can switch promotions off at any time in your account; you will still receive order, payment and security messages.'
  ]},
  { title: '12. Our responsibility', body: [
    'We take care to deliver safe, good quality rice, but to the extent allowed by law we are not liable for indirect losses, or for delays or failures outside our reasonable control, including network, M-Pesa or courier outages. Nothing in these terms limits rights you have under Kenyan consumer protection law.'
  ]},
  { title: '13. Changes to these terms', body: [
    'We may update these terms. The current version is shown here with its version number. If we make an important change we will ask you to accept it again; continuing to use the Service after a change means you accept the updated terms.'
  ]},
  { title: '14. Governing law and contact', body: [
    'These terms are governed by the laws of Kenya. For questions, complaints or data requests, contact ProHardware at mweadirectrice@gmail.com.'
  ]}
];

function TermsModal({ onClose, onAccept }: { onClose: () => void; onAccept?: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Terms and Conditions">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">Terms and Conditions</h3>
            <p className="text-[11px] text-slate-500">ProHardware · version {TERMS_VERSION}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {TERMS_SECTIONS.map(sec => (
            <section key={sec.title}>
              <h4 className="font-black text-slate-900 mb-1">{sec.title}</h4>
              {sec.body.map((p, i) => <p key={i} className="mb-1.5">{p}</p>)}
            </section>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">Close</button>
          {onAccept && <button type="button" onClick={onAccept} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer">I have read and accept</button>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OPERATIONS SCREENS: reports, stock & suppliers, expenses, campaigns, reviews, system
// ============================================================================
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const rangePresets = () => {
  const now = new Date();
  const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
  return [
    { label: 'Today', from: ymd(now), to: ymd(now) },
    { label: '7 days', from: ymd(daysAgo(6)), to: ymd(now) },
    { label: '30 days', from: ymd(daysAgo(29)), to: ymd(now) },
    { label: 'This month', from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) },
    { label: 'Last month', from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) },
    { label: 'This year', from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now) }
  ];
};

const downloadExcel = async (type: string, from: string, to: string, token: string | null, showToast: ToastFn) => {
  try {
    const res = await fetch(`${API_BASE_URL}/admin/export/${type}?from=${from}&to=${to}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Export failed'); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-${to}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('Excel file downloaded.', 'success');
  } catch (err: any) { showToast(err.message, 'error'); }
};

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white';
const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1';
const cardCls = 'bg-slate-900 rounded-3xl border border-slate-800';

const DateRange = ({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) => (
  <div className="flex flex-wrap items-center gap-2">
    {rangePresets().map(p => (
      <button key={p.label} onClick={() => onChange(p.from, p.to)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${from === p.from && to === p.to ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{p.label}</button>
    ))}
    <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)} className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white" />
    <span className="text-slate-500 text-xs">to</span>
    <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white" />
  </div>
);

// ---------------------------------------------------------------------------
// PROFIT REPORTS & EXCEL EXPORTS
// ---------------------------------------------------------------------------
function AdminReportsPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const p30 = rangePresets()[2];
  const [from, setFrom] = useState(p30.from);
  const [to, setTo] = useState(p30.to);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<'byProduct' | 'byCounty' | 'byAgent' | 'byMonth' | 'byDay'>('byProduct');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await staffApi(`/admin/reports/profit?from=${from}&to=${to}`, token)); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setLoading(false); }
  }, [token, from, to]);
  useEffect(() => { load(); }, [load]);

  const t = data?.totals;
  const rows: any[] = data ? data[group] : [];
  const maxProfit = Math.max(1, ...rows.map(r => Math.abs(r.profit)));
  const groupLabels: Record<string, string> = { byProduct: 'Product', byCounty: 'County', byAgent: 'Agent', byMonth: 'Month', byDay: 'Day' };

  return (
    <div className="space-y-6">
      <div className={`${cardCls} p-5 space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Profit reports</h3>
            <p className="text-[11px] text-slate-500">Based on paid orders and the buying prices recorded when each order was placed.</p>
          </div>
          <DateRange from={from} to={to} onChange={(f, tt) => { setFrom(f); setTo(tt); }} />
        </div>
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
          <span className="text-[10px] font-black uppercase text-slate-500 self-center mr-1">Download Excel:</span>
          {[['orders', 'Orders'], ['customers', 'Customers'], ['finances', 'Finances (profit, expenses, commissions)'], ['stock', 'Stock']].map(([k, label]) => (
            <button key={k} onClick={() => downloadExcel(k, from, to, token, showToast)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" /> {label}</button>
          ))}
        </div>
      </div>

      {loading && !data && <p className="text-xs text-slate-500 font-bold">Calculating…</p>}
      {t && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StaffStat label="Product sales" value={formatKES(t.riceRevenue)} hint={`${t.orders} paid orders · ${t.kg} kg`} />
            <StaffStat label="Cost of items sold" value={formatKES(t.costOfGoods)} tone="amber" />
            <StaffStat label="Gross profit" value={formatKES(t.grossProfit)} tone="emerald" hint={`${data.margin}% margin`} />
            <StaffStat label="Delivery fees collected" value={formatKES(t.deliveryIncome)} tone="sky" />
            <StaffStat label="Agent commissions" value={formatKES(t.commissions)} tone="amber" />
            <StaffStat label="Expenses" value={formatKES(t.expenses)} tone="amber" />
            <StaffStat label="Net profit" value={formatKES(t.netProfit)} tone={t.netProfit >= 0 ? 'emerald' : 'rose'} hint="gross + delivery − commissions − expenses" />
            <StaffStat label="Average per order" value={formatKES(t.orders ? t.netProfit / t.orders : 0)} />
          </div>

          <div className={`${cardCls} overflow-hidden`}>
            <div className="p-3 flex flex-wrap gap-2 border-b border-slate-800">
              {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map(k => (
                <button key={k} onClick={() => setGroup(k as any)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${group === k ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>By {groupLabels[k].toLowerCase()}</button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">{groupLabels[group]}</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Kg</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th>{group === 'byAgent' && <th className="p-3 text-right">Commission</th>}{group === 'byAgent' && <th className="p-3 text-right">After commission</th>}<th className="p-3 w-32"></th></tr></thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-slate-500 font-bold">No paid orders in this period.</td></tr>}
                  {rows.map((r: any) => (
                    <tr key={r.key} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{r.label}</td>
                      <td className="p-3 text-right">{r.orders}</td><td className="p-3 text-right">{r.kg}</td>
                      <td className="p-3 text-right">{formatKES(r.revenue)}</td><td className="p-3 text-right text-slate-400">{formatKES(r.cost)}</td>
                      <td className={`p-3 text-right font-black ${r.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKES(r.profit)}</td>
                      <td className="p-3 text-right">{r.margin}%</td>
                      {group === 'byAgent' && <td className="p-3 text-right text-amber-400">{formatKES(r.commission)}</td>}
                      {group === 'byAgent' && <td className="p-3 text-right font-bold">{formatKES(r.net)}</td>}
                      <td className="p-3"><div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${r.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(2, (Math.abs(r.profit) / maxProfit) * 100)}%` }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {Object.keys(data.expenseByCategory).length > 0 && (
            <div className={`${cardCls} p-5`}>
              <p className="text-xs font-black text-white mb-3">Where the money went (expenses)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(data.expenseByCategory).map(([c, v]: any) => (
                  <div key={c} className="p-3 rounded-xl bg-slate-950 border border-slate-800"><p className="text-[10px] font-black uppercase text-slate-500">{String(c).replace('_', ' ')}</p><p className="text-sm font-black text-amber-400">{formatKES(v)}</p></div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// STOCK, SUPPLIERS, PURCHASES, BULK PRICING
// ---------------------------------------------------------------------------
function StockLevelsView({ token, showToast, onRecordPurchase }: { token: string | null; showToast: ToastFn; onRecordPurchase: (productId: number) => void }) {
  const [data, setData] = useState<any>(null);
  const [defaultLevel, setDefaultLevel] = useState('20');
  const load = useCallback(async () => {
    try { const d = await staffApi('/admin/stock/overview', token); setData(d); setDefaultLevel(String(d.defaultThreshold)); }
    catch (err: any) { showToast(err.message, 'error'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const saveDefault = async () => {
    try { await staffApi('/admin/stock/thresholds', token, { method: 'PUT', body: { defaultThreshold: Number(defaultLevel) } }); showToast('Default alert level saved.', 'success'); load(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };
  const saveOne = async (productId: number, value: string) => {
    try { await staffApi('/admin/stock/thresholds', token, { method: 'PUT', body: { productId, threshold: value === '' ? null : Number(value) } }); load(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };
  if (!data) return <p className="text-xs text-slate-500 font-bold">Loading stock…</p>;
  const pill: Record<string, string> = { ok: 'bg-emerald-950 text-emerald-300 border-emerald-800', low: 'bg-amber-950 text-amber-300 border-amber-800', out: 'bg-rose-950 text-rose-300 border-rose-800' };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaffStat label="Products needing restock" value={data.lowCount} tone={data.lowCount ? 'rose' : 'emerald'} />
        <StaffStat label="Stock value (at cost)" value={formatKES(data.stockValue)} />
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 col-span-2">
          <p className={labelCls}>Alert me when a product has this many bags or fewer</p>
          <div className="flex gap-2"><input type="number" min={0} value={defaultLevel} onChange={(e) => setDefaultLevel(e.target.value)} className={inputCls} /><button onClick={saveDefault} className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer">Save</button></div>
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Product</th><th className="p-3 text-right">In stock</th><th className="p-3">Status</th><th className="p-3 text-right">Alert at</th><th className="p-3 text-right">Sold (30d)</th><th className="p-3 text-right">Lasts about</th><th className="p-3 text-right">Buying price</th><th className="p-3">Last purchase</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.products.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-white">{p.name} <span className="text-slate-500 font-medium">{p.weightKg}kg</span></td>
                <td className="p-3 text-right font-black">{p.stock}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${pill[p.state]}`}>{p.state === 'ok' ? 'OK' : p.state === 'low' ? 'Low' : 'Out'}</span></td>
                <td className="p-3 text-right"><input type="number" min={0} defaultValue={p.customThreshold ? p.threshold : ''} placeholder={String(p.threshold)} onBlur={(e) => { if (e.target.value !== String(p.customThreshold ? p.threshold : '')) saveOne(p.id, e.target.value); }} className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-right text-xs text-white" /></td>
                <td className="p-3 text-right">{p.sold30}</td>
                <td className="p-3 text-right text-slate-300">{p.daysLeft === null ? '—' : `${p.daysLeft} days`}</td>
                <td className="p-3 text-right">{formatKES(p.buyingPrice)}</td>
                <td className="p-3 text-slate-400">{p.lastPurchase ? `${p.lastPurchase.date} @ ${formatKES(p.lastPurchase.unitCost)}` : '—'}</td>
                <td className="p-3 text-right"><button onClick={() => onRecordPurchase(p.id)} className="px-2.5 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-white text-[10px] font-extrabold cursor-pointer">Record purchase</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500">Leave “Alert at” empty to use the default. You get a warning on this page (and in Live Activity) the first time a product drops to its level, then again after 12 hours if it is still low.</p>
    </div>
  );
}

function SuppliersView({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', type: 'farmer', phone: '', location: '', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [ledger, setLedger] = useState<any>(null);
  const load = useCallback(async () => { try { setList(await staffApi('/admin/suppliers', token)); } catch (err: any) { showToast(err.message, 'error'); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await staffApi(editId ? `/admin/suppliers/${editId}` : '/admin/suppliers', token, { method: editId ? 'PUT' : 'POST', body: form });
      showToast(editId ? 'Supplier updated.' : 'Supplier added.', 'success');
      setForm({ name: '', type: 'farmer', phone: '', location: '', notes: '' }); setEditId(null); load();
    } catch (err: any) { showToast(err.message, 'error'); }
  };
  const openLedger = async (id: number) => { try { setLedger(await staffApi(`/admin/suppliers/${id}`, token)); } catch (err: any) { showToast(err.message, 'error'); } };
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
      <form onSubmit={save} className={`${cardCls} p-5 space-y-3`}>
        <p className="text-xs font-black text-white">{editId ? 'Edit supplier' : 'Add a supplier'}</p>
        <div><label className={labelCls}>Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Mwea Millers Co-op" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="farmer">Farmer</option><option value="miller">Miller</option><option value="transporter">Transporter</option><option value="other">Other</option></select></div>
          <div><label className={labelCls}>Phone</label><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Location</label><input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} /></div>
        <div><label className={labelCls}>Notes</label><input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} /></div>
        <div className="flex gap-2"><button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer">{editId ? 'Save changes' : 'Add supplier'}</button>{editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', type: 'farmer', phone: '', location: '', notes: '' }); }} className="px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>}</div>
      </form>
      <div className={`xl:col-span-2 ${cardCls} overflow-x-auto`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Supplier</th><th className="p-3">Type</th><th className="p-3 text-right">Bought</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">We owe</th><th className="p-3">Last</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">
            {list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500 font-bold">No suppliers yet.</td></tr>}
            {list.map(x => (
              <tr key={x.id} className="hover:bg-slate-800/40">
                <td className="p-3"><p className="font-bold text-white">{x.name}</p><p className="text-[10px] text-slate-500">{x.phone} {x.location ? `· ${x.location}` : ''}</p></td>
                <td className="p-3 capitalize">{x.type}</td>
                <td className="p-3 text-right">{formatKES(x.totalPurchased)}</td><td className="p-3 text-right text-emerald-400">{formatKES(x.totalPaid)}</td>
                <td className={`p-3 text-right font-black ${x.owed > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{formatKES(x.owed)}</td>
                <td className="p-3 text-slate-400">{x.lastPurchase || '—'}</td>
                <td className="p-3 text-right whitespace-nowrap"><button onClick={() => openLedger(x.id)} className="p-1.5 text-slate-400 hover:text-emerald-400 cursor-pointer" title="Ledger"><Eye className="w-4 h-4" /></button><button onClick={() => { setEditId(x.id); setForm({ name: x.name, type: x.type, phone: x.phone, location: x.location, notes: x.notes }); }} className="p-1.5 text-slate-400 hover:text-sky-400 cursor-pointer" title="Edit"><Edit className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ledger && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-3xl my-8 space-y-4">
            <div className="flex justify-between items-start"><div><h3 className="text-lg font-black text-white">{ledger.supplier.name}</h3><p className="text-xs text-slate-400">Bought {formatKES(ledger.totalPurchased)} · Paid {formatKES(ledger.totalPaid)} · <span className="text-amber-400 font-black">Owed {formatKES(ledger.owed)}</span></p></div><button onClick={() => setLedger(null)} className="p-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button></div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Date</th><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Paid</th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">{ledger.purchases.map((p: any) => <tr key={p.id}><td className="p-3 text-slate-400">{p.purchaseDate}</td><td className="p-3 text-white font-bold">{p.itemName}</td><td className="p-3 text-right">{p.quantity}</td><td className="p-3 text-right">{formatKES(Number(p.totalCost))}</td><td className="p-3 text-right text-emerald-400">{formatKES(Number(p.amountPaid))}</td></tr>)}</tbody></table></div>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchasesView({ token, showToast, presetProductId, onStockChanged }: { token: string | null; showToast: ToastFn; presetProductId: number | null; onStockChanged: () => void }) {
  const p30 = rangePresets()[2];
  const [from, setFrom] = useState(p30.from);
  const [to, setTo] = useState(p30.to);
  const [data, setData] = useState<any>({ purchases: [], totals: { spent: 0, paid: 0, owed: 0 } });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const blank = { supplierId: '', productId: presetProductId ? String(presetProductId) : '', itemName: '', quantity: '', unitCost: '', amountPaid: '', paymentMethod: 'mpesa', reference: '', purchaseDate: ymd(new Date()), notes: '', addToStock: true, updateBuyingPrice: true };
  const [form, setForm] = useState<any>(blank);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s, st] = await Promise.all([staffApi(`/admin/purchases?from=${from}&to=${to}`, token), staffApi('/admin/suppliers', token), staffApi('/admin/stock/overview', token)]);
      setData(p); setSuppliers(s); setProducts(st.products);
    } catch (err: any) { showToast(err.message, 'error'); }
  }, [token, from, to]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (presetProductId) setForm((f: any) => ({ ...f, productId: String(presetProductId) })); }, [presetProductId]);

  const total = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...form, supplierId: form.supplierId ? Number(form.supplierId) : null, productId: form.productId ? Number(form.productId) : null, quantity: Number(form.quantity), unitCost: Number(form.unitCost), amountPaid: Number(form.amountPaid) || 0 };
      const r = await staffApi('/admin/purchases', token, { method: 'POST', body });
      showToast(r.message, 'success'); setForm({ ...blank, productId: '' }); load(); onStockChanged();
    } catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const payBalance = async (p: any) => {
    const v = prompt(`How much are you paying now? (KES ${p.owed} is still owed)`, String(p.owed));
    if (!v) return;
    try { const r = await staffApi(`/admin/purchases/${p.id}/payment`, token, { method: 'POST', body: { amount: Number(v) } }); showToast(r.message, 'success'); load(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };
  return (
    <div className="space-y-5">
      <form onSubmit={save} className={`${cardCls} p-5 space-y-3`}>
        <p className="text-xs font-black text-white flex items-center gap-2"><Package className="w-4 h-4 text-emerald-400" /> Record a purchase (what you buy from farmers or millers)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div><label className={labelCls}>Supplier</label><select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className={inputCls}><option value="">— none —</option>{suppliers.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className={labelCls}>Product (to add stock to)</label><select value={form.productId} onChange={(e) => { const pr = products.find(x => String(x.id) === e.target.value); setForm({ ...form, productId: e.target.value, itemName: pr ? pr.name : form.itemName }); }} className={inputCls}><option value="">— not a product —</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</select></div>
          <div><label className={labelCls}>What was bought *</label><input required value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} className={inputCls} placeholder="e.g. Pishori 50kg sacks" /></div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Bags / units *</label><input required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Cost per bag (KES) *</label><input required type="number" min={0} step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Paid so far (KES)</label><input type="number" min={0} step="0.01" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} className={inputCls} placeholder={String(total || 0)} /></div>
          <div><label className={labelCls}>Reference</label><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder="M-Pesa code / receipt" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.addToStock} disabled={!form.productId} onChange={(e) => setForm({ ...form, addToStock: e.target.checked })} className="accent-emerald-500" /> Add these bags to the product&apos;s stock</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.updateBuyingPrice} disabled={!form.productId || !form.addToStock} onChange={(e) => setForm({ ...form, updateBuyingPrice: e.target.checked })} className="accent-emerald-500" /> Update the product&apos;s buying price (average of old and new stock)</label>
          <span className="ml-auto font-black text-white">Total: {formatKES(total)}</span>
          <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold cursor-pointer">Save purchase</button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3"><DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <p className="text-xs text-slate-400">Spent <b className="text-white">{formatKES(data.totals.spent)}</b> · Paid <b className="text-emerald-400">{formatKES(data.totals.paid)}</b> · Still owed <b className="text-amber-400">{formatKES(data.totals.owed)}</b></p></div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Date</th><th className="p-3">Supplier</th><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Owed</th><th className="p-3">Stock</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.purchases.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-bold">No purchases in this period.</td></tr>}
            {data.purchases.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/40"><td className="p-3 text-slate-400 whitespace-nowrap">{p.purchaseDate}</td><td className="p-3">{p.supplierName}</td><td className="p-3 font-bold text-white">{p.itemName}</td><td className="p-3 text-right">{p.quantity}</td><td className="p-3 text-right">{formatKES(p.unitCost)}</td><td className="p-3 text-right font-bold">{formatKES(p.totalCost)}</td>
                <td className={`p-3 text-right font-black ${p.owed > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{formatKES(p.owed)}</td><td className="p-3">{p.addedToStock ? <span className="text-emerald-400 font-bold">Added</span> : <span className="text-slate-500">—</span>}</td>
                <td className="p-3 text-right">{p.owed > 0 && <button onClick={() => payBalance(p)} className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-extrabold cursor-pointer">Pay balance</button>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkPricingView({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const [products, setProducts] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { minQty: string; price: string }[]>>({});
  const load = useCallback(async () => {
    try {
      const list = await staffApi('/admin/wholesale', token);
      setProducts(list);
      const d: Record<number, { minQty: string; price: string }[]> = {};
      list.forEach((p: any) => { d[p.id] = (p.tiers || []).map((t: any) => ({ minQty: String(t.minQty), price: String(t.price) })); });
      setDrafts(d);
    } catch (err: any) { showToast(err.message, 'error'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  const save = async (p: any, force = false) => {
    try {
      const tiers = (drafts[p.id] || []).filter(t => t.minQty && t.price).map(t => ({ minQty: Number(t.minQty), price: Number(t.price) }));
      const r = await staffApi(`/admin/products/${p.id}/wholesale-tiers`, token, { method: 'PUT', body: { tiers, force } });
      showToast(r.message, 'success'); load();
    } catch (err: any) {
      if (err.message.includes('below your buying price') && confirm(`${err.message}\n\nSave anyway?`)) return save(p, true);
      showToast(err.message, 'error');
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Give hotels, schools and shops a lower price per bag when they buy many. The best price wins automatically at checkout (it never stacks with the flash sale price). Customers see the bulk prices on the product and in their cart.</p>
      {products.map(p => (
        <div key={p.id} className={`${cardCls} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div><p className="text-sm font-black text-white">{p.name} <span className="text-slate-500 font-medium">{p.weightKg}kg</span></p><p className="text-[11px] text-slate-400">Normal price {formatKES(p.price)} · Your buying price {formatKES(p.buyingPrice)}</p></div>
            <button onClick={() => save(p)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer">Save bulk prices</button>
          </div>
          <div className="space-y-2">
            {(drafts[p.id] || []).map((t, i) => {
              const price = Number(t.price);
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">Buy</span><input type="number" min={2} value={t.minQty} onChange={(e) => setDrafts(d => ({ ...d, [p.id]: d[p.id].map((x, j) => j === i ? { ...x, minQty: e.target.value } : x) }))} className="w-20 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" />
                  <span className="text-slate-400">or more bags — each at KES</span><input type="number" min={1} value={t.price} onChange={(e) => setDrafts(d => ({ ...d, [p.id]: d[p.id].map((x, j) => j === i ? { ...x, price: e.target.value } : x) }))} className="w-28 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" />
                  {price > 0 && p.price > 0 && <span className="text-emerald-400 font-bold">{Math.round((1 - price / p.price) * 100)}% off</span>}
                  {price > 0 && p.buyingPrice > 0 && <span className={`font-bold ${price < p.buyingPrice ? 'text-rose-400' : 'text-slate-400'}`}>profit/bag {formatKES(price - p.buyingPrice)}</span>}
                  <button onClick={() => setDrafts(d => ({ ...d, [p.id]: d[p.id].filter((_, j) => j !== i) }))} className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            {(drafts[p.id] || []).length < 5 && <button onClick={() => setDrafts(d => ({ ...d, [p.id]: [...(d[p.id] || []), { minQty: '', price: '' }] }))} className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer">+ Add a bulk price</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminStockPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const [tab, setTab] = useState<'levels' | 'purchases' | 'suppliers' | 'bulk'>('levels');
  const [presetProduct, setPresetProduct] = useState<number | null>(null);
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {([['levels', 'Stock levels & alerts'], ['purchases', 'Purchases'], ['suppliers', 'Suppliers'], ['bulk', 'Bulk (wholesale) prices']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === id ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>{label}</button>
        ))}
      </div>
      {tab === 'levels' && <StockLevelsView key={refresh} token={token} showToast={showToast} onRecordPurchase={(id) => { setPresetProduct(id); setTab('purchases'); }} />}
      {tab === 'purchases' && <PurchasesView token={token} showToast={showToast} presetProductId={presetProduct} onStockChanged={() => setRefresh(r => r + 1)} />}
      {tab === 'suppliers' && <SuppliersView token={token} showToast={showToast} />}
      {tab === 'bulk' && <BulkPricingView token={token} showToast={showToast} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EXPENSES
// ---------------------------------------------------------------------------
function AdminExpensesPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const p30 = rangePresets()[3];
  const [from, setFrom] = useState(p30.from);
  const [to, setTo] = useState(p30.to);
  const [category, setCategory] = useState('all');
  const [data, setData] = useState<any>({ expenses: [], total: 0, byCategory: {}, byMonth: {}, categories: [] });
  const blank = { category: 'transport', amount: '', description: '', reference: '', expenseDate: ymd(new Date()) };
  const [form, setForm] = useState<any>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const load = useCallback(async () => {
    try { setData(await staffApi(`/admin/expenses?from=${from}&to=${to}${category !== 'all' ? `&category=${category}` : ''}`, token)); }
    catch (err: any) { showToast(err.message, 'error'); }
  }, [token, from, to, category]);
  useEffect(() => { load(); }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await staffApi(editId ? `/admin/expenses/${editId}` : '/admin/expenses', token, { method: editId ? 'PUT' : 'POST', body: { ...form, amount: Number(form.amount) } });
      showToast(editId ? 'Expense updated.' : 'Expense recorded.', 'success'); setForm(blank); setEditId(null); load();
    } catch (err: any) { showToast(err.message, 'error'); }
  };
  const del = async (x: any) => {
    if (!confirm(`Delete this ${x.category} expense of ${formatKES(x.amount)}? This is recorded in the activity log.`)) return;
    try { await staffApi(`/admin/expenses/${x.id}`, token, { method: 'DELETE' }); showToast('Expense deleted.', 'success'); load(); } catch (err: any) { showToast(err.message, 'error'); }
  };
  const cats: string[] = data.categories || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <form onSubmit={save} className={`${cardCls} p-5 space-y-3`}>
          <p className="text-xs font-black text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-amber-400" /> {editId ? 'Edit expense' : 'Record an expense'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Category</label><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>{cats.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
            <div><label className={labelCls}>Amount (KES)</label><input required type="number" min={1} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>What was it for?</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="e.g. Lorry to Mombasa, 200 packaging bags" /></div>
          <div className="grid grid-cols-2 gap-2"><div><label className={labelCls}>Date</label><input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className={inputCls} /></div><div><label className={labelCls}>Reference</label><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} /></div></div>
          <div className="flex gap-2"><button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer">{editId ? 'Save changes' : 'Record expense'}</button>{editId && <button type="button" onClick={() => { setEditId(null); setForm(blank); }} className="px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>}</div>
          <p className="text-[10px] text-slate-500">Don&apos;t record rice you buy here — use Stock &amp; Suppliers → Purchases. Expenses are for running costs and reduce your net profit.</p>
        </form>
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-white cursor-pointer"><option value="all">All categories</option>{cats.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StaffStat label="Total expenses" value={formatKES(data.total)} tone="amber" />
            {Object.entries(data.byCategory).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([c, v]: any) => <StaffStat key={c} label={String(c).replace('_', ' ')} value={formatKES(v)} />)}
          </div>
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Details</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.expenses.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-bold">No expenses in this period.</td></tr>}
                {data.expenses.map((x: any) => (
                  <tr key={x.id} className="hover:bg-slate-800/40"><td className="p-3 text-slate-400 whitespace-nowrap">{x.expenseDate}</td><td className="p-3 capitalize font-bold text-white">{x.category.replace('_', ' ')}</td><td className="p-3 text-slate-300">{x.description || '—'}{x.reference && <span className="block text-[10px] font-mono text-slate-500">{x.reference}</span>}</td><td className="p-3 text-right font-black text-amber-400">{formatKES(x.amount)}</td>
                    <td className="p-3 text-right whitespace-nowrap"><button onClick={() => { setEditId(x.id); setForm({ category: x.category, amount: String(x.amount), description: x.description || '', reference: x.reference || '', expenseDate: x.expenseDate }); }} className="p-1.5 text-slate-400 hover:text-sky-400 cursor-pointer"><Edit className="w-4 h-4" /></button><button onClick={() => del(x)} className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMER SEGMENTS & SMS CAMPAIGNS
// ---------------------------------------------------------------------------
function AdminCampaignsPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const blankF = { counties: [] as string[], minOrders: '', maxOrders: '', minSpent: '', inactiveDays: '', joinedWithinDays: '', neverOrdered: false, referredOnly: false, boughtProductIds: [] as number[] };
  const [f, setF] = useState<any>(blankF);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [confirmText, setConfirmText] = useState('');
  const [allowQuiet, setAllowQuiet] = useState(false);
  const [history, setHistory] = useState<any>({ campaigns: [], optOuts: 0, balance: null, running: false });
  const [products, setProducts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(async () => { try { setHistory(await staffApi('/admin/campaigns', token)); } catch (_) { /* ignore */ } }, [token]);
  useEffect(() => { loadHistory(); staffApi('/admin/wholesale', token).then(setProducts).catch(() => {}); }, [loadHistory, token]);
  useEffect(() => { if (!history.running && !history.campaigns.some((c: any) => c.status === 'sending')) return; const t = setInterval(loadHistory, 4000); return () => clearInterval(t); }, [history, loadHistory]);

  const filterBody = () => ({ ...f, minOrders: f.minOrders === '' ? null : Number(f.minOrders), maxOrders: f.maxOrders === '' ? null : Number(f.maxOrders), minSpent: f.minSpent === '' ? null : Number(f.minSpent), inactiveDays: f.inactiveDays === '' ? null : Number(f.inactiveDays), joinedWithinDays: f.joinedWithinDays === '' ? null : Number(f.joinedWithinDays) });
  const runPreview = async () => {
    setBusy(true);
    try { setPreview(await staffApi('/admin/campaigns/preview', token, { method: 'POST', body: { message, filters: filterBody() } })); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true);
    try {
      const r = await staffApi('/admin/campaigns', token, { method: 'POST', body: { name, message, filters: filterBody(), confirm: confirmText, allowQuietHours: allowQuiet } });
      showToast(r.message, 'success'); setConfirmText(''); setPreview(null); setMessage(''); setName(''); loadHistory();
    } catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const stop = async (id: number) => { try { await staffApi(`/admin/campaigns/${id}/stop`, token, { method: 'POST' }); showToast('Stopping…', 'info'); loadHistory(); } catch (err: any) { showToast(err.message, 'error'); } };
  const toggleCounty = (c: string) => setF((x: any) => ({ ...x, counties: x.counties.includes(c) ? x.counties.filter((y: string) => y !== c) : [...x.counties, c] }));
  const presets: { label: string; apply: any }[] = [
    { label: 'Everyone', apply: blankF },
    { label: 'Never ordered', apply: { ...blankF, neverOrdered: true } },
    { label: 'Repeat buyers (2+ orders)', apply: { ...blankF, minOrders: '2' } },
    { label: 'Big spenders (KES 10,000+)', apply: { ...blankF, minSpent: '10000' } },
    { label: 'Haven\'t ordered in 60 days', apply: { ...blankF, inactiveDays: '60' } },
    { label: 'Joined in the last 14 days', apply: { ...blankF, joinedWithinDays: '14' } }
  ];
  const parts = smsPartsOf(message);
  const statusPill: Record<string, string> = { sending: 'bg-sky-950 text-sky-300 border-sky-800', sent: 'bg-emerald-950 text-emerald-300 border-emerald-800', failed: 'bg-rose-950 text-rose-300 border-rose-800', stopped: 'bg-amber-950 text-amber-300 border-amber-800' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaffStat label="SMS credit" value={history.balance === null ? 'Unknown' : history.balance} tone={history.balance !== null && history.balance < 10 ? 'rose' : 'emerald'} hint="Updates after each SMS sent" />
        <StaffStat label="Opted out of promotions" value={history.optOuts} hint="Never messaged again" />
        <StaffStat label="Campaigns sent" value={history.campaigns.filter((c: any) => c.status === 'sent').length} />
        <StaffStat label="Status" value={history.running ? 'Sending…' : 'Idle'} tone={history.running ? 'sky' : 'slate'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className={`${cardCls} p-5 space-y-4`}>
          <p className="text-xs font-black text-white flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> 1 · Choose who gets it</p>
          <div className="flex flex-wrap gap-2">{presets.map(p => <button key={p.label} onClick={() => { setF(p.apply); setPreview(null); }} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer">{p.label}</button>)}</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><label className={labelCls}>At least this many orders</label><input type="number" min={0} value={f.minOrders} onChange={(e) => setF({ ...f, minOrders: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>At most this many orders</label><input type="number" min={0} value={f.maxOrders} onChange={(e) => setF({ ...f, maxOrders: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Spent at least (KES)</label><input type="number" min={0} value={f.minSpent} onChange={(e) => setF({ ...f, minSpent: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Last order older than (days)</label><input type="number" min={0} value={f.inactiveDays} onChange={(e) => setF({ ...f, inactiveDays: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Joined within (days)</label><input type="number" min={0} value={f.joinedWithinDays} onChange={(e) => setF({ ...f, joinedWithinDays: e.target.value })} className={inputCls} /></div>
            <div><label className={labelCls}>Bought this rice</label><select value={f.boughtProductIds[0] || ''} onChange={(e) => setF({ ...f, boughtProductIds: e.target.value ? [Number(e.target.value)] : [] })} className={inputCls}><option value="">Any</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.neverOrdered} onChange={(e) => setF({ ...f, neverOrdered: e.target.checked })} className="accent-emerald-500" /> Never paid for an order</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.referredOnly} onChange={(e) => setF({ ...f, referredOnly: e.target.checked })} className="accent-emerald-500" /> Only customers referred by an agent</label>
          </div>
          <div>
            <label className={labelCls}>Counties they have ordered from {f.counties.length > 0 && <span className="text-emerald-400">({f.counties.length} chosen)</span>}</label>
            <div className="max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-1.5">
              {ALL_47_COUNTIES.map(c => <button key={c} onClick={() => toggleCounty(c)} className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer ${f.counties.includes(c) ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>)}
            </div>
          </div>
        </div>

        <div className={`${cardCls} p-5 space-y-4`}>
          <p className="text-xs font-black text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /> 2 · Write the message</p>
          <div><label className={labelCls}>Campaign name (only you see this)</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. October bulk offer" /></div>
          <div>
            <label className={labelCls}>Message (an opt-out link is added automatically)</label>
            <textarea rows={4} maxLength={320} value={message} onChange={(e) => { setMessage(e.target.value); setPreview(null); }} className={inputCls} placeholder="ProHardware: Buy 10+ bags of Pishori and pay only KES 1,100 each. Order now at ..." />
            <p className="text-[10px] text-slate-500 mt-1">{message.length}/320 characters · about {parts} SMS per customer including the opt-out link</p>
          </div>
          <button onClick={runPreview} disabled={busy || message.trim().length < 10} className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer">Check who this reaches and what it costs</button>
          {preview && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><p className={labelCls}>Customers reached</p><p className="text-xl font-black text-white">{preview.count}</p></div>
                <div><p className={labelCls}>Estimated SMS credit</p><p className="text-xl font-black text-amber-400">{preview.estimatedCost}</p></div>
              </div>
              <p className="text-[11px] text-slate-400">Skipped: {preview.optedOut} opted out · {preview.noPhone} without a valid phone. {preview.canAfford === false && <b className="text-rose-400">You do not have enough SMS credit ({preview.balance}).</b>} {preview.tooMany && <b className="text-rose-400">Over the limit of {preview.max} — narrow the segment.</b>}</p>
              {preview.sample.length > 0 && <p className="text-[11px] text-slate-500">Examples: {preview.sample.map((s: any) => `${s.name} (${s.phone})`).join(', ')}</p>}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap">{preview.exampleMessage}</div>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer"><input type="checkbox" checked={allowQuiet} onChange={(e) => setAllowQuiet(e.target.checked)} className="accent-emerald-500" /> Send even outside 7am–8pm</label>
                <div className="flex gap-2"><input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type SEND to confirm" className={inputCls} />
                  <button onClick={send} disabled={busy || confirmText !== 'SEND' || preview.count === 0 || preview.tooMany || name.trim().length < 3} className="px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer whitespace-nowrap">Send now</button></div>
                {name.trim().length < 3 && <p className="text-[10px] text-amber-400">Give the campaign a name first.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <p className="p-4 text-xs font-black text-white border-b border-slate-800">Campaign history</p>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Campaign</th><th className="p-3">Started</th><th className="p-3">Status</th><th className="p-3 text-right">Targeted</th><th className="p-3 text-right">Sent</th><th className="p-3 text-right">Failed</th><th className="p-3 text-right">Opted-out skipped</th><th className="p-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">
            {history.campaigns.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500 font-bold">No campaigns yet.</td></tr>}
            {history.campaigns.map((c: any) => (
              <tr key={c.id}><td className="p-3"><p className="font-bold text-white">{c.name}</p><p className="text-[10px] text-slate-500 max-w-xs truncate">{c.message}</p></td><td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(c.startedAt)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${statusPill[c.status] || ''}`}>{c.status}</span></td><td className="p-3 text-right">{c.totalRecipients}</td><td className="p-3 text-right text-emerald-400 font-bold">{c.sentCount}</td><td className="p-3 text-right text-rose-400">{c.failedCount}</td><td className="p-3 text-right text-slate-400">{c.optedOutSkipped}</td>
                <td className="p-3 text-right">{c.status === 'sending' && <button onClick={() => stop(c.id)} className="px-2.5 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-extrabold cursor-pointer">Stop</button>}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const smsPartsOf = (text: string) => { const len = text.length + 1 + 12 + 'Opt out: '.length + 60; return len <= 160 ? 1 : Math.ceil(len / 153); };

// ---------------------------------------------------------------------------
// REVIEWS (storefront widgets + moderation)
// ---------------------------------------------------------------------------
function StarRating({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange && onChange(i)} className={onChange ? 'cursor-pointer' : 'cursor-default'} aria-label={`${i} star`}>
          <Star style={{ width: size, height: size }} className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
        </button>
      ))}
    </span>
  );
}

function ReviewsModal({ product, token, user, onClose, showToast, onChanged }: { product: Product; token: string | null; user: UserAccount | null; onClose: () => void; showToast: ToastFn; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${product.id}/reviews?page=${page}`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      const d = await res.json(); setData(d);
      if (d.myReview) { setRating(d.myReview.rating); setTitle(d.myReview.title || ''); setComment(d.myReview.comment || ''); }
    } catch (_) { /* ignore */ }
  }, [product.id, page, token]);
  useEffect(() => { load(); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { showToast('Choose a star rating first.', 'error'); return; }
    setBusy(true);
    try { const r = await staffApi(`/products/${product.id}/reviews`, token, { method: 'POST', body: { rating, title, comment } }); showToast(r.message, 'success'); await load(); onChanged(); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const sum = data?.summary;
  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div><h3 className="font-black text-slate-900 text-base">{product.brandName}</h3>
            {sum && <div className="flex items-center gap-2 mt-1"><StarRating value={sum.average} /><span className="text-xs font-bold text-slate-700">{sum.count ? sum.average.toFixed(1) : 'No reviews yet'}</span>{sum.count > 0 && <span className="text-[11px] text-slate-400">({sum.count} review{sum.count > 1 ? 's' : ''})</span>}</div>}</div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {sum && sum.count > 0 && (
            <div className="space-y-1">{[5, 4, 3, 2, 1].map(n => (<div key={n} className="flex items-center gap-2 text-[11px] text-slate-500"><span className="w-3">{n}</span><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${(sum.distribution[n] / sum.count) * 100}%` }} /></div><span className="w-6 text-right">{sum.distribution[n]}</span></div>))}</div>
          )}
          {data && (data.canReview ? (
            <form onSubmit={submit} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-2">
              <p className="text-xs font-black text-emerald-900">{data.myReview ? 'Update your review' : 'Write a review'} <span className="font-medium text-emerald-700">· verified buyer</span></p>
              <StarRating value={rating} size={26} onChange={setRating} />
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Headline (optional)" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={3} placeholder="How was the rice? Cooking, aroma, packaging, delivery…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
              <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold cursor-pointer">{data.myReview ? 'Update review' : 'Post review'}</button>
            </form>
          ) : <p className="text-[11px] text-slate-500 p-3 rounded-xl bg-slate-50 border border-slate-100">{data.reason}</p>)}
          <div className="space-y-3">
            {data && data.reviews.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Be the first to review this rice.</p>}
            {data && data.reviews.map((r: any) => (
              <div key={r.id} className="p-3 rounded-2xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><StarRating value={r.rating} size={12} /><span className="text-xs font-bold text-slate-800">{r.author}</span></div><span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700"><Check className="w-3 h-3" /> Verified buyer</span>
                {r.title && <p className="text-xs font-extrabold text-slate-900">{r.title}</p>}
                {r.comment && <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>}
                {r.reply && <p className="text-[11px] text-slate-600 bg-slate-50 rounded-xl p-2 border-l-2 border-emerald-500"><b>ProHardware:</b> {r.reply}</p>}
              </div>
            ))}
            {data && data.pages > 1 && <div className="flex justify-between text-xs"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer">Newer</button><button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40 cursor-pointer">Older</button></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminReviewsPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<'all' | 'published' | 'hidden'>('all');
  const load = useCallback(async () => { try { setRows(await staffApi(`/admin/reviews${status !== 'all' ? `?status=${status}` : ''}`, token)); } catch (err: any) { showToast(err.message, 'error'); } }, [token, status]);
  useEffect(() => { load(); }, [load]);
  const update = async (id: number, body: any) => { try { await staffApi(`/admin/reviews/${id}`, token, { method: 'PUT', body }); load(); } catch (err: any) { showToast(err.message, 'error'); } };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{(['all', 'published', 'hidden'] as const).map(s => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${status === s ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s}</button>)}</div>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-xs text-slate-500 font-bold p-6 text-center bg-slate-900 rounded-2xl border border-slate-800">No reviews yet.</p>}
        {rows.map(r => (
          <div key={r.id} className={`${cardCls} p-4 space-y-2 ${r.status === 'hidden' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><StarRating value={r.rating} size={13} /><span className="text-xs font-bold text-white">{r.product}</span></div><span className="text-[10px] text-slate-500">{r.customer} · {formatWhen(r.createdAt)}</span></div>
            {r.title && <p className="text-xs font-extrabold text-slate-200">{r.title}</p>}
            {r.comment && <p className="text-xs text-slate-300">{r.comment}</p>}
            {r.adminReply && <p className="text-[11px] text-emerald-300">Your reply: {r.adminReply}</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => update(r.id, { status: r.status === 'hidden' ? 'published' : 'hidden' })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${r.status === 'hidden' ? 'bg-emerald-700 text-white' : 'bg-rose-900 text-rose-100'}`}>{r.status === 'hidden' ? 'Restore' : 'Hide'}</button>
              <button onClick={() => { const v = prompt('Your public reply to this review:', r.adminReply || ''); if (v !== null) update(r.id, { reply: v }); }} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold cursor-pointer">{r.adminReply ? 'Edit reply' : 'Reply'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADMIN SIGN-IN SECOND STEP
// ---------------------------------------------------------------------------
function TwoFactorModal({ challenge, onSuccess, onClose, showToast }: { challenge: { challengeId: string; message: string }; onSuccess: (data: any) => void; onClose: () => void; showToast: ToastFn }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { showToast('Enter the 6-digit code.', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/login/verify-2fa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.challengeId, code }) });
      const d = await res.json();
      if (res.ok && d.token) onSuccess(d);
      else { showToast(d.error || 'Could not verify the code.', 'error'); if (d.expired) onClose(); }
    } catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const resend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/login/resend-2fa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.challengeId }) });
      const d = await res.json(); showToast(d.message || d.error, res.ok ? 'success' : 'error'); if (d.expired) onClose();
    } catch (err: any) { showToast(err.message, 'error'); }
  };
  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <div className="text-center space-y-1"><ShieldAlert className="w-10 h-10 text-emerald-600 mx-auto" /><h3 className="font-black text-slate-900">Confirm it&apos;s you</h3><p className="text-xs text-slate-500">{challenge.message}</p></div>
        <input autoFocus inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" className="w-full text-center tracking-[0.5em] text-2xl font-black px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" />
        <button type="submit" disabled={busy || code.length !== 6} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs cursor-pointer">Verify and sign in</button>
        <div className="flex justify-between text-[11px]"><button type="button" onClick={resend} className="font-bold text-emerald-700 cursor-pointer">Send a new code</button><button type="button" onClick={onClose} className="font-bold text-slate-500 cursor-pointer">Cancel</button></div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADMIN: SYSTEM (health, safety settings, daily summary, permissions)
// ---------------------------------------------------------------------------
function AdminSystemPanel({ token, showToast }: { token: string | null; showToast: ToastFn }) {
  const [status, setStatus] = useState<any>(null);
  const [ops, setOps] = useState<any>(null);
  const [perms, setPerms] = useState<any>(null);
  const [extra, setExtra] = useState({ phones: '', emails: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, o, p] = await Promise.all([staffApi('/admin/system/status', token), staffApi('/admin/ops-settings', token), staffApi('/admin/permissions', token)]);
      setStatus(s); setOps(o); setPerms(p);
      setExtra({ phones: (o.dailySummary.extraPhones || []).join(', '), emails: (o.dailySummary.extraEmails || []).join(', ') });
    } catch (err: any) { showToast(err.message, 'error'); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const saveOps = async (patch: any, okMsg = 'Settings saved.') => {
    setBusy(true);
    try { await staffApi('/admin/ops-settings', token, { method: 'PUT', body: patch }); showToast(okMsg, 'success'); await load(); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const togglePerm = async (role: string, key: string, value: boolean) => {
    try { const r = await staffApi('/admin/permissions', token, { method: 'PUT', body: { role, changes: { [key]: value } } }); setPerms((p: any) => ({ ...p, permissions: r.permissions })); showToast('Permission updated.', 'success'); }
    catch (err: any) { showToast(err.message, 'error'); }
  };
  const sendTest = async () => {
    setBusy(true);
    try { const r = await staffApi('/admin/daily-summary/send-test', token, { method: 'POST' }); showToast(r.message, r.errors && r.errors.length ? 'warning' : 'success'); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };
  const reconcile = async () => { try { const r = await staffApi('/admin/system/reconcile-now', token, { method: 'POST' }); showToast(r.message, 'info'); setTimeout(load, 6000); } catch (err: any) { showToast(err.message, 'error'); } };

  if (!status || !ops || !perms) return <p className="text-xs text-slate-500 font-bold">Loading system status…</p>;
  const job = status.jobs.paymentReconcile;
  const smsPct = status.sms.balance === null ? 0 : Math.min(100, (status.sms.balance / Math.max(1, status.sms.threshold * 4)) * 100);
  const roleLabels: Record<string, string> = { support: 'Customer care', agent: 'Agents' };

  return (
    <div className="space-y-6">
      {/* HEALTH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`rounded-2xl p-4 border ${status.sms.low ? 'bg-rose-950/50 border-rose-800' : 'bg-slate-900 border-slate-800'}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">SMS credit (OTP codes)</p>
          <p className={`text-xl font-black mt-1 ${status.sms.low ? 'text-rose-400' : 'text-emerald-400'}`}>{status.sms.balance === null ? 'Not known yet' : status.sms.balance}</p>
          <div className="h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden"><div className={`h-full ${status.sms.low ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${smsPct}%` }} /></div>
          <p className="text-[10px] text-slate-500 mt-1">{status.sms.low ? 'LOW — top up Ping Africa now' : `Alert below ${status.sms.threshold}`}</p>
        </div>
        <StaffStat label="Database" value={status.database ? 'Connected' : 'DOWN'} tone={status.database ? 'emerald' : 'rose'} hint={`Server up ${status.uptimeMinutes} min · Node ${status.nodeVersion}`} />
        <StaffStat label="Unpaid orders now" value={status.unpaidOrders} tone={status.unpaidOrders > 10 ? 'amber' : 'slate'} hint="Checked every 3 minutes" />
        <StaffStat label="Error monitoring" value={status.sentry ? 'Sentry on' : 'Built-in log'} tone={status.sentry ? 'emerald' : 'sky'} hint={status.sentryConfigured && !status.sentry ? 'DSN set but package missing' : 'Errors appear in Live Activity'} />
      </div>

      {/* PAYMENT SAFETY NET */}
      <div className={`${cardCls} p-5 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-white flex items-center gap-2"><RefreshCw className="w-4 h-4 text-emerald-400" /> Payment safety net</p><button onClick={reconcile} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer">Re-check payments now</button></div>
        <p className="text-[11px] text-slate-400">Every 3 minutes the server asks PayHero about unpaid orders. Paid ones are confirmed even if the customer closed the page; orders still unpaid after the time below are cancelled and their stock is released.</p>
        <p className="text-[11px] text-slate-500">Last run: {job.lastRun ? formatWhen(job.lastRun) : 'not yet'} · checked {job.checked} · confirmed {job.confirmed} · failed {job.failed} · expired {job.expired}{job.error ? ` · ${job.error}` : ''}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div><label className={labelCls}>Cancel unpaid orders after (minutes)</label><input type="number" min={10} max={1440} defaultValue={ops.orderExpiryMinutes} onBlur={(e) => Number(e.target.value) !== ops.orderExpiryMinutes && saveOps({ orderExpiryMinutes: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className={labelCls}>Low stock default (bags)</label><input type="number" min={0} defaultValue={ops.lowStockDefault} onBlur={(e) => Number(e.target.value) !== ops.lowStockDefault && saveOps({ lowStockDefault: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className={labelCls}>SMS credit alert level</label><input type="number" min={0} defaultValue={ops.smsLowThreshold} onBlur={(e) => Number(e.target.value) !== ops.smsLowThreshold && saveOps({ smsLowThreshold: Number(e.target.value) })} className={inputCls} /></div>
          <div><label className={labelCls}>Credit used per SMS</label><input type="number" min={0} step="0.05" defaultValue={ops.smsCostPerPart} onBlur={(e) => Number(e.target.value) !== ops.smsCostPerPart && saveOps({ smsCostPerPart: Number(e.target.value) })} className={inputCls} /></div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={ops.autoReconcile !== false} onChange={(e) => saveOps({ autoReconcile: e.target.checked })} className="accent-emerald-500" /> Automatic payment re-check and unpaid-order expiry is ON</label>
      </div>

      {/* SECURITY */}
      <div className={`${cardCls} p-5 space-y-2`}>
        <p className="text-xs font-black text-white flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-400" /> Administrator sign-in security</p>
        <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={ops.adminTwoFactor !== false} onChange={(e) => { if (!e.target.checked && !confirm('Turn OFF two-step sign-in for administrators? Anyone with an admin password could then get in. This is recorded as a security alert.')) return; saveOps({ adminTwoFactor: e.target.checked }); }} className="accent-emerald-500 mt-0.5" /> <span>Require a 6-digit code (sent by SMS and email) after the password when an administrator signs in.</span></label>
        {status.twoFactor.forcedOffByEnv && <p className="text-[11px] text-amber-400 font-bold">Currently forced OFF by the DISABLE_ADMIN_2FA setting on your server. Remove that setting to turn it back on.</p>}
        <p className="text-[10px] text-slate-500">If SMS credit runs out and you cannot receive the email, set DISABLE_ADMIN_2FA=true on Render to get back in, then remove it.</p>
      </div>

      {/* DAILY SUMMARY */}
      <div className={`${cardCls} p-5 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-sky-400" /> Daily summary</p><button onClick={sendTest} disabled={busy} className="px-3 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 text-white text-[11px] font-extrabold cursor-pointer">Send today&apos;s summary now</button></div>
        <p className="text-[11px] text-slate-400">Sales, payments, profit estimate, low stock, commissions owed and alerts, sent to every administrator.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ops.dailySummary.enabled} onChange={(e) => saveOps({ dailySummary: { enabled: e.target.checked } })} className="accent-emerald-500" /> Send every day at</label>
          <input type="time" defaultValue={ops.dailySummary.time} onBlur={(e) => e.target.value && e.target.value !== ops.dailySummary.time && saveOps({ dailySummary: { time: e.target.value } })} className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white" /><span className="text-slate-500 text-[11px]">(Kenya time)</span>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ops.dailySummary.sms} onChange={(e) => saveOps({ dailySummary: { sms: e.target.checked } })} className="accent-emerald-500" /> SMS</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ops.dailySummary.email} onChange={(e) => saveOps({ dailySummary: { email: e.target.checked } })} className="accent-emerald-500" /> Email</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Extra phone numbers (comma separated)</label><input value={extra.phones} onChange={(e) => setExtra({ ...extra, phones: e.target.value })} onBlur={() => saveOps({ dailySummary: { extraPhones: extra.phones.split(',').map(s => s.trim()).filter(Boolean) } })} className={inputCls} placeholder="0712345678, 0722000000" /></div>
          <div><label className={labelCls}>Extra email addresses</label><input value={extra.emails} onChange={(e) => setExtra({ ...extra, emails: e.target.value })} onBlur={() => saveOps({ dailySummary: { extraEmails: extra.emails.split(',').map(s => s.trim()).filter(Boolean) } })} className={inputCls} placeholder="accountant@example.com" /></div>
        </div>
        <p className="text-[10px] text-slate-500">Administrators&apos; own phone numbers and emails (from their accounts) always receive it.</p>
      </div>

      {/* PERMISSIONS */}
      <div className={`${cardCls} p-5 space-y-4`}>
        <p className="text-xs font-black text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Role permissions</p>
        <p className="text-[11px] text-slate-400">Switch abilities on or off for each staff type. Changes apply immediately. Administrators always have full access.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.keys(perms.catalog).map(role => (
            <div key={role} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-sky-400">{roleLabels[role] || role}</p>
              {perms.catalog[role].map((p: any) => (
                <label key={p.key} className="flex items-center justify-between gap-3 text-xs text-slate-200 cursor-pointer py-1">
                  <span>{p.label}</span>
                  <input type="checkbox" checked={!!perms.permissions[role][p.key]} onChange={(e) => togglePerm(role, p.key, e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* RECENT PROBLEMS */}
      <div className={`${cardCls} overflow-hidden`}>
        <p className="p-4 text-xs font-black text-white border-b border-slate-800">Recent problems & warnings</p>
        <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
          {status.recentErrors.length === 0 && <p className="p-6 text-center text-xs text-emerald-400 font-bold">Nothing wrong has been recorded. 🎉</p>}
          {status.recentErrors.map((e: any) => (<div key={e.id} className="p-3"><p className="text-xs text-slate-200"><span className="font-mono text-[10px] text-rose-400">{e.action}</span> {e.summary}</p><p className="text-[10px] text-slate-500 mt-0.5">{formatWhen(e.createdAt)}</p></div>))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAFF, AGENT & ACTIVITY SCREENS (customer care, agents, admin tracking)
// ============================================================================

type ToastFn = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

const staffApi = async (path: string, token: string | null, options: { method?: string; body?: any } = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};

const formatWhen = (value: any) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StaffStat = ({ label, value, tone = 'slate', hint }: { label: string; value: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'sky'; hint?: string }) => {
  const tones: Record<string, string> = {
    slate: 'text-white', emerald: 'text-emerald-400', amber: 'text-amber-400', rose: 'text-rose-400', sky: 'text-sky-400'
  };
  return (
    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-black mt-1 ${tones[tone]}`}>{value}</p>
      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
};

const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-950 text-amber-300 border-amber-800',
    PAID: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    NO_PROFIT: 'bg-slate-800 text-slate-400 border-slate-700',
    REVERSED: 'bg-slate-800 text-slate-400 border-slate-700',
    CLAWBACK_DUE: 'bg-rose-950 text-rose-300 border-rose-800'
  };
  const label: Record<string, string> = { PENDING: 'Pending payout', PAID: 'Paid', NO_PROFIT: 'No profit', REVERSED: 'Reversed', CLAWBACK_DUE: 'Recover from agent' };
  return <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${map[status] || map.NO_PROFIT}`}>{label[status] || status}</span>;
};

const copyText = async (text: string, showToast: ToastFn, okMessage: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMessage, 'success');
  } catch (_) {
    showToast('Could not copy automatically. Select the text and copy it.', 'warning');
  }
};

// ---------------------------------------------------------------------------
// AGENT DASHBOARD
// ---------------------------------------------------------------------------
function AgentDashboard({ token, user, showToast, onSessionExpired }: { token: string | null; user: UserAccount; showToast: ToastFn; onSessionExpired: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tab, setTab] = useState<'customers' | 'commissions' | 'rice' | 'payouts'>('commissions');

  const load = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const d = await staffApi(`/agent/overview?year=${y}`, token);
      setData(d);
    } catch (err: any) {
      if (err.status === 401) onSessionExpired();
      else showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(year); }, [year, load]);

  if (loading && !data) return <div className="min-h-[60vh] flex items-center justify-center bg-slate-950 text-slate-400 text-sm font-bold">Loading your agent dashboard…</div>;
  if (!data) return <div className="min-h-[60vh] flex items-center justify-center bg-slate-950 text-slate-400 text-sm font-bold">Your agent dashboard is not available right now.</div>;

  const sm = data.summary;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${data.referralCode}` : data.referralCode;
  const maxCommission = Math.max(1, ...data.monthly.map((m: any) => m.commission));

  return (
    <div className="min-h-[85vh] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Agent Partner Console</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Welcome, {user.fullName}</h2>
            <p className="text-xs text-slate-400 mt-1">
              You earn {Math.round(data.rates.newCustomerRate * 100)}% of the profit on a new customer&apos;s first order and {Math.round(data.rates.repeatRate * 100)}% on every repeat order.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white cursor-pointer">
              {data.availableYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => load(year)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 cursor-pointer" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Referral code card */}
        <div className="bg-gradient-to-r from-emerald-900/60 to-teal-900/40 border border-emerald-700/40 rounded-3xl p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Your referral code</p>
            <p className="text-3xl font-black font-mono tracking-widest text-white mt-1">{data.referralCode}</p>
            <p className="text-[11px] text-emerald-100/70 mt-1">Customers enter this when they sign up or at checkout.</p>
          </div>
          <div className="md:col-span-2 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Your sign-up link</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input readOnly value={link} className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-xs font-mono text-slate-200" />
              <button onClick={() => copyText(link, showToast, 'Link copied. Share it with your customers!')} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer">
                <Link2 className="w-4 h-4" /> Copy link
              </button>
              <button onClick={() => copyText(data.referralCode, showToast, 'Code copied.')} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer">
                <Copy className="w-4 h-4" /> Copy code
              </button>
            </div>
          </div>
        </div>

        {sm.clawbackDue > 0 && (
          <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-4 text-xs text-rose-200 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {formatKES(sm.clawbackDue)} of commission you were already paid is on orders that were later refunded or cancelled. Admin will settle this with you.
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StaffStat label="Customers referred" value={sm.customers} tone="sky" />
          <StaffStat label="Paid orders" value={sm.orders} hint={`${sm.newCustomerOrders} first orders · ${sm.repeatOrders} repeat`} />
          <StaffStat label="Items sold" value={`${sm.kgSold.toLocaleString()} kg`} tone="emerald" />
          <StaffStat label="Sales value" value={formatKES(sm.salesValue)} />
          <StaffStat label="Profit you generated" value={sm.profitGenerated === null ? '—' : formatKES(sm.profitGenerated)} />
          <StaffStat label="Commission pending" value={formatKES(sm.commissionPending)} tone="amber" hint="Awaiting payout" />
          <StaffStat label="Commission paid" value={formatKES(sm.commissionPaid)} tone="emerald" />
          <StaffStat label="Total earned" value={formatKES(sm.commissionTotal)} tone="emerald" />
        </div>

        {/* Monthly commission bars */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
          <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-emerald-400" /> Commission by month — {data.year}</h3>
          <div className="grid grid-cols-12 gap-2 items-end h-40">
            {data.monthly.map((m: any) => (
              <div key={m.monthIndex} className="flex flex-col items-center justify-end h-full gap-1" title={`${m.month}: ${formatKES(m.commission)} from ${m.orders} order(s), ${m.kg} kg`}>
                <span className="text-[9px] font-bold text-slate-400">{m.commission > 0 ? Math.round(m.commission) : ''}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-700 to-emerald-400" style={{ height: `${Math.max(m.commission > 0 ? 6 : 2, (m.commission / maxCommission) * 100)}%`, opacity: m.commission > 0 ? 1 : 0.25 }} />
                <span className="text-[9px] font-bold text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {([
            ['commissions', 'My Sales & Commission'], ['customers', 'My Customers'], ['rice', 'Rice I Have Sold'], ['payouts', 'Payouts Received']
          ] as const).filter(([id]) => id !== 'customers' || data.permissions?.['agent.customers'] !== false).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${tab === id ? 'bg-emerald-700 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'}`}>{label}</button>
          ))}
        </div>

        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            {tab === 'commissions' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black border-b border-slate-800">
                  <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Rice</th><th className="p-3">Type</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">You earn</th><th className="p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.commissions.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-bold">No sales yet. Share your link to get your first customer!</td></tr>}
                  {data.commissions.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-400">#{c.orderId}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(c.date)}</td>
                      <td className="p-3 font-bold text-white">{c.customer}</td>
                      <td className="p-3 text-slate-300 max-w-[220px] truncate" title={c.items}>{c.items}</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${c.type === 'NEW_CUSTOMER' ? 'bg-sky-950 text-sky-300' : 'bg-slate-800 text-slate-300'}`}>{c.type === 'NEW_CUSTOMER' ? 'New customer' : 'Repeat'}</span></td>
                      <td className="p-3 text-right">{c.profit === null ? '—' : formatKES(c.profit)}</td>
                      <td className="p-3 text-right text-slate-300">{Math.round(c.rate * 100)}%</td>
                      <td className="p-3 text-right font-black text-emerald-400">{formatKES(c.amount)}</td>
                      <td className="p-3"><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'customers' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black border-b border-slate-800">
                  <tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Joined</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Spent on rice</th><th className="p-3 text-right">Your commission</th><th className="p-3">Last order</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.customers.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500 font-bold">Nobody has signed up with your code yet.</td></tr>}
                  {data.customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{c.fullName}</td>
                      <td className="p-3 font-mono text-slate-400">{c.phone}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(c.joinedAt)}</td>
                      <td className="p-3 text-right">{c.orders}</td>
                      <td className="p-3 text-right">{formatKES(c.totalSpent)}</td>
                      <td className="p-3 text-right font-black text-emerald-400">{formatKES(c.commissionEarned)}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">{c.lastOrderAt ? formatWhen(c.lastOrderAt) : 'No order yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'rice' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black border-b border-slate-800">
                  <tr><th className="p-3">Rice</th><th className="p-3 text-right">Bags sold</th><th className="p-3 text-right">Total kg</th><th className="p-3 text-right">Sales value</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.products.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500 font-bold">Your rice sales will appear here once customers pay.</td></tr>}
                  {data.products.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{p.name}</td>
                      <td className="p-3 text-right">{p.quantity}</td>
                      <td className="p-3 text-right text-emerald-400 font-black">{p.kg.toLocaleString()} kg</td>
                      <td className="p-3 text-right">{formatKES(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'payouts' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black border-b border-slate-800">
                  <tr><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Method</th><th className="p-3 text-right">Orders covered</th><th className="p-3 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.payouts.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500 font-bold">No payouts yet. Pending commission is paid out by the admin.</td></tr>}
                  {data.payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(p.date)}</td>
                      <td className="p-3 font-mono font-bold text-white">{p.reference}</td>
                      <td className="p-3 uppercase text-slate-400">{p.method}</td>
                      <td className="p-3 text-right">{p.commissionCount}</td>
                      <td className="p-3 text-right font-black text-emerald-400">{formatKES(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMER CARE DASHBOARD — fixed navigation panel on the left, work area on the right
// Can view every account, order and payment. The only changes allowed: fix a name, reactivate an account.
// ---------------------------------------------------------------------------
type SupportSection = 'overview' | 'customers' | 'orders' | 'payments' | 'reviews' | 'activity';

function SupportDashboard({ token, user, showToast, onSessionExpired }: { token: string | null; user: UserAccount; showToast: ToastFn; onSessionExpired: () => void }) {
  const [section, setSection] = useState<SupportSection>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [perms, setPerms] = useState<Record<string, boolean> | null>(null);
  const can = (k: string) => !!(perms && perms[k]);
  useEffect(() => { staffApi('/me/permissions', token).then(d => setPerms(d.permissions)).catch(() => setPerms({})); }, [token]);

  // customers
  const [list, setList] = useState<any>({ users: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended' | 'unverified'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [reason, setReason] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // orders & payments
  const [orders, setOrders] = useState<any>({ orders: [], total: 0, page: 1, pages: 1, counts: { all: 0, paid: 0, pending: 0, failed: 0 } });
  const [orderSearch, setOrderSearch] = useState('');
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [orderPage, setOrderPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [openOrder, setOpenOrder] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<number, any>>({});
  const [checking, setChecking] = useState<number | null>(null);

  const fail = (err: any) => { if (err.status === 401) onSessionExpired(); else showToast(err.message, 'error'); };

  const loadOverview = useCallback(async () => {
    try { setOverview(await staffApi('/support/overview', token)); } catch (err) { fail(err); }
  }, [token]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try { setList(await staffApi(`/support/users?search=${encodeURIComponent(search)}&status=${status}&page=${page}`, token)); }
    catch (err) { fail(err); } finally { setLoading(false); }
  }, [token, search, status, page]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const pay = section === 'payments' ? payFilter : 'all';
      setOrders(await staffApi(`/support/orders?search=${encodeURIComponent(orderSearch)}&payment=${pay}&page=${orderPage}`, token));
    } catch (err) { fail(err); } finally { setOrdersLoading(false); }
  }, [token, orderSearch, payFilter, orderPage, section]);

  const openUser = async (id: number) => {
    setDetailLoading(true);
    try {
      const d = await staffApi(`/support/users/${id}`, token);
      setSelected(d); setNameDraft(d.user.fullName); setReason(''); setNoteDraft('');
    } catch (err) { fail(err); } finally { setDetailLoading(false); }
  };

  const goToCustomer = (id: number) => { setSection('customers'); openUser(id); };

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { if (section === 'customers') { const t = setTimeout(loadList, 300); return () => clearTimeout(t); } }, [section, loadList]);
  useEffect(() => { if (section === 'orders' || section === 'payments') { const t = setTimeout(loadOrders, 300); return () => clearTimeout(t); } }, [section, loadOrders]);

  const refreshUser = async (id: number) => { await Promise.all([openUser(id), loadList(), loadOverview()]); };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setBusy(true);
    try { const r = await staffApi(`/support/users/${selected.user.id}/name`, token, { method: 'PUT', body: { fullName: nameDraft } }); showToast(r.message || 'Name updated.', 'success'); await refreshUser(selected.user.id); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };
  const unsuspend = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setBusy(true);
    try { const r = await staffApi(`/support/users/${selected.user.id}/unsuspend`, token, { method: 'POST', body: { reason } }); showToast(r.message || 'Account reactivated.', 'success'); await refreshUser(selected.user.id); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setBusy(true);
    try { await staffApi(`/support/users/${selected.user.id}/notes`, token, { method: 'POST', body: { note: noteDraft } }); setNoteDraft(''); await openUser(selected.user.id); showToast('Note saved.', 'success'); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };
  const checkPayment = async (orderId: number) => {
    setChecking(orderId);
    try { const r = await staffApi(`/support/orders/${orderId}/payment-check`, token); setChecks(c => ({ ...c, [orderId]: r })); loadOverview(); }
    catch (err) { fail(err); } finally { setChecking(null); }
  };

  const u = selected?.user;
  const readOnly = !!u && (u.role === 'admin' || u.role === 'support' || u.id === user.id);
  const allNav: { id: SupportSection; label: string; icon: any; badge?: number; perm?: string[] }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'customers', label: 'Customers', icon: Users, badge: overview?.suspended, perm: ['users.view'] },
    { id: 'orders', label: 'Orders', icon: Package, perm: ['orders.view'] },
    { id: 'payments', label: 'Payments', icon: Wallet, badge: overview && overview.pendingPayments !== null ? overview.pendingPayments + overview.failedPayments : undefined, perm: ['payments.view'] },
    { id: 'reviews', label: 'Reviews', icon: Star, perm: ['reviews.moderate'] },
    { id: 'activity', label: 'My Activity', icon: Clock }
  ];
  const navItems = allNav.filter(n => !n.perm || n.perm.some(k => can(k)));
  useEffect(() => { if (perms && !navItems.some(n => n.id === section)) setSection('overview'); }, [perms]);
  const verdictStyle: Record<string, string> = {
    CONFIRMED_PAID: 'bg-emerald-950 border-emerald-800 text-emerald-200', NOT_PAID: 'bg-slate-800 border-slate-700 text-slate-200',
    PAID_NOT_RECORDED: 'bg-rose-950 border-rose-800 text-rose-200', RECORDED_PAID_UNCONFIRMED: 'bg-amber-950 border-amber-800 text-amber-200', UNKNOWN: 'bg-slate-800 border-slate-700 text-slate-300'
  };
  const payPill = (s: string) => s === 'paid' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : s === 'failed' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-amber-950 text-amber-300 border-amber-800';

  const OrdersTable = ({ mode }: { mode: 'orders' | 'payments' }) => (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <input value={orderSearch} onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }} placeholder={mode === 'payments' ? 'Search M-Pesa receipt, phone, customer name or order #…' : 'Search order #, customer, phone or receipt…'} className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
        {mode === 'payments' && (
          <div className="flex flex-wrap gap-2">
            {(['all', 'paid', 'pending', 'failed'] as const).map(f => (
              <button key={f} onClick={() => { setPayFilter(f); setOrderPage(1); }} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${payFilter === f ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {f} <span className="opacity-70">({orders.counts[f] ?? 0})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-black">
              <tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th>{mode === 'payments' ? <><th className="p-3">M-Pesa</th><th className="p-3">Receipt</th></> : <><th className="p-3">Delivery</th><th className="p-3">Status</th></>}<th className="p-3 text-right">Total</th><th className="p-3">Payment</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ordersLoading && orders.orders.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500 font-bold">Loading…</td></tr>}
              {!ordersLoading && orders.orders.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-500 font-bold">Nothing matches.</td></tr>}
              {orders.orders.map((o: any) => (
                <React.Fragment key={o.id}>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-slate-300">#{o.id}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(o.createdAt)}</td>
                    <td className="p-3"><button onClick={() => goToCustomer(o.customer.id)} className="font-bold text-sky-400 hover:underline cursor-pointer text-left">{o.customer.fullName}</button><p className="text-[10px] text-slate-500">{o.customer.phone}</p></td>
                    {mode === 'payments'
                      ? <><td className="p-3 font-mono text-slate-300">{o.mpesaNumber || '—'}</td><td className="p-3 font-mono font-bold text-emerald-400">{o.mpesaReceipt || '—'}</td></>
                      : <><td className="p-3 text-slate-300">{o.county}{o.town ? `, ${o.town}` : ''}</td><td className="p-3 capitalize text-slate-300">{String(o.status).replace('_', ' ')}</td></>}
                    <td className="p-3 text-right font-bold">{formatKES(o.grandTotal)}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${payPill(o.paymentState)}`}>{o.paymentState}</span></td>
                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      <button style={{ display: can('payments.check') ? undefined : 'none' }} onClick={() => checkPayment(o.id)} disabled={checking === o.id} className="px-2.5 py-1.5 rounded-lg bg-sky-800 hover:bg-sky-700 disabled:opacity-50 text-white text-[10px] font-extrabold cursor-pointer">{checking === o.id ? 'Checking…' : 'Check payment'}</button>
                      <button onClick={() => setOpenOrder(openOrder === o.id ? null : o.id)} className="p-1.5 text-slate-400 hover:text-white cursor-pointer" title="Details"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                  {(openOrder === o.id || checks[o.id]) && (
                    <tr className="bg-slate-950/60"><td colSpan={8} className="p-4 space-y-3">
                      {checks[o.id] && (
                        <div className={`p-3 rounded-xl border text-xs font-bold ${verdictStyle[checks[o.id].verdict] || verdictStyle.UNKNOWN}`}>
                          {checks[o.id].message}
                          <span className="block text-[10px] font-medium opacity-80 mt-0.5">PayHero status: {checks[o.id].payheroStatus || 'unreachable'} · Order amount {formatKES(checks[o.id].orderAmount)}{checks[o.id].mpesaReceipt ? ` · Receipt ${checks[o.id].mpesaReceipt}` : ''}</span>
                        </div>
                      )}
                      {openOrder === o.id && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div><p className="text-[10px] font-black uppercase text-slate-500">Items</p><p className="text-slate-200">{o.items}</p><p className="text-slate-500 mt-1">Rice {formatKES(o.subTotal)} + delivery {formatKES(o.transportFee)}</p></div>
                          <div><p className="text-[10px] font-black uppercase text-slate-500">Delivery address</p><p className="text-slate-200">{o.address || '—'}</p></div>
                          <div><p className="text-[10px] font-black uppercase text-slate-500">Payment</p><p className="text-slate-200">{o.paidTag || o.paymentState} via {String(o.method || 'mpesa').replace('_', ' ')}</p>{o.paidAt && <p className="text-slate-500">Paid {formatWhen(o.paidAt)}</p>}{o.failureReason && <p className="text-rose-300">Reason: {o.failureReason}</p>}<p className="text-slate-500 mt-1">{o.customer.email || ''}</p></div>
                        </div>
                      )}
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 flex items-center justify-between border-t border-slate-800 text-xs">
          <button disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Newer</button>
          <span className="text-slate-500 font-bold">{orders.total} result(s) · page {orders.page} of {orders.pages}</span>
          <button disabled={orderPage >= orders.pages} onClick={() => setOrderPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Older</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-950 text-slate-100 lg:h-[calc(100vh-4.5rem)] flex flex-col lg:flex-row lg:overflow-hidden">
      {/* FIXED NAVIGATION PANEL */}
      <aside className="lg:w-60 lg:shrink-0 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 lg:h-full flex lg:flex-col sticky top-0 lg:static z-20">
        <div className="hidden lg:block p-5 border-b border-slate-800">
          <div className="flex items-center gap-2"><Headphones className="w-5 h-5 text-sky-400" /><span className="text-[11px] font-black text-sky-400 uppercase tracking-widest">Customer Care</span></div>
          <p className="text-sm font-black text-white mt-2 truncate">{user.fullName}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">View everything · change names · reactivate accounts</p>
        </div>
        <nav className="flex lg:flex-col gap-1 p-2 lg:p-3 overflow-x-auto lg:overflow-visible w-full">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${section === item.id ? 'bg-sky-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <item.icon className="w-4 h-4 shrink-0" /> <span>{item.label}</span>
              {!!item.badge && <span className="ml-auto px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <p className="hidden lg:block mt-auto p-4 text-[10px] text-slate-600 leading-relaxed">Everything you do here is recorded for the administrator.</p>
      </aside>

      {/* WORK PANEL */}
      <main className="flex-1 min-w-0 lg:overflow-y-auto p-4 sm:p-6 space-y-5">
        {section === 'overview' && (
          <>
            <div><h2 className="text-xl sm:text-2xl font-black text-white">Hello, {user.fullName}</h2><p className="text-xs text-slate-400 mt-1">Here is what needs attention today.</p></div>
            {overview ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StaffStat label="Accounts" value={overview.totalCustomers} />
                  <StaffStat label="Suspended" value={overview.suspended} tone="rose" />
                  <StaffStat label="Not verified" value={overview.unverified} tone="amber" />
                  <StaffStat label="New this week" value={overview.newThisWeek} tone="emerald" />
                  {overview.paidToday !== null && <StaffStat label="Paid today" value={overview.paidToday} tone="emerald" hint={formatKES(overview.paidTodayValue)} />}
                  {overview.pendingPayments !== null && <StaffStat label="Awaiting payment" value={overview.pendingPayments} tone="amber" />}
                  {overview.failedPayments !== null && <StaffStat label="Failed payments" value={overview.failedPayments} tone="rose" />}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => { setStatus('suspended'); setPage(1); setSection('customers'); }} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-700 text-left cursor-pointer"><p className="text-xs font-black text-white flex items-center gap-2"><Ban className="w-4 h-4 text-rose-400" /> Suspended accounts</p><p className="text-[11px] text-slate-400 mt-1">Review and reactivate customers who were suspended.</p></button>
                  {can('payments.view') && <button onClick={() => { setPayFilter('failed'); setOrderPage(1); setSection('payments'); }} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-700 text-left cursor-pointer"><p className="text-xs font-black text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-400" /> Failed payments</p><p className="text-[11px] text-slate-400 mt-1">Help customers whose M-Pesa payment did not go through.</p></button>}
                  {can('payments.view') && <button onClick={() => { setPayFilter('pending'); setOrderPage(1); setSection('payments'); }} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-700 text-left cursor-pointer"><p className="text-xs font-black text-white flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Awaiting payment</p><p className="text-[11px] text-slate-400 mt-1">Check whether pending orders were actually paid.</p></button>}
                </div>
              </>
            ) : <p className="text-xs text-slate-500 font-bold">Loading…</p>}
          </>
        )}

        {section === 'customers' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <div className="xl:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 space-y-3 border-b border-slate-800">
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, phone, email or account number…" className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'suspended', 'unverified'] as const).map(s => (
                    <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${status === s ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s}</button>
                  ))}
                  <span className="ml-auto text-[11px] font-bold text-slate-500 self-center">{list.total} found</span>
                </div>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-[62vh] overflow-y-auto">
                {loading && list.users.length === 0 && <p className="p-6 text-center text-xs text-slate-500 font-bold">Searching…</p>}
                {!loading && list.users.length === 0 && <p className="p-6 text-center text-xs text-slate-500 font-bold">No accounts match.</p>}
                {list.users.map((x: any) => (
                  <button key={x.id} onClick={() => openUser(x.id)} className={`w-full p-4 text-left hover:bg-slate-800/50 cursor-pointer flex items-center justify-between gap-3 ${selected?.user?.id === x.id ? 'bg-slate-800/70' : ''}`}>
                    <div className="min-w-0"><p className="text-xs font-extrabold text-white truncate">{x.fullName}</p><p className="text-[11px] text-slate-400 truncate">{x.phoneNumber}{x.email ? ` · ${x.email}` : ''}</p></div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {x.isActive === false ? <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-black uppercase">Suspended</span>
                        : x.isVerified === false ? <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-black uppercase">Unverified</span>
                        : <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-black uppercase">Active</span>}
                      {(x.role === 'agent' || x.role === 'support' || x.role === 'admin') && <span className="text-[9px] font-black uppercase text-sky-400">{x.role}</span>}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 flex items-center justify-between border-t border-slate-800 text-xs">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Previous</button>
                <span className="text-slate-500 font-bold">Page {list.page} of {list.pages}</span>
                <button disabled={page >= list.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Next</button>
              </div>
            </div>

            <div className="xl:col-span-7 space-y-4">
              {!selected && !detailLoading && <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-xs font-bold text-slate-500">Select an account to see its details.</div>}
              {detailLoading && <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center text-xs font-bold text-slate-500">Loading account…</div>}
              {selected && u && !detailLoading && (
                <>
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Account #{u.id} · {u.role === 'user' ? 'customer' : u.role}</p><h3 className="text-lg font-black text-white">{u.fullName}</h3></div>
                      {u.isActive === false ? <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-black uppercase">Suspended</span> : <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-black uppercase">Active</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Phone</p><p className="font-bold text-slate-200">{u.phoneNumber || '—'}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Email</p><p className="font-bold text-slate-200 break-all">{u.email || '—'}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Reward points</p><p className="font-bold text-amber-400">{u.rewardPoints || 0} pts</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Joined</p><p className="font-bold text-slate-200">{formatWhen(u.createdAt)}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Verified</p><p className="font-bold text-slate-200">{u.isVerified === false ? 'No' : 'Yes'}</p></div>
                      <div><p className="text-[10px] font-black uppercase text-slate-500">Referred by</p><p className="font-bold text-slate-200">{selected.referredBy || '—'}</p></div>
                    </div>
                    {readOnly ? (
                      <p className="text-[11px] font-bold text-slate-400 pt-3 border-t border-slate-800">This is a staff or administrator account, so it is view-only for you.</p>
                    ) : (
                      <>
                        <form onSubmit={saveName} style={{ display: can('users.rename') ? undefined : 'none' }} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-800">
                          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white" placeholder="Correct full name" />
                          <button type="submit" disabled={busy || nameDraft.trim() === u.fullName} className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer">Update name</button>
                        </form>
                        {u.isActive === false && can('users.unsuspend') && (
                          <form onSubmit={unsuspend} className="space-y-2 pt-3 border-t border-slate-800">
                            <p className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> Suspended: this customer cannot sign in.</p>
                            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" placeholder="Why is it being reactivated? (required)" />
                            <button type="submit" disabled={busy || reason.trim().length < 3} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer"><UserCheck className="w-4 h-4" /> Reactivate account</button>
                          </form>
                        )}
                      </>
                    )}
                  </div>

                  <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    <p className="p-4 text-xs font-black text-white border-b border-slate-800">Orders ({selected.orders.length})</p>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Items</th><th className="p-3 text-right">Total</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3"></th></tr></thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selected.orders.length === 0 && <tr><td colSpan={7} className="p-5 text-center text-slate-500 font-bold">No orders yet.</td></tr>}
                          {selected.orders.map((o: any) => (
                            <tr key={o.id}>
                              <td className="p-3 font-mono font-bold text-slate-400">#{o.id}</td>
                              <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(o.createdAt)}</td>
                              <td className="p-3 text-slate-300 max-w-[160px] truncate" title={o.items}>{o.items}</td>
                              <td className="p-3 text-right font-bold">{formatKES(o.grandTotal)}</td>
                              <td className="p-3 capitalize text-slate-300">{String(o.status).replace('_', ' ')}</td>
                              <td className="p-3"><span className="font-bold text-slate-200">{o.paymentStatus}</span>{o.mpesaReceipt && <span className="block font-mono text-[10px] text-slate-500">{o.mpesaReceipt}</span>}</td>
                              <td className="p-3"><button onClick={() => { setOrderSearch(String(o.id)); setPayFilter('all'); setOrderPage(1); setSection('payments'); }} className="text-[10px] font-extrabold text-sky-400 hover:underline cursor-pointer">Check</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
                      <p className="text-xs font-black text-white flex items-center gap-2"><StickyNote className="w-4 h-4 text-amber-400" /> Case notes</p>
                      <form onSubmit={addNote} style={{ display: can('users.notes') ? undefined : 'none' }} className="flex gap-2">
                        <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" placeholder="Add a note about this customer…" />
                        <button type="submit" disabled={busy || noteDraft.trim().length < 3 || u.role === 'admin'} className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer">Add</button>
                      </form>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selected.notes.length === 0 && <p className="text-[11px] text-slate-500 font-bold">No notes yet.</p>}
                        {selected.notes.map((n: any) => (<div key={n.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800"><p className="text-xs text-slate-200">{n.note}</p><p className="text-[10px] text-slate-500 mt-1">{n.authorName} · {formatWhen(n.createdAt)}</p></div>))}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
                      <p className="text-xs font-black text-white flex items-center gap-2"><Clock className="w-4 h-4 text-sky-400" /> Account history</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {selected.history.length === 0 && <p className="text-[11px] text-slate-500 font-bold">Nothing recorded yet.</p>}
                        {selected.history.map((h: any) => (<div key={h.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800"><p className="text-xs text-slate-200">{h.summary}</p><p className="text-[10px] text-slate-500 mt-1">{formatWhen(h.createdAt)}</p></div>))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {section === 'orders' && <><h2 className="text-xl font-black text-white">All orders</h2>{OrdersTable({ mode: 'orders' })}</>}
        {section === 'payments' && <><h2 className="text-xl font-black text-white">Payments</h2><p className="text-xs text-slate-400 -mt-2">Use <span className="font-bold text-sky-300">Check payment</span> to ask PayHero if an order was really paid. It only reports; it never changes the order.</p>{OrdersTable({ mode: 'payments' })}</>}

        {section === 'reviews' && <><h2 className="text-xl font-black text-white">Customer reviews</h2><AdminReviewsPanel token={token} showToast={showToast} /></>}

        {section === 'activity' && (
          <>
            <h2 className="text-xl font-black text-white">My recent activity</h2>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 divide-y divide-slate-800/60">
              {(!overview || overview.myRecentActions.length === 0) && <p className="p-6 text-center text-xs text-slate-500 font-bold">Nothing yet.</p>}
              {overview && overview.myRecentActions.map((a: any) => (<div key={a.id} className="p-4"><p className="text-xs text-slate-200">{a.summary}</p><p className="text-[10px] text-slate-500 mt-1">{formatWhen(a.createdAt)}</p></div>))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADMIN: AGENTS (appoint, track, pay out, set commission rates)
// ---------------------------------------------------------------------------
function AdminAgentsPanel({ token, showToast, adminUsers, onUsersChanged }: { token: string | null; showToast: ToastFn; adminUsers: UserAccount[]; onUsersChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState({ newCustomerRate: '60', repeatRate: '40' });
  const [appointId, setAppointId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [payout, setPayout] = useState({ reference: '', method: 'mpesa', note: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await staffApi('/admin/agents', token);
      setData(d);
      setRates({ newCustomerRate: String(Math.round(d.rates.newCustomerRate * 100)), repeatRate: String(Math.round(d.rates.repeatRate * 100)) });
    } catch (err: any) { showToast(err.message, 'error'); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openAgent = async (id: number) => {
    try { setDetail(await staffApi(`/admin/agents/${id}`, token)); setPayout({ reference: '', method: 'mpesa', note: '' }); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const saveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(rates.newCustomerRate), r = Number(rates.repeatRate);
    if (![n, r].every(v => Number.isFinite(v) && v >= 0 && v <= 100)) { showToast('Enter both rates as percentages between 0 and 100.', 'error'); return; }
    try {
      const res = await staffApi('/admin/config/agent-commission', token, { method: 'PUT', body: { newCustomerRate: n / 100, repeatRate: r / 100 } });
      showToast(res.message || 'Rates saved.', 'success');
      load();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const setRole = async (userId: number, role: 'agent' | 'customer', label: string) => {
    if (!confirm(label)) return;
    try {
      const res = await staffApi(`/admin/users/${userId}/role`, token, { method: 'PUT', body: { role } });
      showToast(res.message || 'Role updated.', 'success');
      setAppointId('');
      if (detail && detail.agent.id === userId) setDetail(null);
      load();
      onUsersChanged();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const regenerate = async (id: number) => {
    if (!confirm('Create a new referral code for this agent? The old code will stop working for new sign-ups (existing customers stay linked).')) return;
    try {
      const res = await staffApi(`/admin/agents/${id}/regenerate-code`, token, { method: 'POST' });
      showToast(`New code: ${res.referralCode}`, 'success');
      load();
      if (detail) openAgent(id);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const recordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (!confirm(`Record a payout of ${formatKES(detail.summary.commissionPending)} to ${detail.agent.fullName}? This marks all pending commissions as paid.`)) return;
    setBusy(true);
    try {
      const res = await staffApi(`/admin/agents/${detail.agent.id}/payouts`, token, { method: 'POST', body: payout });
      showToast(res.message || 'Payout recorded.', 'success');
      await openAgent(detail.agent.id);
      load();
    } catch (err: any) { showToast(err.message, 'error'); } finally { setBusy(false); }
  };

  const eligible = adminUsers.filter(u => u.role !== 'admin' && u.role !== 'agent' && u.role !== 'support' && !u.isSuspended && (u as any).isVerified !== false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StaffStat label="Active agents" value={data ? data.agents.filter((a: any) => a.isCurrentAgent).length : '…'} tone="sky" />
        <StaffStat label="Sales through agents" value={data ? formatKES(data.totals.sales) : '…'} />
        <StaffStat label="Commission owed" value={data ? formatKES(data.totals.pending) : '…'} tone="amber" hint="Pending payout" />
        <StaffStat label="Commission paid" value={data ? formatKES(data.totals.paid) : '…'} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={saveRates} className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><Percent className="w-4 h-4 text-emerald-400" /> Commission rates (share of profit)</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">New customer&apos;s first order (%)</label>
              <input type="number" min={0} max={100} value={rates.newCustomerRate} onChange={(e) => setRates(r => ({ ...r, newCustomerRate: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold" />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Repeat / old customers (%)</label>
              <input type="number" min={0} max={100} value={rates.repeatRate} onChange={(e) => setRates(r => ({ ...r, repeatRate: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Profit = price paid minus buying price, per bag. Delivery fees are never counted. Changes apply only to payments confirmed after you save.</p>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer">Save commission rates</button>
        </form>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4 text-sky-400" /> Appoint a new agent</h4>
          <select value={appointId} onChange={(e) => setAppointId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold cursor-pointer">
            <option value="">Choose a customer…</option>
            {eligible.map(u => <option key={u.id} value={u.id}>{u.fullName} — {u.phoneNumber || u.email}</option>)}
          </select>
          <button disabled={!appointId} onClick={() => setRole(Number(appointId), 'agent', 'Make this customer an agent? They get a referral code and an agent dashboard at their next sign-in.')} className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white font-extrabold text-xs cursor-pointer">Make agent</button>
          <p className="text-[10px] text-slate-500">Agents sign in exactly like customers. Dismissing an agent turns them back into a normal customer; their past earnings stay on record.</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <p className="text-xs font-black text-white">All agents</p>
          <button onClick={load} className="p-1.5 text-slate-400 hover:text-emerald-400 cursor-pointer" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Agent</th><th className="p-3">Code</th><th className="p-3 text-right">Customers</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Units sold</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Owed</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-800/60">
              {data && data.agents.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-slate-500 font-bold">No agents yet. Appoint one above.</td></tr>}
              {data && data.agents.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-800/40">
                  <td className="p-3"><p className="font-extrabold text-white">{a.fullName}</p><p className="text-[10px] text-slate-500">{a.phoneNumber}{!a.isCurrentAgent && ' · dismissed'}{!a.isActive && ' · suspended'}</p></td>
                  <td className="p-3 font-mono font-bold text-emerald-400">{a.referralCode}</td>
                  <td className="p-3 text-right">{a.summary.customers}</td>
                  <td className="p-3 text-right">{a.summary.orders}</td>
                  <td className="p-3 text-right">{a.summary.kgSold}</td>
                  <td className="p-3 text-right">{formatKES(a.summary.salesValue)}</td>
                  <td className="p-3 text-right font-black text-amber-400">{formatKES(a.summary.commissionPending)}</td>
                  <td className="p-3 text-right text-emerald-400">{formatKES(a.summary.commissionPaid)}</td>
                  <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                    <button onClick={() => openAgent(a.id)} className="p-1.5 text-slate-400 hover:text-emerald-400 cursor-pointer" title="View details & pay out"><Eye className="w-4 h-4" /></button>
                    {a.isCurrentAgent && <button onClick={() => regenerate(a.id)} className="p-1.5 text-slate-400 hover:text-sky-400 cursor-pointer" title="New referral code"><RefreshCw className="w-4 h-4" /></button>}
                    {a.isCurrentAgent
                      ? <button onClick={() => setRole(a.id, 'customer', `Dismiss ${a.fullName} as an agent? They become a normal customer and stop earning commission.`)} className="p-1.5 text-amber-400 hover:text-amber-300 cursor-pointer" title="Dismiss agent"><UserX className="w-4 h-4" /></button>
                      : <button onClick={() => setRole(a.id, 'agent', `Re-appoint ${a.fullName} as an agent? Their old code is restored.`)} className="p-1.5 text-emerald-400 hover:text-emerald-300 cursor-pointer" title="Re-appoint agent"><UserCheck className="w-4 h-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-4xl my-8 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500">Agent #{detail.agent.id} · code {detail.agent.referralCode}</p>
                <h3 className="text-lg font-black text-white">{detail.agent.fullName}</h3>
                <p className="text-xs text-slate-400">{detail.agent.phoneNumber} {detail.agent.email ? `· ${detail.agent.email}` : ''}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StaffStat label="Customers" value={detail.summary.customers} tone="sky" />
              <StaffStat label="Units sold" value={detail.summary.kgSold} tone="emerald" />
              <StaffStat label="Profit generated" value={formatKES(detail.summary.profitGenerated)} />
              <StaffStat label="Owed now" value={formatKES(detail.summary.commissionPending)} tone="amber" />
            </div>
            {detail.summary.clawbackDue > 0 && <div className="bg-rose-950/60 border border-rose-800 rounded-2xl p-3 text-xs text-rose-200 font-bold">{formatKES(detail.summary.clawbackDue)} was paid on orders that were later reversed — recover it or offset it against the next payout.</div>}

            {detail.summary.commissionPending > 0 && (
              <form onSubmit={recordPayout} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <input required value={payout.reference} onChange={(e) => setPayout(p => ({ ...p, reference: e.target.value }))} placeholder="M-Pesa / bank reference *" className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono font-bold" />
                <select value={payout.method} onChange={(e) => setPayout(p => ({ ...p, method: e.target.value }))} className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold cursor-pointer">
                  <option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="cash">Cash</option>
                </select>
                <button type="submit" disabled={busy} className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold cursor-pointer flex items-center justify-center gap-2"><Wallet className="w-4 h-4" /> Record payout</button>
                <input value={payout.note} onChange={(e) => setPayout(p => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="sm:col-span-4 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white" />
              </form>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Commission</th><th className="p-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-800/60">
                  {detail.commissions.length === 0 && <tr><td colSpan={8} className="p-5 text-center text-slate-500 font-bold">No sales yet.</td></tr>}
                  {detail.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td className="p-3 font-mono text-slate-400">#{c.orderId}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(c.date)}</td>
                      <td className="p-3 font-bold text-white">{c.customer}</td>
                      <td className="p-3">{c.type === 'NEW_CUSTOMER' ? 'New' : 'Repeat'}</td>
                      <td className="p-3 text-right">{formatKES(c.profit)}</td>
                      <td className="p-3 text-right">{Math.round(c.rate * 100)}%</td>
                      <td className="p-3 text-right font-black text-emerald-400">{formatKES(c.amount)}</td>
                      <td className="p-3"><StatusPill status={c.status} />{c.note && <span className="block text-[10px] text-slate-500 mt-0.5 max-w-[160px]">{c.note}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.payouts.length > 0 && (
              <div className="text-xs space-y-1.5">
                <p className="font-black text-white">Payout history</p>
                {detail.payouts.map((p: any) => (
                  <div key={p.id} className="flex justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">{formatWhen(p.date)} · <span className="font-mono text-slate-200">{p.reference}</span> · {String(p.method).toUpperCase()}</span>
                    <span className="font-black text-emerald-400">{formatKES(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADMIN: ACTIVITY FEED (everything that happens, live)
// ---------------------------------------------------------------------------
function AdminActivityPanel({ token, showToast, socket }: { token: string | null; showToast: ToastFn; socket: Socket | null }) {
  const [summary, setSummary] = useState<any>(null);
  const [feed, setFeed] = useState<any>({ events: [], total: 0, page: 1, pages: 1 });
  const [filters, setFilters] = useState({ category: 'all', severity: 'all', actorRole: 'all', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);

  const queryString = useCallback((extra: Record<string, string | number> = {}) => {
    const p = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v !== '' && v !== 'all') p.set(k, String(v)); });
    return p.toString();
  }, [filters]);

  const loadSummary = useCallback(async () => {
    try { setSummary(await staffApi('/admin/events/summary', token)); } catch (_) { /* optional */ }
  }, [token]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try { setFeed(await staffApi(`/admin/events?${queryString({ page, limit: 50 })}`, token)); }
    catch (err: any) { showToast(err.message, 'error'); } finally { setLoading(false); }
  }, [token, queryString, page]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { const t = setTimeout(loadFeed, 250); return () => clearTimeout(t); }, [loadFeed]);

  // Live updates pushed by the server as things happen
  useEffect(() => {
    if (!socket || !live) return;
    const onEvent = () => { loadSummary(); if (page === 1) loadFeed(); };
    socket.on('activityEvent', onEvent);
    return () => { socket.off('activityEvent', onEvent); };
  }, [socket, live, page, loadFeed, loadSummary]);

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/events/export/csv?${queryString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const setFilter = (k: string, v: string) => { setPage(1); setFilters(f => ({ ...f, [k]: v })); };
  const sevStyle: Record<string, string> = { info: 'bg-slate-800 text-slate-300', warn: 'bg-amber-950 text-amber-300 border border-amber-800', alert: 'bg-rose-950 text-rose-300 border border-rose-800' };
  const maxHour = summary ? Math.max(1, ...summary.byHour) : 1;

  return (
    <div className="space-y-6">
      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StaffStat label="Events (24h)" value={summary.last24h} tone="sky" />
            <StaffStat label="Security alerts" value={summary.alerts} tone={summary.alerts ? 'rose' : 'slate'} />
            <StaffStat label="Warnings" value={summary.warnings} tone="amber" />
            <StaffStat label="Failed logins (1h)" value={summary.failedLoginsLastHour} tone={summary.failedLoginsLastHour > 5 ? 'rose' : 'slate'} />
            <StaffStat label="Agent commission owed" value={formatKES(summary.pendingCommission)} tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-4 border border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Activity per hour — last 24 hours</p>
              <div className="flex items-end gap-1 h-24">
                {summary.byHour.map((n: number, i: number) => (
                  <div key={i} className="flex-1 rounded-t bg-emerald-500/80" style={{ height: `${Math.max(3, (n / maxHour) * 100)}%`, opacity: n ? 1 : 0.2 }} title={`${n} event(s)`} />
                ))}
              </div>
            </div>
            <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Most active (24h)</p>
              <div className="space-y-1.5">
                {summary.topActors.length === 0 && <p className="text-xs text-slate-500 font-bold">Nothing yet.</p>}
                {summary.topActors.map((a: any) => (
                  <button key={a.actorId} onClick={() => setFilter('q', a.name || '')} className="w-full flex justify-between text-xs p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
                    <span className="font-bold text-slate-200 truncate">{a.name} <span className="text-[9px] uppercase text-slate-500">{a.role}</span></span>
                    <span className="font-black text-emerald-400">{a.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-2 border-b border-slate-800 text-xs">
          <input value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Search who / what / order #…" className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white" />
          <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white cursor-pointer">
            <option value="all">All categories</option><option value="auth">Sign-ins & accounts</option><option value="orders">Orders & payments</option><option value="users">Users & roles</option><option value="agents">Agents & commission</option><option value="inventory">Inventory</option><option value="settings">Settings</option><option value="admin">Other admin</option>
          </select>
          <select value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white cursor-pointer">
            <option value="all">Any severity</option><option value="alert">Alerts</option><option value="warn">Warnings</option><option value="info">Info</option>
          </select>
          <select value={filters.actorRole} onChange={(e) => setFilter('actorRole', e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white cursor-pointer">
            <option value="all">Anyone</option><option value="admin">Admins</option><option value="support">Customer care</option><option value="agent">Agents</option><option value="customer">Customers</option><option value="user">Customers (legacy)</option><option value="anonymous">Not signed in</option>
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white" title="From" />
          <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white" title="To" />
        </div>
        <div className="px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800">
          <span className="font-bold text-slate-400">{feed.total.toLocaleString()} event(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setLive(l => !l)} className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer flex items-center gap-1.5 ${live ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} /> {live ? 'Live' : 'Paused'}
            </button>
            <button onClick={() => { loadFeed(); loadSummary(); }} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 cursor-pointer" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={exportCsv} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" /> Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">When</th><th className="p-3">Level</th><th className="p-3">Who</th><th className="p-3">What happened</th><th className="p-3">IP</th></tr></thead>
            <tbody className="divide-y divide-slate-800/60">
              {feed.events.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-bold">{loading ? 'Loading…' : 'No events match these filters.'}</td></tr>}
              {feed.events.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-800/40 align-top">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{formatWhen(e.createdAt)}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${sevStyle[e.severity] || sevStyle.info}`}>{e.severity}</span></td>
                  <td className="p-3"><p className="font-bold text-white">{e.actorName || 'System'}</p><p className="text-[9px] uppercase font-black text-slate-500">{e.actorRole || 'system'}</p></td>
                  <td className="p-3 text-slate-300 max-w-md"><span className="font-mono text-[10px] text-emerald-400">{e.action}</span><p className="mt-0.5">{e.summary}</p></td>
                  <td className="p-3 font-mono text-[10px] text-slate-500">{e.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 flex items-center justify-between border-t border-slate-800 text-xs">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Newer</button>
          <span className="text-slate-500 font-bold">Page {feed.page} of {feed.pages}</span>
          <button disabled={page >= feed.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 cursor-pointer">Older</button>
        </div>
      </div>
    </div>
  );
}




// ============================================================================
// HARDWARE STOREFRONT HELPERS
// ============================================================================
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
/** Price for a quantity: the server already applies offers & flash sale to `price`; bulk tiers can only lower it. */
const getUnitPrice = (p: any, qty: number) => {
  const base = Number(p?.price) || 0;
  const tiers: { minQty: number; price: number }[] = Array.isArray(p?.wholesaleTiers) ? p.wholesaleTiers : [];
  const tier = [...tiers].filter((t) => qty >= t.minQty && t.price > 0).sort((a, b) => b.minQty - a.minQty)[0];
  return tier && tier.price < base ? { price: tier.price, bulk: true, base } : { price: base, bulk: false, base };
};
const ORDER_TONE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/25', payment_failed: 'bg-red-500/10 text-red-400 border-red-500/25',
  processing: 'bg-sky-500/10 text-sky-400 border-sky-500/25', shipped: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/25'
};
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed'];
const statusLabel = (s: string) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const fmtDate = (d: any) => (d ? new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const GLOBAL_CSS = `
.ph-root{--border:#1e293b;--muted:#94a3b8;color:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.ph-card{background:var(--panel);border:1px solid var(--border);border-radius:1rem}
.ph-input{width:100%;background:color-mix(in srgb,var(--bg) 75%,transparent);border:1px solid var(--border);color:#f1f5f9;border-radius:.75rem;padding:.7rem .9rem;font-size:.875rem;outline:none;transition:border-color .15s,box-shadow .15s}
.ph-input::placeholder{color:#64748b}
.ph-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 25%,transparent)}
.ph-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;background:var(--primary);color:var(--on-primary);font-weight:700;font-size:.875rem;border-radius:.75rem;padding:.7rem 1.1rem;transition:filter .15s,transform .1s,opacity .15s;cursor:pointer}
.ph-btn:hover:not(:disabled){filter:brightness(1.1)}.ph-btn:active:not(:disabled){transform:scale(.98)}.ph-btn:disabled{opacity:.5;cursor:not-allowed}
.ph-btn-ghost{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid var(--border);color:#cbd5e1;font-weight:600;font-size:.875rem;border-radius:.75rem;padding:.65rem 1rem;transition:background .15s;cursor:pointer}
.ph-btn-ghost:hover:not(:disabled){background:rgba(255,255,255,.05)}.ph-btn-ghost:disabled{opacity:.5;cursor:not-allowed}
.ph-tint{background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);border:1px solid color-mix(in srgb,var(--primary) 35%,transparent)}
.ph-accent{color:var(--primary)}
.ph-skel{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.09),rgba(255,255,255,.04));background-size:200% 100%;animation:ph-shimmer 1.4s infinite}
@keyframes ph-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes ph-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes ph-slide{from{transform:translateX(100%)}to{transform:none}}
.ph-pop{animation:ph-pop .18s ease-out}.ph-slide{animation:ph-slide .22s ease-out}
.ph-root :focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.ph-hide-scroll::-webkit-scrollbar{display:none}.ph-hide-scroll{scrollbar-width:none}
@media (prefers-reduced-motion:reduce){.ph-pop,.ph-slide,.ph-skel{animation:none}}
`;

const Badge = ({ cls = '', children }: { cls?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>
);
const Modal = ({ open, onClose, title, icon, children, size = 'md', side = false }: { open: boolean; onClose: () => void; title?: string; icon?: React.ReactNode; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; side?: boolean }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl';
  return (
    <div className={`fixed inset-0 z-[70] flex ${side ? 'justify-end' : 'items-end sm:items-center justify-center p-0 sm:p-4'} bg-slate-950/70 backdrop-blur-sm`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`ph-card flex flex-col shadow-2xl ${side ? 'ph-slide h-full w-full max-w-md rounded-none border-y-0 border-r-0' : `ph-pop w-full ${width} max-h-[92vh] rounded-b-none sm:rounded-2xl`}`}>
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
  <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}</label>
);
const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="animate-spin" />;

type View = 'home' | 'orders' | 'profile' | 'admin' | 'agent' | 'support';
type AdminTab = 'dashboard' | 'products' | 'categories' | 'orders' | 'finances' | 'reports' | 'stock' | 'expenses' | 'campaigns' | 'reviews' | 'agents' | 'activity' | 'system' | 'users' | 'flash' | 'settings' | 'logs';
const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Overview', icon: <Activity size={16} /> }, { id: 'products', label: 'Products', icon: <Package size={16} /> },
  { id: 'categories', label: 'Categories', icon: <Tags size={16} /> }, { id: 'orders', label: 'Orders', icon: <ShoppingBag size={16} /> },
  { id: 'finances', label: 'Finances', icon: <TrendingUp size={16} /> }, { id: 'reports', label: 'Profit & Exports', icon: <FileSpreadsheet size={16} /> },
  { id: 'stock', label: 'Stock & Suppliers', icon: <Layers size={16} /> }, { id: 'expenses', label: 'Expenses', icon: <Wallet size={16} /> },
  { id: 'campaigns', label: 'SMS Campaigns', icon: <MessageSquare size={16} /> }, { id: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
  { id: 'agents', label: 'Agents & Staff', icon: <Briefcase size={16} /> }, { id: 'activity', label: 'Live Activity', icon: <Bell size={16} /> },
  { id: 'users', label: 'Customers', icon: <Users size={16} /> }, { id: 'flash', label: 'Flash Sale & Delivery', icon: <Flame size={16} /> },
  { id: 'settings', label: 'Store Settings', icon: <Settings size={16} /> }, { id: 'system', label: 'System', icon: <Shield size={16} /> },
  { id: 'logs', label: 'Audit Log', icon: <FileText size={16} /> }
];

export default function ProHardwareApp() {
  // ---------- data ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<any>({ storeName: 'ProHardware & Auto Spares', tagline: 'Your #1 Store for Vehicle Parts, Motorbikes & Tools', primaryColor: '#d97706', backgroundColor: '#020617', panelColor: '#0f172a', contactPhone: '', contactEmail: '' });
  const [hero, setHero] = useState<any>(null);
  const [carousel, setCarousel] = useState<any[]>([]);
  const [slide, setSlide] = useState(0);
  const [flash, setFlash] = useState<{ active: boolean; endTime: string | null }>({ active: false, endTime: null });
  const [now, setNow] = useState(Date.now());
  const [countyFees, setCountyFees] = useState<Record<string, number>>({});
  const [baseFee, setBaseFee] = useState(250);
  const [locations, setLocations] = useState<Record<string, string[]>>({});

  // ---------- session ----------
  const [user, setUser] = useState<UserAccount | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast: ToastFn = useCallback((message, type = 'info') => {
    const id = `${Date.now()}${Math.random()}`;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // ---------- auth ----------
  const [authOpen, setAuthOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ fullName: '', identifier: '', password: '', newPassword: '', resetCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [refInput, setRefInput] = useState('');
  const [refCheck, setRefCheck] = useState<{ state: 'idle' | 'valid' | 'invalid'; agentName?: string }>({ state: 'idle' });
  const [twoFactor, setTwoFactor] = useState<{ challengeId: string; message: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // ---------- shopping ----------
  const [cart, setCart] = useState<{ productId: number; quantity: number; product: Product }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quick, setQuick] = useState<Product | null>(null);
  const [qvQty, setQvQty] = useState(1);
  const [reviewFor, setReviewFor] = useState<Product | null>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('All');
  const [selSub, setSelSub] = useState('All');
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState<'new' | 'low' | 'high' | 'name'>('new');
  const [trackNo, setTrackNo] = useState('');
  const [trackRes, setTrackRes] = useState<any>(null);

  // ---------- checkout ----------
  const [ck, setCk] = useState<{ open: boolean; step: 'delivery' | 'waiting' | 'success' | 'failed'; orderId: number | null; receipt: string; reason: string; tracking: string }>({ open: false, step: 'delivery', orderId: null, receipt: '', reason: '', tracking: '' });
  const [delivery, setDelivery] = useState({ county: '', town: '', location: '', streetAddress: '' });
  const [mpesa, setMpesa] = useState('');
  const [ckBusy, setCkBusy] = useState(false);
  const [ckRef, setCkRef] = useState('');

  // ---------- admin ----------
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [adminNav, setAdminNav] = useState(false);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [finance, setFinance] = useState<FinancialAnalyticsResponse | null>(null);
  const [financeYear, setFinanceYear] = useState(new Date().getFullYear());
  const [financeLoading, setFinanceLoading] = useState(false);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [productModal, setProductModal] = useState<any>(null); // null | {} (new) | product (edit)
  const [productForm, setProductForm] = useState<any>({});
  const [productFile, setProductFile] = useState<File | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [catForm, setCatForm] = useState<any>({ name: '', description: '', icon: 'wrench', subCategories: '' });
  const [editCat, setEditCat] = useState<any>(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userEdit, setUserEdit] = useState<any>(null);
  const [flashForm, setFlashForm] = useState({ hours: '2' });
  const [feeForm, setFeeForm] = useState({ county: '', fee: '' });
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [settingsFile, setSettingsFile] = useState<File | null>(null);
  const [heroForm, setHeroForm] = useState<any>({});
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; message: string; action: () => void } | null>(null);
  const pollRef = useRef<any>(null);

  const primary = store.primaryColor || '#d97706';
  const themeVars = { '--primary': primary, '--on-primary': readableOn(primary), '--bg': store.backgroundColor || '#020617', '--panel': store.panelColor || '#0f172a', background: 'var(--bg)' } as React.CSSProperties;

  // ============================================================================
  // API LAYER
  // ============================================================================
  const clearSession = useCallback(() => {
    setToken(null); setUser(null); setMyOrders([]); setView('home');
    try { localStorage.removeItem('hwToken'); localStorage.removeItem('hwUser'); } catch (_) { /* ignore */ }
  }, []);
  const api = useCallback(async (path: string, opts: { method?: string; body?: any; form?: FormData } = {}) => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body: any;
    if (opts.form) body = opts.form; else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, { method: opts.method || 'GET', headers, body });
      const data = await res.json().catch(() => ({}));
      if ((res.status === 401 || (res.status === 403 && /token|expired|sign in/i.test(String(data?.error)))) && token) { clearSession(); showToast('Your session expired. Please sign in again.', 'warning'); }
      return { ok: res.ok, status: res.status, data };
    } catch { return { ok: false, status: 0, data: { error: 'Network error. Check your connection.' } }; }
  }, [token, clearSession, showToast]);
  const errOf = (r: { data: any }, fallback: string) => r.data?.error || r.data?.message || fallback;

  const loadPublic = useCallback(async () => {
    const get = async (p: string) => { try { const r = await fetch(`${API_BASE_URL}${p}`); return r.ok ? await r.json() : null; } catch { return null; } };
    const [prods, cats, st, hr, car, fl, fees, locs] = await Promise.all([get('/products/catalog'), get('/categories'), get('/settings'), get('/config/hero'), get('/config/carousel'), get('/config/flash-sale'), get('/config/counties'), get('/config/locations-full')]);
    if (Array.isArray(prods)) setProducts(prods);
    if (Array.isArray(cats)) setCategories(cats);
    if (st) setStore((s: any) => ({ ...s, ...st }));
    if (hr) setHero(hr);
    if (Array.isArray(car)) setCarousel(car);
    if (fl) setFlash({ active: !!fl.active, endTime: fl.endTime || null });
    if (fees && typeof fees === 'object') { const { transport_fee, ...rest } = fees as any; setCountyFees(rest); }
    if (locs && locs.hierarchy) setLocations(locs.hierarchy);
    setLoading(false);
  }, []);
  const loadOrders = useCallback(async () => { if (!token) return; const r = await api('/orders/my-orders'); if (r.ok && Array.isArray(r.data)) setMyOrders(r.data); }, [token, api]);
  const loadFinance = useCallback(async (year: number) => {
    setFinanceLoading(true);
    const r = await api(`/admin/analytics/finances?year=${year}`);
    if (r.ok) {
      const d = r.data; const raw: any[] = d.monthlyBreakdown || d.monthlySalesGrowth || [];
      const monthlyBreakdown: FinancialMonth[] = raw.map((m: any, i: number) => {
        const idx = typeof m.monthIndex === 'number' ? m.monthIndex : i; const revenue = Number(m.totalRevenue ?? m.totalReceivedSales ?? 0); const cost = Number(m.totalBuyingCost ?? 0);
        return { monthIndex: idx, monthName: m.monthName || m.month || MONTH_NAMES_SHORT[idx], year: Number(d.year ?? d.selectedYear ?? year), totalRevenue: revenue, totalBuyingCost: cost, netProfit: Number(m.netProfit ?? m.totalProfit ?? revenue - cost), totalKgSold: Number(m.totalKgSold ?? 0), orderCount: Number(m.orderCount ?? m.paidOrderCount ?? 0) };
      });
      const sm = d.summary || {};
      setFinance({ year: Number(d.year ?? d.selectedYear ?? year), availableYears: Array.isArray(d.availableYears) && d.availableYears.length ? d.availableYears : [year], monthlyBreakdown, summary: { totalMoneyReceived: Number(sm.totalMoneyReceived ?? 0), totalBuyingCosts: Number(sm.totalBuyingCosts ?? sm.totalBuyingCost ?? 0), totalNetProfit: Number(sm.totalNetProfit ?? 0), totalKgSold: Number(sm.totalKgSold ?? 0), totalOrdersCount: monthlyBreakdown.reduce((n, m) => n + m.orderCount, 0), totalPointsAwarded: Number(sm.totalPointsAwarded ?? 0) } });
    } else showToast(errOf(r, 'Could not load finances'), 'error');
    setFinanceLoading(false);
  }, [api, showToast]);
  const loadAdmin = useCallback(async (which?: AdminTab) => {
    if (user?.role !== 'admin') return;
    const t = which || tab;
    if (t === 'dashboard' || t === 'products') { const r = await api('/admin/products'); if (r.ok) setAdminProducts(r.data); }
    if (t === 'dashboard' || t === 'orders') { const r = await api('/admin/orders'); if (r.ok) setAdminOrders(r.data); }
    if (t === 'dashboard') { loadFinance(financeYear); const r = await api('/admin/stock/overview'); if (r.ok) setLowStock((r.data.products || []).filter((p: any) => p.status && p.status !== 'ok').slice(0, 8)); }
    if (t === 'users' || t === 'agents') { const r = await api('/admin/users'); if (r.ok) setAdminUsers(Array.isArray(r.data) ? r.data : r.data.users || []); }
    if (t === 'logs') { const r = await api('/admin/logs'); if (r.ok) setAdminLogs(r.data); }
    if (t === 'finances') loadFinance(financeYear);
    if (t === 'settings') { setSettingsForm({ ...store }); setSettingsFile(null); if (hero) setHeroForm({ ...hero }); }
  }, [user, tab, api, loadFinance, financeYear, store, hero]);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    try {
      const t = localStorage.getItem('hwToken'); const u = localStorage.getItem('hwUser');
      if (t && u) { setToken(t); setUser(JSON.parse(u)); }
      const c = localStorage.getItem('hwCart'); if (c) setCart(JSON.parse(c));
      const ref = new URLSearchParams(window.location.search).get('ref'); if (ref) { localStorage.setItem('hw_ref', ref); }
      const savedRef = localStorage.getItem('hw_ref'); if (savedRef) setRefInput(savedRef);
    } catch (_) { /* ignore */ }
    loadPublic();
    const t = setInterval(() => { fetch(`${API_BASE_URL}/config/flash-sale`).then((r) => r.json()).then((fl) => setFlash({ active: !!fl.active, endTime: fl.endTime || null })).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, [loadPublic]);
  useEffect(() => { try { localStorage.setItem('hwCart', JSON.stringify(cart)); } catch (_) { /* ignore */ } }, [cart]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (carousel.length < 2) return; const t = setInterval(() => setSlide((s) => (s + 1) % carousel.length), 5000); return () => clearInterval(t); }, [carousel.length]);
  useEffect(() => { if (token) loadOrders(); }, [token, loadOrders]);
  useEffect(() => { if (view === 'admin' && user?.role !== 'admin') setView(user ? 'home' : 'home'); if (view === 'agent' && user?.role !== 'agent') setView('home'); if (view === 'support' && user?.role !== 'support') setView('home'); }, [view, user]);
  useEffect(() => { if (view === 'admin') loadAdmin(); }, [view, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const code = refInput.trim(); if (!code) { setRefCheck({ state: 'idle' }); return; }
    const t = setTimeout(async () => { try { const r = await fetch(`${API_BASE_URL}/referral/validate?code=${encodeURIComponent(code)}`); const d = await r.json(); setRefCheck(d.valid ? { state: 'valid', agentName: d.agentName } : { state: 'invalid' }); } catch { setRefCheck({ state: 'idle' }); } }, 400);
    return () => clearTimeout(t);
  }, [refInput]);
  useEffect(() => {
    if (!ck.open || ck.step !== 'waiting' || !ck.orderId) return;
    pollRef.current = setInterval(async () => {
      const r = await api(`/payments/payhero/status/${ck.orderId}`);
      if (!r.ok) return;
      const st = r.data.paymentStatus || (r.data.paymentDetails?.isPaid ? 'PAID' : 'PENDING');
      if (st === 'PAID' || st === 'SUCCESS') { setCk((c) => ({ ...c, step: 'success', receipt: r.data.paymentDetails?.mpesaReceipt || 'CONFIRMED' })); setCart([]); loadOrders(); loadPublic(); clearInterval(pollRef.current); }
      else if (st === 'FAILED' || st === 'CANCELLED') { setCk((c) => ({ ...c, step: 'failed', reason: r.data.paymentDetails?.failureReason || 'The payment was declined or cancelled.' })); loadOrders(); clearInterval(pollRef.current); }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [ck.open, ck.step, ck.orderId, api, loadOrders, loadPublic]);

  // ============================================================================
  // DERIVED
  // ============================================================================
  const msLeft = flash.endTime ? Math.max(0, new Date(flash.endTime).getTime() - now) : 0;
  const flashLive = flash.active && msLeft > 0;
  const subCats = useMemo(() => categories.find((c) => c.name === selCat)?.subCategories || [], [categories, selCat]);
  const shown = useMemo(() => {
    let list = products.filter((p) => (selCat === 'All' || p.category === selCat) && (selSub === 'All' || p.subCategory === selSub) && (!offersOnly || p.onOffer));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name} ${p.category} ${p.subCategory} ${p.brand || ''}`.toLowerCase().includes(q));
    const s = [...list];
    if (sort === 'low') s.sort((a, b) => a.price - b.price); else if (sort === 'high') s.sort((a, b) => b.price - a.price); else if (sort === 'name') s.sort((a, b) => a.name.localeCompare(b.name));
    return s;
  }, [products, selCat, selSub, offersOnly, search, sort]);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + getUnitPrice(i.product, i.quantity).price * i.quantity, 0);
  const shipFee = delivery.county ? (getCountyFee(countyFees, delivery.county) ?? baseFee) : 0;
  const cartTotal = cartSubtotal + (cart.length ? shipFee : 0);
  const towns = delivery.county ? (locations[Object.keys(locations).find((k) => normPlaceName(k) === normPlaceName(delivery.county)) || ''] || []) : [];
  const role = user?.role;
  const isStaff = role === 'admin' || role === 'agent' || role === 'support';

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const buildIdentity = (raw: string) => (raw.trim().includes('@') ? { email: raw.trim() } : { phoneNumber: raw.trim() });
  const finishSignIn = (data: any) => {
    setToken(data.token); setUser(data.user); setTwoFactor(null); setAuthOpen(false); setOtpStep(false); setOtp('');
    try { localStorage.setItem('hwToken', data.token); localStorage.setItem('hwUser', JSON.stringify(data.user)); localStorage.removeItem('hw_ref'); } catch (_) { /* ignore */ }
    showToast(`Welcome, ${data.user.fullName}!`, 'success');
    setView(data.user.role === 'admin' ? 'admin' : data.user.role === 'agent' ? 'agent' : data.user.role === 'support' ? 'support' : 'home');
  };
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = form.identifier.trim();
    if (!id) return showToast('Enter your phone number or email.', 'error');
    if (id.includes('@') ? !/^\S+@\S+\.\S+$/.test(id) : !normalizeKenyanPhone(id)) return showToast('Enter a valid Kenyan phone number (e.g. 0712345678) or email.', 'error');
    if (!isLogin && !otpStep) {
      if (!form.fullName.trim()) return showToast('Enter your full name.', 'error');
      if (form.password.length < 8) return showToast('Password must be at least 8 characters.', 'error');
      if (!acceptedTerms) return showToast('Please accept the Terms and Conditions to create an account.', 'error');
    }
    if (isLogin && !form.password) return showToast('Enter your password.', 'error');
    if (!isLogin && otpStep && !/^\d{6}$/.test(otp.trim())) return showToast('Enter the 6-digit code.', 'error');
    setAuthBusy(true);
    try {
      let endpoint = '/user/login'; let payload: any = { ...buildIdentity(id), identifier: id, password: form.password };
      if (!isLogin) {
        if (otpStep) { endpoint = '/user/signup/verify-otp'; payload = { ...buildIdentity(id), otp: otp.trim(), referralCode: refInput || undefined }; }
        else { endpoint = '/user/signup'; payload = { ...buildIdentity(id), password: form.password, fullName: form.fullName, requireOtp: true, acceptedTerms: true, termsVersion: TERMS_VERSION_FALLBACK, referralCode: refInput || undefined }; }
      }
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.requiresOtp) { setOtpStep(true); showToast(data.message || 'Verification code sent by SMS.', 'success'); }
      else if (res.ok && data.requiresTwoFactor) { setTwoFactor({ challengeId: data.challengeId, message: data.message || 'Enter the 6-digit code we sent you.' }); }
      else if (res.ok && data.token) finishSignIn(data);
      else if (data?.requiresVerification) { setIsLogin(false); setOtpStep(true); showToast(data.error || 'Enter the code we sent to finish creating your account.', 'info'); }
      else showToast(data.error || 'Authentication failed', 'error');
    } catch { showToast('Could not reach the server.', 'error'); }
    setAuthBusy(false);
  };
  const resendOtp = async () => {
    const r = await fetch(`${API_BASE_URL}/user/signup/resend-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIdentity(form.identifier)) });
    const d = await r.json().catch(() => ({})); showToast(r.ok ? (d.message || 'A new code has been sent.') : (d.error || 'Could not resend code'), r.ok ? 'success' : 'error');
  };
  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthBusy(true);
    try {
      if (resetStep === 'request') {
        const r = await fetch(`${API_BASE_URL}/user/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIdentity(form.identifier)) });
        const d = await r.json().catch(() => ({})); if (r.ok) { showToast(d.message || 'Code sent by SMS.', 'success'); setResetStep('reset'); } else showToast(d.error || 'Could not send code', 'error');
      } else {
        if (form.newPassword.length < 8) { showToast('New password must be at least 8 characters.', 'error'); setAuthBusy(false); return; }
        const r = await fetch(`${API_BASE_URL}/user/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...buildIdentity(form.identifier), otp: form.resetCode, newPassword: form.newPassword }) });
        const d = await r.json().catch(() => ({})); if (r.ok) { showToast(d.message || 'Password updated. Please sign in.', 'success'); setForgot(false); setResetStep('request'); setIsLogin(true); } else showToast(d.error || 'Reset failed', 'error');
      }
    } catch { showToast('Could not reach the server.', 'error'); }
    setAuthBusy(false);
  };

  const addToCart = (p: Product, qty = 1) => {
    if (p.stock < 1) return showToast('This item is out of stock.', 'error');
    setCart((prev) => { const ex = prev.find((i) => i.productId === p.id); if (ex) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: Math.min(i.quantity + qty, p.stock), product: p } : i)); return [...prev, { productId: p.id, quantity: Math.min(qty, p.stock), product: p }]; });
    showToast(`Added ${p.name} to your cart.`, 'success');
  };
  const setQty = (id: number, q: number) => setCart((prev) => (q <= 0 ? prev.filter((i) => i.productId !== id) : prev.map((i) => (i.productId === id ? { ...i, quantity: Math.min(q, i.product.stock || q) } : i))));

  const openCheckout = () => {
    if (!token) { setCartOpen(false); setAuthOpen(true); return showToast('Please sign in to check out.', 'info'); }
    if (!cart.length) return;
    setMpesa(user?.phoneNumber ? `0${String(user.phoneNumber).replace(/^254/, '')}` : '');
    setCk({ open: true, step: 'delivery', orderId: null, receipt: '', reason: '', tracking: '' }); setCartOpen(false);
  };
  const placeOrder = async () => {
    const phone = normalizeKenyanPhone(mpesa);
    if (!delivery.county || !delivery.town.trim() || !delivery.streetAddress.trim()) return showToast('County, town and exact delivery address are required.', 'error');
    if (!phone) return showToast('Enter a valid M-Pesa number (e.g. 0712345678).', 'error');
    setCkBusy(true);
    const r = await api('/orders/create', { method: 'POST', body: { cartItems: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })), paymentMethod: 'mpesa_stk', mpesaPhoneNumber: phone, ...delivery, referralCode: refInput || undefined } });
    setCkBusy(false);
    if (!r.ok) return showToast(errOf(r, 'Could not place your order.'), 'error');
    setCk((c) => ({ ...c, step: r.data.stkPromptSent === false ? 'failed' : 'waiting', orderId: r.data.id, tracking: r.data.trackingNumber || '', reason: r.data.stkPromptSent === false ? (r.data.stkStatusMessage || 'We could not send the M-Pesa prompt.') : '' }));
  };
  const retryPayment = async (orderId: number, amount: number, phoneRaw?: string) => {
    const phone = normalizeKenyanPhone(phoneRaw || mpesa);
    if (!phone) return showToast('Enter a valid M-Pesa number.', 'error');
    setCkBusy(true);
    const r = await api('/payments/stkpush', { method: 'POST', body: { phoneNumber: phone, amount, orderId } });
    setCkBusy(false);
    if (!r.ok) return showToast(errOf(r, 'Could not send the M-Pesa prompt.'), 'error');
    setCk((c) => ({ ...c, open: true, step: 'waiting', orderId, reason: '' }));
  };
  const trackOrder = async () => {
    if (!trackNo.trim()) return;
    const r = await fetch(`${API_BASE_URL}/orders/track/${encodeURIComponent(trackNo.trim())}`); const d = await r.json().catch(() => ({}));
    setTrackRes(r.ok ? d : { error: d.error || 'Tracking number not found.' });
  };

  // ---------- admin handlers ----------
  const openProductModal = (p?: any) => {
    setProductFile(null);
    setProductForm(p ? { name: p.name, category: p.category, subCategory: p.subCategory, brand: p.brand || '', price: p.price, buyingPrice: p.buyingPrice ?? '', flashSalePrice: p.flashSalePrice ?? '', stock: p.stock, description: p.description || '', imageUrl: p.image || '', isAvailable: p.isAvailable !== false, isOffer: !!p.isOffer, offerDiscount: p.isOffer ? (p.offerType === 'percent' ? `${p.offerDiscount}%` : String(p.offerDiscount)) : '', offerDescription: p.offerDescription || '' }
      : { name: '', category: categories[0]?.name || '', subCategory: categories[0]?.subCategories?.[0] || '', brand: '', price: '', buyingPrice: '', flashSalePrice: '', stock: '10', description: '', imageUrl: '', isAvailable: true, isOffer: false, offerDiscount: '', offerDescription: '' });
    setProductModal(p || {});
  };
  const saveProduct = async () => {
    const f = productForm; const editing = productModal && productModal.id;
    if (!f.name?.trim() || !f.category || !f.subCategory || f.price === '' || (!editing && !f.imageUrl && !productFile)) return showToast('Name, category, sub-category, price and an image are required.', 'error');
    setSavingProduct(true);
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
    if (productFile) fd.append('image', productFile);
    const r = await api(editing ? `/admin/products/${productModal.id}` : '/admin/products', { method: editing ? 'PUT' : 'POST', form: fd });
    setSavingProduct(false);
    if (!r.ok) return showToast(errOf(r, 'Could not save the product'), 'error');
    showToast(editing ? 'Product updated.' : 'Product added.', 'success'); setProductModal(null); loadAdmin('products'); loadPublic();
  };
  const deleteProduct = (p: any) => setConfirmDlg({ title: 'Delete product?', message: `"${p.name}" will be removed permanently.`, action: async () => { const r = await api(`/admin/products/${p.id}`, { method: 'DELETE' }); showToast(r.ok ? 'Product deleted.' : errOf(r, 'Delete failed'), r.ok ? 'success' : 'error'); loadAdmin('products'); loadPublic(); } });
  const saveCategory = async () => {
    const body = { name: catForm.name, description: catForm.description, icon: catForm.icon, subCategories: catForm.subCategories };
    const r = await api('/admin/categories', { method: 'POST', body });
    if (!r.ok) return showToast(errOf(r, 'Could not add category'), 'error');
    showToast('Category added.', 'success'); setCatForm({ name: '', description: '', icon: 'wrench', subCategories: '' }); loadPublic();
  };
  const updateCategory = async () => {
    if (!editCat) return;
    const r = await api(`/admin/categories/${editCat.id}`, { method: 'PUT', body: { name: editCat.name, description: editCat.description, icon: editCat.icon, subCategories: String(editCat.subCategories || '').split(',') } });
    if (!r.ok) return showToast(errOf(r, 'Could not update category'), 'error');
    showToast('Category updated.', 'success'); setEditCat(null); loadPublic();
  };
  const deleteCategory = (c: any) => setConfirmDlg({ title: 'Delete category?', message: `"${c.name}" will be removed (only possible when no product uses it).`, action: async () => { const r = await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); showToast(r.ok ? 'Category deleted.' : errOf(r, 'Delete failed'), r.ok ? 'success' : 'error'); loadPublic(); } });
  const setOrderStatus = async (id: number, status: string) => {
    const r = await api(`/admin/orders/${id}/status`, { method: 'PUT', body: { status } });
    if (r.ok) { showToast(`Order #${id} marked ${statusLabel(status)}.`, 'success'); loadAdmin('orders'); setOrderDetail((d: any) => (d && d.id === id ? { ...d, ...r.data } : d)); } else showToast(errOf(r, 'Update failed'), 'error');
  };
  const setOrderPaid = async (o: any, isPaid: boolean) => {
    const receipt = isPaid ? window.prompt('M-Pesa receipt code (optional):') || undefined : undefined;
    const r = await api(`/admin/orders/${o.id}/payment-status`, { method: 'PUT', body: { isPaid, mpesaReceipt: receipt } });
    if (r.ok) { showToast(isPaid ? 'Marked as paid.' : 'Marked as unpaid.', 'success'); loadAdmin('orders'); setOrderDetail(null); } else showToast(errOf(r, 'Update failed'), 'error');
  };
  const addTrackingNote = async (o: any) => {
    const message = window.prompt('Tracking message for the customer:'); if (!message) return;
    const r = await api(`/admin/orders/${o.id}/tracking`, { method: 'POST', body: { message, location: 'Warehouse' } });
    if (r.ok) { showToast('Tracking note added.', 'success'); setOrderDetail(r.data); loadAdmin('orders'); } else showToast(errOf(r, 'Could not add note'), 'error');
  };
  const exportOrdersCsv = async () => {
    const res = await fetch(`${API_BASE_URL}/admin/orders/export/csv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return showToast('Export failed', 'error');
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const saveUserEdit = async () => {
    if (!userEdit) return;
    const r = await api(`/admin/users/${userEdit.id}`, { method: 'PUT', body: { fullName: userEdit.fullName, email: userEdit.email, phoneNumber: userEdit.phoneNumber } });
    if (r.ok) { showToast('Customer updated.', 'success'); setUserEdit(null); loadAdmin('users'); } else showToast(errOf(r, 'Update failed'), 'error');
  };
  const toggleSuspend = async (u: any) => { const r = await api(`/admin/users/${u.id}/suspend`, { method: 'PUT', body: { isSuspended: u.isActive !== false } }); if (r.ok) { showToast(r.data.message || 'Updated', 'success'); loadAdmin('users'); } else showToast(errOf(r, 'Update failed'), 'error'); };
  const deleteUser = (u: any) => setConfirmDlg({ title: 'Delete account?', message: `${u.fullName} will be removed permanently.`, action: async () => { const r = await api(`/admin/users/${u.id}`, { method: 'DELETE' }); showToast(r.ok ? 'Account deleted.' : errOf(r, 'Delete failed'), r.ok ? 'success' : 'error'); loadAdmin('users'); } });
  const startFlash = async () => { const r = await api('/admin/config/black-friday', { method: 'POST', body: { durationHours: Number(flashForm.hours) || 1 } }); showToast(r.ok ? 'Flash sale started.' : errOf(r, 'Could not start'), r.ok ? 'success' : 'error'); loadPublic(); };
  const stopFlash = async () => { const r = await api('/admin/config/black-friday', { method: 'DELETE' }); showToast(r.ok ? 'Flash sale stopped.' : errOf(r, 'Could not stop'), r.ok ? 'success' : 'error'); loadPublic(); };
  const saveFee = async () => { const r = await api('/admin/config/counties', { method: 'POST', body: { county: feeForm.county, fee: Number(feeForm.fee) } }); showToast(r.ok ? (r.data.message || 'Saved') : errOf(r, 'Could not save fee'), r.ok ? 'success' : 'error'); if (r.ok) loadPublic(); };
  const saveSettings = async () => {
    const fd = new FormData(); ['storeName', 'tagline', 'heroTitle', 'heroSubtitle', 'primaryColor', 'backgroundColor', 'panelColor', 'contactPhone', 'contactEmail'].forEach((k) => settingsForm[k] !== undefined && fd.append(k, settingsForm[k]));
    if (settingsFile) fd.append('backgroundImage', settingsFile); else if (settingsForm.backgroundImage !== undefined) fd.append('backgroundLink', settingsForm.backgroundImage);
    const r = await api('/settings', { method: 'PUT', form: fd });
    if (r.ok) { setStore((s: any) => ({ ...s, ...r.data })); showToast('Store settings saved.', 'success'); } else showToast(errOf(r, 'Could not save settings'), 'error');
    if (heroForm && Object.keys(heroForm).length) { const h = await api('/admin/config/hero', { method: 'POST', body: heroForm }); if (h.ok) setHero(h.data.hero || heroForm); }
  };
  const handleTwoFactorOk = (data: any) => finishSignIn(data);



  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const ProductCard = ({ p }: { p: Product }) => {
    const out = p.stock < 1; const low = !out && p.stock <= 5;
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    return (
      <article className="ph-card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-[var(--primary)]/50">
        <button onClick={() => { setQuick(p); setQvQty(1); }} className="relative block aspect-[4/3] overflow-hidden bg-slate-900" aria-label={`View ${p.name}`}>
          <img src={getImageUrl(p.image || p.imageUrl)} alt={p.name} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {p.offerLabel && <Badge cls="bg-red-600 text-white border-red-500"><Flame size={11} />{p.offerLabel}</Badge>}
            {out && <Badge cls="bg-slate-900/90 text-slate-300 border-slate-600">Out of stock</Badge>}
            {low && <Badge cls="bg-amber-500/90 text-slate-900 border-amber-400">Only {p.stock} left</Badge>}
          </div>
        </button>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{p.subCategory}</p>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-white">{p.name}</h3>
          {(p.ratingCount || 0) > 0 && <button onClick={() => setReviewFor(p)} className="flex items-center gap-1 text-xs text-amber-400"><Star size={12} className="fill-amber-400" />{p.ratingAvg} <span className="text-slate-500">({p.ratingCount})</span></button>}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div><p className="text-lg font-black text-white">{formatKES(p.price)}</p>{hasDiscount && <p className="text-xs text-slate-500 line-through">{formatKES(p.originalPrice || 0)}</p>}</div>
            {Array.isArray(p.wholesaleTiers) && p.wholesaleTiers.length > 0 && <Badge cls="ph-tint">Bulk deals</Badge>}
          </div>
          <button disabled={out} onClick={() => addToCart(p)} className="ph-btn mt-1 w-full"><ShoppingCart size={16} />{out ? 'Unavailable' : 'Add to cart'}</button>
        </div>
      </article>
    );
  };

  const AdminCard = ({ label, value, tone = 'text-white', sub }: { label: string; value: React.ReactNode; tone?: string; sub?: string }) => (
    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-1"><p className="text-[10px] font-extrabold text-slate-400 uppercase">{label}</p><p className={`text-2xl font-black ${tone}`}>{value}</p>{sub && <p className="text-[11px] text-slate-500">{sub}</p>}</div>
  );

  const filteredAdminOrders = adminOrders.filter((o) => {
    const pd = o.paymentDetails || {}; const paid = pd.isPaid === true;
    if (orderFilter === 'unpaid' && paid) return false; if (orderFilter === 'toship' && !(paid && o.status !== 'delivered' && o.status !== 'cancelled')) return false;
    if (orderFilter === 'delivered' && o.status !== 'delivered') return false; if (orderFilter === 'failed' && o.status !== 'payment_failed') return false;
    const q = orderSearch.trim().toLowerCase();
    return !q || `${o.id} ${o.trackingNumber || ''} ${o.userName || ''} ${o.userPhone || ''} ${o.county || ''} ${o.town || ''}`.toLowerCase().includes(q);
  });
  const filteredUsers = adminUsers.filter((u) => { const q = userSearch.trim().toLowerCase(); return !q || `${u.fullName} ${u.phoneNumber || ''} ${u.email || ''} ${u.id}`.toLowerCase().includes(q); });

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="ph-root min-h-screen" style={themeVars}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ---------- toasts ---------- */}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ph-pop pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur ${t.type === 'success' ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200' : t.type === 'error' ? 'border-red-500/40 bg-red-950/90 text-red-200' : t.type === 'warning' ? 'border-amber-500/40 bg-amber-950/90 text-amber-200' : 'border-slate-600 bg-slate-900/95 text-slate-200'}`}>
            {t.type === 'success' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : t.type === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <Bell size={16} className="mt-0.5 shrink-0" />}<span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-left" aria-label="Home">
            <span className="ph-tint grid h-10 w-10 place-items-center rounded-xl"><Wrench size={20} /></span>
            <span className="hidden sm:block"><span className="block text-sm font-black leading-tight text-white">{store.storeName}</span><span className="block text-[11px] text-slate-500">{store.tagline}</span></span>
          </button>
          {view === 'home' && (
            <div className="relative mx-auto hidden max-w-md flex-1 md:block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts, tools, brands…" className="ph-input pl-9" aria-label="Search products" /></div>
          )}
          <nav className="ml-auto flex items-center gap-2">
            {isStaff && <button onClick={() => setView(role === 'admin' ? 'admin' : role === 'agent' ? 'agent' : 'support')} className="ph-btn-ghost !px-3"><Shield size={16} /><span className="hidden sm:inline">{role === 'admin' ? 'Admin' : role === 'agent' ? 'My Agent Desk' : 'Customer Care'}</span></button>}
            {user && <button onClick={() => setView('orders')} className="ph-btn-ghost !px-3"><Package size={16} /><span className="hidden sm:inline">Orders</span></button>}
            <button onClick={() => setCartOpen(true)} className="ph-btn-ghost relative !px-3" aria-label="Open cart"><ShoppingCart size={18} />{cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1 text-[11px] font-black text-[var(--on-primary)]">{cartCount}</span>}</button>
            {user ? (
              <div className="flex items-center gap-1"><button onClick={() => setView('profile')} className="ph-btn-ghost !px-3"><UserIcon size={16} /><span className="hidden max-w-[7rem] truncate sm:inline">{user.fullName.split(' ')[0]}</span></button><button onClick={() => { clearSession(); showToast('Signed out.', 'info'); }} className="ph-btn-ghost !px-3" aria-label="Sign out"><LogOut size={16} /></button></div>
            ) : <button onClick={() => { setAuthOpen(true); setIsLogin(true); setForgot(false); }} className="ph-btn"><LogIn size={16} />Sign in</button>}
          </nav>
        </div>
        {view === 'home' && <div className="px-4 pb-3 md:hidden"><div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts, tools, brands…" className="ph-input pl-9" aria-label="Search products" /></div></div>}
      </header>

      {flashLive && (
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 px-4 py-2 text-center text-sm font-bold text-white"><Flame size={14} className="mr-1 inline" /> FLASH SALE LIVE — special prices end in <span className="tabular-nums">{formatCountdownMs(msLeft)}</span></div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* ====================== HOME ====================== */}
        {view === 'home' && (
          <div className="space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-[var(--border)]">
              {(carousel[slide]?.url || hero?.url) && <img src={getImageUrl(carousel.length ? carousel[slide]?.url : hero?.url)} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
              <div className="relative max-w-2xl space-y-4 p-6 sm:p-12">
                <Badge cls="ph-tint"><BadgeCheck size={12} />{hero?.badgeText || 'Genuine parts • Fast delivery'}</Badge>
                <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">{store.heroTitle || hero?.title}</h1>
                <p className="text-sm text-slate-300 sm:text-base">{store.heroSubtitle || hero?.subtitle}</p>
                <div className="flex flex-wrap gap-3"><a href="#catalog" className="ph-btn">{hero?.buttonText || 'Shop the catalogue'}<ArrowRight size={16} /></a><button onClick={() => { setOffersOnly(true); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }} className="ph-btn-ghost"><Flame size={16} />{hero?.secondaryButtonText || 'View deals'}</button></div>
              </div>
              {carousel.length > 1 && <div className="absolute bottom-3 right-4 flex gap-1.5">{carousel.map((_, i) => <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-[var(--primary)]' : 'w-2 bg-white/40'}`} />)}</div>}
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[{ i: <Truck size={18} />, t: 'Nationwide delivery', s: 'All 47 counties' }, { i: <ShieldCheck />, t: 'Genuine products', s: 'Trusted brands' }, { i: <Smartphone size={18} />, t: 'Pay with M-Pesa', s: 'Secure STK push' }, { i: <Award size={18} />, t: 'Earn rewards', s: 'Points on every order' }].map((x, i) => (
                <div key={i} className="ph-card flex items-center gap-3 p-4"><span className="ph-tint grid h-10 w-10 shrink-0 place-items-center rounded-xl">{x.i}</span><div><p className="text-sm font-bold text-white">{x.t}</p><p className="text-[11px] text-slate-500">{x.s}</p></div></div>
              ))}
            </section>

            <section id="catalog" className="scroll-mt-24 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 ph-hide-scroll">
                {[{ name: 'All', icon: 'all' }, ...categories].map((c) => (
                  <button key={c.name} onClick={() => { setSelCat(c.name); setSelSub('All'); }} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${selCat === c.name ? 'ph-tint' : 'border-[var(--border)] text-slate-400 hover:text-white'}`}>{c.name === 'All' ? <Layers size={16} /> : getIcon(c.icon || c.name, 16)}{c.name}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {subCats.length > 0 && <select value={selSub} onChange={(e) => setSelSub(e.target.value)} className="ph-input !w-auto" aria-label="Sub-category"><option value="All">All sub-categories</option>{subCats.map((s: string) => <option key={s}>{s}</option>)}</select>}
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="ph-input !w-auto" aria-label="Sort"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option></select>
                <button onClick={() => setOffersOnly((v) => !v)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold ${offersOnly ? 'ph-tint' : 'border-[var(--border)] text-slate-400'}`}><Flame size={14} />Deals only</button>
                <span className="ml-auto text-xs text-slate-500">{shown.length} item{shown.length === 1 ? '' : 's'}</span>
              </div>
              {loading ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="ph-skel h-72 rounded-2xl" />)}</div>
                : shown.length === 0 ? <div className="ph-card p-12 text-center text-slate-400"><Search className="mx-auto mb-3" />No products match your filters.<button onClick={() => { setSearch(''); setSelCat('All'); setSelSub('All'); setOffersOnly(false); }} className="ph-btn-ghost mx-auto mt-4">Clear filters</button></div>
                : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
            </section>

            <section className="ph-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <div className="flex-1"><h3 className="font-extrabold text-white">Track your order</h3><p className="text-xs text-slate-500">Enter the tracking number from your SMS or order page.</p></div>
              <div className="flex gap-2"><input value={trackNo} onChange={(e) => setTrackNo(e.target.value)} placeholder="TRK-XXXX-XXXXXX" className="ph-input sm:w-64" /><button onClick={trackOrder} className="ph-btn">Track</button></div>
              {trackRes && <div className="w-full text-sm sm:basis-full">{trackRes.error ? <p className="text-red-400">{trackRes.error}</p> : <div className="mt-2 space-y-2"><Badge cls={ORDER_TONE[trackRes.status] || ''}>{statusLabel(trackRes.status)}</Badge>{(trackRes.history || []).slice().reverse().map((h: any, i: number) => <p key={i} className="text-xs text-slate-400"><b className="text-slate-200">{h.status}</b> — {h.message} <span className="text-slate-600">{fmtDate(h.timestamp)}</span></p>)}</div>}</div>}
            </section>
          </div>
        )}

        {/* ====================== MY ORDERS ====================== */}
        {view === 'orders' && (
          <div className="mx-auto max-w-3xl space-y-4">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white"><Package className="ph-accent" />My orders</h2>
            {myOrders.length === 0 ? <div className="ph-card p-10 text-center text-slate-400">You have no orders yet.</div> : myOrders.map((o) => {
              const pd = extractPaymentInfo(o);
              return (
                <div key={o.id} className="ph-card space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-white">Order #{o.id}</p><p className="text-xs text-slate-500">{fmtDate(o.createdAt)} · {o.trackingNumber}</p></div><div className="flex gap-2"><Badge cls={ORDER_TONE[o.status] || ''}>{statusLabel(o.status)}</Badge><Badge cls={pd.isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : pd.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}>{pd.isPaid ? 'Paid' : pd.status === 'FAILED' ? 'Payment failed' : 'Awaiting payment'}</Badge></div></div>
                  <div className="space-y-1.5">{(o.items || []).map((it: any, i: number) => <div key={i} className="flex items-center gap-3 text-sm"><img src={getImageUrl(it.imageUrl)} alt="" className="h-10 w-10 rounded-lg object-cover" /><span className="flex-1 text-slate-300">{it.quantity} × {it.name}</span><span className="font-bold text-white">{formatKES((it.priceAtPurchase || 0) * it.quantity)}</span></div>)}</div>
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm"><span className="text-slate-500">Delivery {formatKES(o.transportFee)}{pd.receipt && <> · M-Pesa {pd.receipt}</>}</span><span className="text-lg font-black text-white">{formatKES(o.grandTotal)}</span></div>
                  {Array.isArray(o.trackingHistory) && o.trackingHistory.length > 0 && <details className="text-xs text-slate-400"><summary className="cursor-pointer font-bold text-slate-300">Tracking history</summary><ul className="mt-2 space-y-1 border-l border-slate-700 pl-3">{o.trackingHistory.slice().reverse().map((h: any, i: number) => <li key={i}><b className="text-slate-200">{h.status}</b> — {h.message} <span className="text-slate-600">{fmtDate(h.timestamp)}</span></li>)}</ul></details>}
                  {!pd.isPaid && o.status !== 'cancelled' && <button onClick={() => { setMpesa(String(o.paymentDetails?.mpesaNumber || '')); retryPayment(o.id, o.grandTotal, o.paymentDetails?.mpesaNumber); }} className="ph-btn w-full"><Smartphone size={16} />Pay with M-Pesa now</button>}
                </div>
              );
            })}
          </div>
        )}

        {/* ====================== PROFILE ====================== */}
        {view === 'profile' && user && (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="ph-card space-y-4 p-6">
              <div className="flex items-center gap-3"><span className="ph-tint grid h-14 w-14 place-items-center rounded-2xl text-xl font-black">{user.fullName[0]}</span><div><p className="text-lg font-black text-white">{user.fullName}</p><p className="text-xs text-slate-500">{user.phoneNumber} {user.email && !/local$/.test(user.email) ? `· ${user.email}` : ''}</p></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-500">Reward points</p><p className="text-2xl font-black ph-accent">{user.rewardPoints || 0}</p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-500">Orders</p><p className="text-2xl font-black text-white">{myOrders.length}</p></div></div>
              {user.referralCode && <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-500">Your agent referral code</p><button onClick={() => copyText(user.referralCode || '', showToast, 'Code copied')} className="mt-1 flex items-center gap-2 text-xl font-black ph-accent">{user.referralCode}<Copy size={14} /></button></div>}
              <button onClick={async () => { const r = await api('/user/suspend', { method: 'POST', body: {} }); if (r.ok) { showToast('Account deactivated.', 'info'); clearSession(); } else showToast(errOf(r, 'Could not deactivate'), 'error'); }} className="text-xs text-slate-600 underline hover:text-red-400">Deactivate my account</button>
            </div>
          </div>
        )}

        {/* ====================== AGENT / SUPPORT ====================== */}
        {view === 'agent' && user && <AgentDashboard token={token} user={user as any} showToast={showToast} onSessionExpired={() => clearSession()} />}
        {view === 'support' && user && <SupportDashboard token={token} user={user as any} showToast={showToast} onSessionExpired={() => clearSession()} />}

        {/* ====================== ADMIN ====================== */}
        {view === 'admin' && user?.role === 'admin' && (
          <div className="flex flex-col gap-6 lg:flex-row">
            <button onClick={() => setAdminNav((v) => !v)} className="ph-btn-ghost lg:hidden"><Menu size={16} />{ADMIN_TABS.find((t) => t.id === tab)?.label}<ChevronDown size={14} className="ml-auto" /></button>
            <aside className={`${adminNav ? 'block' : 'hidden'} w-full shrink-0 lg:block lg:w-60`}>
              <div className="ph-card sticky top-24 space-y-0.5 p-2">{ADMIN_TABS.map((t) => <button key={t.id} onClick={() => { setTab(t.id); setAdminNav(false); }} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${tab === t.id ? 'ph-tint' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{t.icon}{t.label}</button>)}</div>
            </aside>
            <section className="min-w-0 flex-1 space-y-5">
              {tab === 'dashboard' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-black text-white">Business overview</h2>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <AdminCard label="Revenue received" value={formatKES(finance?.summary.totalMoneyReceived || 0)} tone="text-emerald-400" />
                    <AdminCard label="Net profit" value={formatKES(finance?.summary.totalNetProfit || 0)} tone="text-teal-400" />
                    <AdminCard label="Items sold" value={finance?.summary.totalKgSold || 0} />
                    <AdminCard label="Reward points issued" value={finance?.summary.totalPointsAwarded || 0} tone="text-amber-400" />
                    <AdminCard label="Products" value={adminProducts.length} />
                    <AdminCard label="Orders" value={adminOrders.length} />
                    <AdminCard label="To ship" value={adminOrders.filter((o) => o.isPaid && o.status !== 'delivered' && o.status !== 'cancelled').length} tone="text-violet-400" />
                    <AdminCard label="Awaiting payment" value={adminOrders.filter((o) => !o.isPaid && o.status === 'pending').length} tone="text-amber-400" />
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><AlertTriangle size={15} className="text-amber-400" />Low & out-of-stock</h3>{lowStock.length === 0 ? <p className="text-xs text-slate-500">All stock levels are healthy.</p> : lowStock.map((p: any) => <div key={p.id} className="flex justify-between border-b border-slate-800 py-2 text-xs"><span className="text-slate-300">{p.name}</span><b className={p.stock === 0 ? 'text-red-400' : 'text-amber-400'}>{p.stock} left</b></div>)}</div>
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Clock size={15} className="text-sky-400" />Latest orders</h3>{adminOrders.slice(0, 6).map((o) => <button key={o.id} onClick={() => { setTab('orders'); setOrderDetail(o); }} className="flex w-full justify-between border-b border-slate-800 py-2 text-left text-xs"><span className="text-slate-300">#{o.id} · {o.userName}</span><b className="text-white">{formatKES(o.grandTotal)}</b></button>)}</div>
                  </div>
                </div>
              )}

              {tab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-white">Products ({adminProducts.length})</h2><button onClick={() => openProductModal()} className="ph-btn"><Plus size={16} />Add product</button></div>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Cost</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/60">{adminProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40"><td className="p-3"><div className="flex items-center gap-3"><img src={getImageUrl(p.image)} alt="" className="h-10 w-10 rounded-lg object-cover" /><div><p className="font-bold text-white">{p.name}</p><p className="text-[10px] text-slate-500">#{p.id}{p.brand ? ` · ${p.brand}` : ''}</p></div></div></td>
                        <td className="p-3 text-slate-400">{p.category}<br /><span className="text-[10px] text-slate-600">{p.subCategory}</span></td>
                        <td className="p-3"><b className="text-white">{formatKES(p.effectivePrice ?? p.price)}</b>{p.isOffer && <><br /><span className="text-[10px] text-red-400">{p.offerType === 'percent' ? `${p.offerDiscount}% off` : `KES ${p.offerDiscount} off`}</span></>}</td>
                        <td className="p-3 text-slate-400">{formatKES(p.buyingPrice || 0)}</td><td className={`p-3 font-bold ${p.stock <= 5 ? 'text-red-400' : 'text-slate-200'}`}>{p.stock}</td>
                        <td className="p-3">{p.isAvailable === false ? <Badge cls="bg-slate-500/10 text-slate-400 border-slate-500/25">Hidden</Badge> : <Badge cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/25">Live</Badge>}</td>
                        <td className="p-3 text-right"><button onClick={() => openProductModal(p)} className="p-2 text-slate-400 hover:text-white" aria-label="Edit"><Edit size={15} /></button><button onClick={() => deleteProduct(p)} className="p-2 text-slate-400 hover:text-red-400" aria-label="Delete"><Trash2 size={15} /></button></td></tr>))}</tbody></table></div>
                </div>
              )}

              {tab === 'categories' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-white">Categories & sub-categories</h2>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 grid gap-3 sm:grid-cols-2">
                    <input className={inputCls} placeholder="Category name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                    <select className={inputCls} value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}>{['wrench', 'car', 'bike', 'hammer', 'zap'].map((i) => <option key={i}>{i}</option>)}</select>
                    <input className={`${inputCls} sm:col-span-2`} placeholder="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                    <input className={`${inputCls} sm:col-span-2`} placeholder="Sub-categories, comma separated (e.g. Brakes, Filters)" value={catForm.subCategories} onChange={(e) => setCatForm({ ...catForm, subCategories: e.target.value })} />
                    <button onClick={saveCategory} className="ph-btn sm:col-span-2"><Plus size={16} />Add category</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">{categories.map((c) => (
                    <div key={c.id} className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-2">
                      {editCat?.id === c.id ? <>
                        <input className={inputCls} value={editCat.name} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} /><input className={inputCls} value={editCat.description} onChange={(e) => setEditCat({ ...editCat, description: e.target.value })} /><input className={inputCls} value={editCat.subCategories} onChange={(e) => setEditCat({ ...editCat, subCategories: e.target.value })} placeholder="Sub-categories, comma separated" />
                        <div className="flex gap-2"><button onClick={updateCategory} className="ph-btn !py-2">Save</button><button onClick={() => setEditCat(null)} className="ph-btn-ghost !py-2">Cancel</button></div></> : <>
                        <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-black text-white"><span className="ph-accent">{getIcon(c.icon || c.name, 16)}</span>{c.name}</p><div><button onClick={() => setEditCat({ ...c, subCategories: (c.subCategories || []).join(', ') })} className="p-1.5 text-slate-400 hover:text-white"><Edit size={14} /></button><button onClick={() => deleteCategory(c)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button></div></div>
                        <p className="text-xs text-slate-500">{c.description}</p><div className="flex flex-wrap gap-1.5">{(c.subCategories || []).map((s: string) => <Badge key={s} cls="bg-slate-800 text-slate-300 border-slate-700">{s}</Badge>)}</div></>}
                    </div>))}</div>
                </div>
              )}

              {tab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black text-white">Orders</h2><button onClick={exportOrdersCsv} className="ph-btn-ghost ml-auto"><Download size={15} />CSV</button></div>
                  <div className="flex flex-wrap gap-2"><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search order #, tracking, customer, county…" className={`${inputCls} sm:w-80`} />{[['all', 'All'], ['toship', 'To ship'], ['unpaid', 'Unpaid'], ['failed', 'Failed'], ['delivered', 'Delivered']].map(([id, l]) => <button key={id} onClick={() => setOrderFilter(id)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${orderFilter === id ? 'ph-tint' : 'border-slate-800 text-slate-400'}`}>{l}</button>)}</div>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/60">{filteredAdminOrders.map((o) => <tr key={o.id} onClick={() => setOrderDetail(o)} className="cursor-pointer hover:bg-slate-800/40"><td className="p-3 font-bold text-white">#{o.id}<br /><span className="text-[10px] font-normal text-slate-500">{o.trackingNumber}</span></td><td className="p-3 text-slate-300">{o.userName}<br /><span className="text-[10px] text-slate-500">{o.userPhone} · {o.county}</span></td><td className="p-3 font-bold text-white">{formatKES(o.grandTotal)}</td><td className="p-3"><Badge cls={o.isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}>{o.isPaid ? 'Paid' : 'Unpaid'}</Badge></td><td className="p-3"><Badge cls={ORDER_TONE[o.status] || ''}>{statusLabel(o.status)}</Badge></td><td className="p-3 text-slate-500">{fmtDate(o.createdAt)}</td></tr>)}</tbody></table>{filteredAdminOrders.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No orders match.</p>}</div>
                </div>
              )}

              {tab === 'finances' && (
                <div className="space-y-5">
                  {finance?.summary && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><AdminCard label="Total revenue received" value={formatKES(finance.summary.totalMoneyReceived)} tone="text-emerald-400" /><AdminCard label="Net profit" value={formatKES(finance.summary.totalNetProfit)} tone="text-teal-400" /><AdminCard label="Items sold" value={finance.summary.totalKgSold} /><AdminCard label="Loyalty points issued" value={`${finance.summary.totalPointsAwarded} pts`} tone="text-amber-400" /></div>}
                  <FinancialGrowthChart monthlyData={finance?.monthlyBreakdown || []} selectedYear={financeYear} availableYears={finance?.availableYears || [financeYear]} isLoading={financeLoading && !finance} onYearChange={(y) => { setFinanceYear(y); loadFinance(y); }} />
                  {finance?.monthlyBreakdown && <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-4">Month</th><th className="p-4">Orders</th><th className="p-4">Items</th><th className="p-4">Revenue</th><th className="p-4 text-right">Net profit</th></tr></thead><tbody className="divide-y divide-slate-800/60">{finance.monthlyBreakdown.map((m, i) => <tr key={i}><td className="p-4 font-bold text-white">{m.monthName}</td><td className="p-4 text-slate-300">{m.orderCount}</td><td className="p-4 text-slate-300">{m.totalKgSold}</td><td className="p-4 font-black text-emerald-400">{formatKES(m.totalRevenue)}</td><td className="p-4 text-right font-black text-teal-400">{formatKES(m.netProfit)}</td></tr>)}</tbody></table></div>}
                </div>
              )}

              {tab === 'reports' && <AdminReportsPanel token={token} showToast={showToast} />}
              {tab === 'stock' && <AdminStockPanel token={token} showToast={showToast} />}
              {tab === 'expenses' && <AdminExpensesPanel token={token} showToast={showToast} />}
              {tab === 'campaigns' && <AdminCampaignsPanel token={token} showToast={showToast} />}
              {tab === 'reviews' && <AdminReviewsPanel token={token} showToast={showToast} />}
              {tab === 'system' && <AdminSystemPanel token={token} showToast={showToast} />}
              {tab === 'agents' && <AdminAgentsPanel token={token} showToast={showToast} adminUsers={adminUsers} onUsersChanged={() => loadAdmin('users')} />}
              {tab === 'activity' && <AdminActivityPanel token={token} showToast={showToast} socket={null} />}

              {tab === 'users' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-black text-white">Customers ({adminUsers.length})</h2><input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name, phone, email…" className={`${inputCls} ml-auto sm:w-72`} /></div>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Role</th><th className="p-3">Points</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-800/60">{filteredUsers.map((u) => <tr key={u.id}><td className="p-3 font-bold text-white">{u.fullName}<br /><span className="text-[10px] font-normal text-slate-500">#{u.id} · joined {fmtDate(u.createdAt)}</span></td><td className="p-3 text-slate-400">{u.phoneNumber}<br />{u.email && !/local$/.test(u.email) ? u.email : ''}</td><td className="p-3"><Badge cls="bg-slate-800 text-slate-300 border-slate-700">{u.role === 'user' ? 'customer' : u.role}</Badge></td><td className="p-3 text-amber-400">{u.rewardPoints || 0}</td><td className="p-3">{u.isActive === false ? <Badge cls="bg-red-500/10 text-red-400 border-red-500/25">Suspended</Badge> : <Badge cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/25">Active</Badge>}</td>
                      <td className="p-3 text-right whitespace-nowrap">{u.role !== 'admin' && <><button onClick={() => setUserEdit({ ...u })} className="p-2 text-slate-400 hover:text-white" aria-label="Edit"><Edit size={14} /></button><button onClick={() => toggleSuspend(u)} className="p-2 text-slate-400 hover:text-amber-400" aria-label="Suspend or activate">{u.isActive === false ? <Unlock size={14} /> : <Ban size={14} />}</button><button onClick={() => deleteUser(u)} className="p-2 text-slate-400 hover:text-red-400" aria-label="Delete"><Trash2 size={14} /></button></>}</td></tr>)}</tbody></table></div>
                </div>
              )}

              {tab === 'flash' && (
                <div className="space-y-5">
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3"><h3 className="flex items-center gap-2 font-black text-white"><Flame className="text-red-400" size={18} />Flash sale</h3><p className="text-xs text-slate-500">While live, products that have a flash-sale price (set in the product editor) sell at that price.</p>
                    {flashLive ? <div className="flex flex-wrap items-center gap-3"><Badge cls="bg-red-500/10 text-red-400 border-red-500/25">LIVE · {formatCountdownMs(msLeft)} left</Badge><button onClick={stopFlash} className="ph-btn-ghost">Stop now</button></div> : <div className="flex flex-wrap items-end gap-3"><div><label className={labelCls}>Duration (hours)</label><input type="number" min="0.25" step="0.25" className={`${inputCls} w-32`} value={flashForm.hours} onChange={(e) => setFlashForm({ hours: e.target.value })} /></div><button onClick={startFlash} className="ph-btn"><Flame size={16} />Start flash sale</button></div>}</div>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-3"><h3 className="flex items-center gap-2 font-black text-white"><Truck className="ph-accent" size={18} />Delivery fee per county</h3>
                    <div className="flex flex-wrap items-end gap-3"><div><label className={labelCls}>County</label><select className={`${inputCls} w-52`} value={feeForm.county} onChange={(e) => setFeeForm({ county: e.target.value, fee: String(getCountyFee(countyFees, e.target.value) ?? '') })}><option value="">Select county</option>{Object.keys(countyFees).sort().map((c) => <option key={c}>{c}</option>)}</select></div><div><label className={labelCls}>Fee (KES)</label><input type="number" min="0" className={`${inputCls} w-32`} value={feeForm.fee} onChange={(e) => setFeeForm({ ...feeForm, fee: e.target.value })} /></div><button disabled={!feeForm.county || feeForm.fee === ''} onClick={saveFee} className="ph-btn">Save fee</button></div>
                    <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto text-xs sm:grid-cols-3">{Object.entries(countyFees).sort().map(([c, f]) => <button key={c} onClick={() => setFeeForm({ county: c, fee: String(f) })} className="flex justify-between rounded-lg bg-slate-950 px-3 py-2 text-slate-400 hover:text-white"><span>{c}</span><b className="text-slate-200">{f}</b></button>)}</div></div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-white">Store settings</h2>
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 grid gap-3 sm:grid-cols-2">
                    {([['storeName', 'Store name'], ['tagline', 'Tagline'], ['heroTitle', 'Hero title'], ['heroSubtitle', 'Hero subtitle'], ['contactPhone', 'Contact phone'], ['contactEmail', 'Contact email']] as [string, string][]).map(([k, l]) => <div key={k}><label className={labelCls}>{l}</label><input className={inputCls} value={settingsForm[k] || ''} onChange={(e) => setSettingsForm({ ...settingsForm, [k]: e.target.value })} /></div>)}
                    {([['primaryColor', 'Accent colour'], ['backgroundColor', 'Page background'], ['panelColor', 'Panel colour']] as [string, string][]).map(([k, l]) => <div key={k}><label className={labelCls}>{l}</label><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded-lg bg-transparent" value={settingsForm[k] || '#000000'} onChange={(e) => setSettingsForm({ ...settingsForm, [k]: e.target.value })} /><input className={inputCls} value={settingsForm[k] || ''} onChange={(e) => setSettingsForm({ ...settingsForm, [k]: e.target.value })} /></div></div>)}
                    <div className="sm:col-span-2"><label className={labelCls}>Hero background image (link or upload)</label><div className="flex gap-2"><input className={inputCls} placeholder="https://…" value={settingsForm.backgroundImage || ''} onChange={(e) => setSettingsForm({ ...settingsForm, backgroundImage: e.target.value })} /><input type="file" accept="image/*" onChange={(e) => setSettingsFile(e.target.files?.[0] || null)} className="text-xs text-slate-400" /></div></div>
                    <div><label className={labelCls}>Hero badge text</label><input className={inputCls} value={heroForm.badgeText || ''} onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })} /></div>
                    <div><label className={labelCls}>Hero button text</label><input className={inputCls} value={heroForm.buttonText || ''} onChange={(e) => setHeroForm({ ...heroForm, buttonText: e.target.value })} /></div>
                    <button onClick={saveSettings} className="ph-btn sm:col-span-2">Save settings</button>
                  </div>
                </div>
              )}

              {tab === 'logs' && (
                <div className="space-y-4"><h2 className="text-xl font-black text-white">Audit log</h2><div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase font-black"><tr><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Target</th></tr></thead><tbody className="divide-y divide-slate-800/60">{adminLogs.map((l: any) => <tr key={l.id}><td className="p-3 text-slate-500">{fmtDate(l.createdAt)}</td><td className="p-3 text-slate-300">{l.adminName || l.adminId}</td><td className="p-3 font-bold text-white">{String(l.action).replace(/_/g, ' ')}</td><td className="p-3 text-slate-400">{l.targetType} {l.targetId ? `#${l.targetId}` : ''}</td></tr>)}</tbody></table></div></div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-[var(--border)] px-4 py-8 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-300">{store.storeName}</p>
        <p className="mt-1">{store.contactPhone && <><Phone size={11} className="mr-1 inline" />{store.contactPhone}</>} {store.contactEmail && <><Mail size={11} className="ml-3 mr-1 inline" />{store.contactEmail}</>}</p>
        <button onClick={() => setTermsOpen(true)} className="mt-2 underline hover:text-white">Terms & Conditions</button>
      </footer>



      {/* ====================== MODALS ====================== */}
      {/* Quick view */}
      <Modal open={!!quick} onClose={() => setQuick(null)} title={quick?.name} icon={<Eye size={18} />} size="lg">
        {quick && (() => { const u = getUnitPrice(quick, qvQty); return (
          <div className="grid gap-5 overflow-y-auto p-5 sm:grid-cols-2">
            <img src={getImageUrl(quick.image || quick.imageUrl)} alt={quick.name} className="aspect-square w-full rounded-2xl object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2"><Badge cls="ph-tint">{quick.category}</Badge><Badge cls="bg-slate-800 text-slate-300 border-slate-700">{quick.subCategory}</Badge>{quick.offerLabel && <Badge cls="bg-red-600 text-white border-red-500">{quick.offerLabel}</Badge>}</div>
              <p className="text-sm text-slate-400">{quick.description}</p>
              {quick.offerDescription && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{quick.offerDescription}</p>}
              <div><span className="text-3xl font-black text-white">{formatKES(u.price)}</span>{(u.bulk || (quick.originalPrice && quick.originalPrice > quick.price)) && <span className="ml-2 text-sm text-slate-500 line-through">{formatKES(u.bulk ? quick.price : quick.originalPrice || 0)}</span>}{u.bulk && <Badge cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/25">Bulk price</Badge>}</div>
              {Array.isArray(quick.wholesaleTiers) && quick.wholesaleTiers.length > 0 && <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300"><p className="mb-1 font-bold text-white">Buy more, pay less</p>{quick.wholesaleTiers.map((t) => <p key={t.minQty}>{t.minQty}+ units: <b>{formatKES(t.price)}</b> each</p>)}</div>}
              <p className={`text-xs font-bold ${quick.stock < 1 ? 'text-red-400' : quick.stock <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>{quick.stock < 1 ? 'Out of stock' : quick.stock <= 5 ? `Only ${quick.stock} left` : 'In stock'}</p>
              <div className="flex items-center gap-3"><div className="flex items-center rounded-xl border border-[var(--border)]"><button className="p-3" onClick={() => setQvQty((q) => Math.max(1, q - 1))} aria-label="Less"><Minus size={14} /></button><span className="w-8 text-center text-sm font-bold">{qvQty}</span><button className="p-3" onClick={() => setQvQty((q) => Math.min(quick.stock || 1, q + 1))} aria-label="More"><Plus size={14} /></button></div><button disabled={quick.stock < 1} onClick={() => { addToCart(quick, qvQty); setQuick(null); }} className="ph-btn flex-1"><ShoppingCart size={16} />Add · {formatKES(u.price * qvQty)}</button></div>
              <button onClick={() => { setReviewFor(quick); }} className="flex items-center gap-1.5 text-xs font-bold text-amber-400"><Star size={13} />{(quick.ratingCount || 0) > 0 ? `${quick.ratingAvg} · ${quick.ratingCount} reviews` : 'Be the first to review'}</button>
            </div>
          </div>); })()}
      </Modal>
      {reviewFor && <ReviewsModal product={reviewFor as any} token={token} user={user as any} onClose={() => setReviewFor(null)} showToast={showToast} onChanged={loadPublic} />}

      {/* Cart */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title={`Your cart (${cartCount})`} icon={<ShoppingCart size={18} />} side>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {cart.length === 0 ? <div className="py-16 text-center text-slate-500"><ShoppingBag className="mx-auto mb-3" />Your cart is empty.</div> : cart.map((i) => { const u = getUnitPrice(i.product, i.quantity); return (
            <div key={i.productId} className="flex gap-3 rounded-xl bg-white/5 p-3"><img src={getImageUrl(i.product.image || i.product.imageUrl)} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-white">{i.product.name}</p><p className="text-xs text-slate-400">{formatKES(u.price)} each {u.bulk && <span className="text-emerald-400">· bulk price</span>}</p>
                <div className="mt-2 flex items-center justify-between"><div className="flex items-center rounded-lg border border-[var(--border)]"><button className="p-1.5" onClick={() => setQty(i.productId, i.quantity - 1)} aria-label="Less"><Minus size={13} /></button><span className="w-7 text-center text-xs font-bold">{i.quantity}</span><button className="p-1.5" onClick={() => setQty(i.productId, i.quantity + 1)} aria-label="More"><Plus size={13} /></button></div><b className="text-sm text-white">{formatKES(u.price * i.quantity)}</b></div></div>
              <button onClick={() => setQty(i.productId, 0)} className="self-start p-1 text-slate-500 hover:text-red-400" aria-label="Remove"><Trash2 size={15} /></button></div>); })}
        </div>
        {cart.length > 0 && <div className="space-y-3 border-t border-[var(--border)] p-4"><div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><b className="text-white">{formatKES(cartSubtotal)}</b></div><p className="text-[11px] text-slate-500">Delivery is calculated at checkout based on your county.</p><button onClick={openCheckout} className="ph-btn w-full">Checkout<ArrowRight size={16} /></button></div>}
      </Modal>

      {/* Checkout */}
      <Modal open={ck.open} onClose={() => ck.step !== 'waiting' && setCk((c) => ({ ...c, open: false }))} title={ck.step === 'delivery' ? 'Delivery & payment' : ck.step === 'waiting' ? 'Confirm on your phone' : ck.step === 'success' ? 'Payment received' : 'Payment not completed'} icon={<Truck size={18} />}>
        <div className="space-y-4 overflow-y-auto p-5">
          {ck.step === 'delivery' && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="County"><select className="ph-input" value={delivery.county} onChange={(e) => setDelivery({ ...delivery, county: e.target.value, town: '' })}><option value="">Select county</option>{Object.keys(countyFees).sort().map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Town / area">{towns.length ? <select className="ph-input" value={delivery.town} onChange={(e) => setDelivery({ ...delivery, town: e.target.value })}><option value="">Select</option>{towns.map((t) => <option key={t}>{t}</option>)}</select> : <input className="ph-input" value={delivery.town} onChange={(e) => setDelivery({ ...delivery, town: e.target.value })} placeholder="e.g. Westlands" />}</Field>
              <Field label="Location / estate (optional)"><input className="ph-input" value={delivery.location} onChange={(e) => setDelivery({ ...delivery, location: e.target.value })} /></Field>
              <Field label="Exact address"><input className="ph-input" value={delivery.streetAddress} onChange={(e) => setDelivery({ ...delivery, streetAddress: e.target.value })} placeholder="Street, building, landmark" /></Field>
            </div>
            <Field label="M-Pesa phone number" hint="You will receive a payment prompt on this number."><input className="ph-input" inputMode="tel" value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder="0712 345 678" /></Field>
            <div className="space-y-1.5 rounded-xl bg-white/5 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-400">Items ({cartCount})</span><span>{formatKES(cartSubtotal)}</span></div><div className="flex justify-between"><span className="text-slate-400">Delivery</span><span>{delivery.county ? formatKES(shipFee) : 'Select county'}</span></div><div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-black text-white"><span>Total</span><span>{formatKES(cartTotal)}</span></div><p className="text-[11px] text-slate-500">You will earn about {Number((cartSubtotal * 0.002).toFixed(2))} reward points.</p></div>
            {!user?.referralCode && <Field label="Agent referral code (optional)"><input className="ph-input uppercase" value={refInput} onChange={(e) => setRefInput(e.target.value.toUpperCase())} placeholder="PHXXXXX" />{refCheck.state === 'valid' && <span className="text-[11px] text-emerald-400">Referred by {refCheck.agentName}</span>}{refCheck.state === 'invalid' && <span className="text-[11px] text-red-400">Code not recognised</span>}</Field>}
            <button disabled={ckBusy} onClick={placeOrder} className="ph-btn w-full">{ckBusy ? <Spinner /> : <Smartphone size={16} />}Pay {formatKES(cartTotal)} with M-Pesa</button>
          </>}
          {ck.step === 'waiting' && <div className="space-y-4 py-6 text-center"><Spinner size={40} /><p className="font-bold text-white">Check your phone</p><p className="text-sm text-slate-400">Enter your M-Pesa PIN on the prompt we sent. This page updates automatically.</p><p className="text-xs text-slate-600">Order #{ck.orderId} · {ck.tracking}</p><button onClick={() => { setCk((c) => ({ ...c, open: false })); setView('orders'); }} className="ph-btn-ghost mx-auto">I'll check later</button></div>}
          {ck.step === 'success' && <div className="space-y-3 py-6 text-center"><CheckCircle size={52} className="mx-auto text-emerald-400" /><p className="text-xl font-black text-white">Thank you!</p><p className="text-sm text-slate-400">M-Pesa receipt <b className="text-white">{ck.receipt}</b></p><p className="text-xs text-slate-500">Tracking number: {ck.tracking}</p><button onClick={() => { setCk((c) => ({ ...c, open: false })); setView('orders'); }} className="ph-btn mx-auto">View my orders</button></div>}
          {ck.step === 'failed' && <div className="space-y-3 py-6 text-center"><XCircle size={52} className="mx-auto text-red-400" /><p className="font-bold text-white">{ck.reason || 'The payment was not completed.'}</p>{ck.orderId && <><Field label="M-Pesa number"><input className="ph-input" value={mpesa} onChange={(e) => setMpesa(e.target.value)} /></Field><button disabled={ckBusy} onClick={() => { const o = myOrders.find((x) => x.id === ck.orderId); retryPayment(ck.orderId!, o?.grandTotal || cartTotal); }} className="ph-btn w-full">{ckBusy ? <Spinner /> : <RefreshCw size={16} />}Try again</button></>}<button onClick={() => setCk((c) => ({ ...c, step: 'delivery' }))} className="ph-btn-ghost mx-auto">Back</button></div>}
        </div>
      </Modal>

      {/* Auth */}
      <Modal open={authOpen && !twoFactor} onClose={() => setAuthOpen(false)} title={forgot ? 'Reset password' : isLogin ? 'Welcome back' : otpStep ? 'Verify your phone' : 'Create account'} icon={<UserIcon size={18} />} size="sm">
        <form onSubmit={forgot ? submitForgot : submitAuth} className="space-y-4 overflow-y-auto p-5">
          {!forgot && !isLogin && !otpStep && <Field label="Full name"><input className="ph-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" /></Field>}
          <Field label="Phone number or email" hint={!isLogin && !forgot ? 'We will text a 6-digit verification code to your phone.' : undefined}><input className="ph-input" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} placeholder="0712 345 678" autoComplete="username" disabled={!isLogin && otpStep} /></Field>
          {forgot ? (resetStep === 'reset' && <><Field label="Code from SMS"><input className="ph-input" inputMode="numeric" maxLength={6} value={form.resetCode} onChange={(e) => setForm({ ...form, resetCode: e.target.value })} /></Field><Field label="New password"><input className="ph-input" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /><PasswordStrength value={form.newPassword} /></Field></>)
            : !isLogin && otpStep ? <><Field label="6-digit code"><input className="ph-input text-center text-xl tracking-[.5em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus /></Field><button type="button" onClick={resendOtp} className="text-xs font-bold ph-accent">Resend code</button></>
            : <>
              <Field label="Password"><div className="relative"><input className="ph-input pr-10" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={isLogin ? 'current-password' : 'new-password'} /><button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="Show password">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{!isLogin && <PasswordStrength value={form.password} />}</Field>
              {!isLogin && <><Field label="Agent referral code (optional)"><input className="ph-input uppercase" value={refInput} onChange={(e) => setRefInput(e.target.value.toUpperCase())} />{refCheck.state === 'valid' && <span className="text-[11px] text-emerald-400">Referred by {refCheck.agentName}</span>}{refCheck.state === 'invalid' && <span className="text-[11px] text-red-400">Code not recognised</span>}</Field>
                <label className="flex items-start gap-2 text-xs text-slate-400"><input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5" />I have read and accept the <button type="button" onClick={() => setTermsOpen(true)} className="font-bold underline">Terms & Conditions</button></label></>}
              {isLogin && <button type="button" onClick={() => { setForgot(true); setResetStep('request'); }} className="text-xs font-bold ph-accent">Forgot password?</button>}
            </>}
          <button disabled={authBusy} className="ph-btn w-full">{authBusy && <Spinner />}{forgot ? (resetStep === 'request' ? 'Send reset code' : 'Update password') : isLogin ? 'Sign in' : otpStep ? 'Verify & create account' : 'Send verification code'}</button>
          <p className="text-center text-xs text-slate-500">{forgot ? <button type="button" onClick={() => { setForgot(false); setIsLogin(true); }} className="font-bold ph-accent">Back to sign in</button> : isLogin ? <>New here? <button type="button" onClick={() => { setIsLogin(false); setOtpStep(false); }} className="font-bold ph-accent">Create an account</button></> : <>Already registered? <button type="button" onClick={() => { setIsLogin(true); setOtpStep(false); }} className="font-bold ph-accent">Sign in</button></>}</p>
        </form>
      </Modal>
      {twoFactor && <TwoFactorModal challenge={twoFactor} onSuccess={handleTwoFactorOk} onClose={() => setTwoFactor(null)} showToast={showToast} />}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} onAccept={() => { setAcceptedTerms(true); setTermsOpen(false); }} />}

      {/* Product editor */}
      <Modal open={!!productModal} onClose={() => setProductModal(null)} title={productModal?.id ? 'Edit product' : 'Add product'} icon={<Package size={18} />} size="lg">
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Product name"><input className="ph-input" value={productForm.name || ''} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></Field></div>
            <Field label="Category"><select className="ph-input" value={productForm.category || ''} onChange={(e) => setProductForm({ ...productForm, category: e.target.value, subCategory: categories.find((c) => c.name === e.target.value)?.subCategories?.[0] || '' })}>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Sub-category"><select className="ph-input" value={productForm.subCategory || ''} onChange={(e) => setProductForm({ ...productForm, subCategory: e.target.value })}>{(categories.find((c) => c.name === productForm.category)?.subCategories || []).map((s: string) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Selling price (KES)"><input type="number" min="0" className="ph-input" value={productForm.price ?? ''} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></Field>
            <Field label="Buying / cost price (KES)" hint="Used for profit reports and agent commission."><input type="number" min="0" className="ph-input" value={productForm.buyingPrice ?? ''} onChange={(e) => setProductForm({ ...productForm, buyingPrice: e.target.value })} /></Field>
            <Field label="Stock quantity"><input type="number" min="0" className="ph-input" value={productForm.stock ?? ''} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} /></Field>
            <Field label="Flash-sale price (optional)"><input type="number" min="0" className="ph-input" value={productForm.flashSalePrice ?? ''} onChange={(e) => setProductForm({ ...productForm, flashSalePrice: e.target.value })} /></Field>
            <Field label="Brand (optional)"><input className="ph-input" value={productForm.brand || ''} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} /></Field>
            <Field label="Image link"><input className="ph-input" placeholder="https://…" value={productForm.imageUrl || ''} onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="…or upload an image"><input type="file" accept="image/*" onChange={(e) => setProductFile(e.target.files?.[0] || null)} className="text-xs text-slate-400" /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><textarea rows={3} className="ph-input" value={productForm.description || ''} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></Field></div>
          </div>
          <div className="space-y-3 rounded-xl bg-white/5 p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-white"><input type="checkbox" checked={!!productForm.isOffer} onChange={(e) => setProductForm({ ...productForm, isOffer: e.target.checked })} /><Percent size={15} className="ph-accent" />This product is on offer</label>
            {productForm.isOffer && <div className="grid gap-3 sm:grid-cols-2"><Field label="Discount" hint='Type 10% for a percentage, or 500 for KES off.'><input className="ph-input" value={productForm.offerDiscount || ''} onChange={(e) => setProductForm({ ...productForm, offerDiscount: e.target.value })} /></Field><Field label="Offer note (optional)"><input className="ph-input" value={productForm.offerDescription || ''} onChange={(e) => setProductForm({ ...productForm, offerDescription: e.target.value })} /></Field></div>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={productForm.isAvailable !== false} onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })} />Visible in the shop</label>
          <p className="text-[11px] text-slate-500">Bulk (wholesale) prices are set under Stock & Suppliers → Bulk pricing.</p>
          <div className="flex justify-end gap-2"><button onClick={() => setProductModal(null)} className="ph-btn-ghost">Cancel</button><button disabled={savingProduct} onClick={saveProduct} className="ph-btn">{savingProduct && <Spinner />}Save product</button></div>
        </div>
      </Modal>

      {/* Order detail */}
      <Modal open={!!orderDetail} onClose={() => setOrderDetail(null)} title={`Order #${orderDetail?.id}`} icon={<ShoppingBag size={18} />} size="lg">
        {orderDetail && <div className="space-y-4 overflow-y-auto p-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-500">Customer</p><p className="font-bold text-white">{orderDetail.userName}</p><p className="text-xs text-slate-400">{orderDetail.userPhone} {orderDetail.userEmail && orderDetail.userEmail !== 'N/A' && !/local$/.test(orderDetail.userEmail) ? `· ${orderDetail.userEmail}` : ''}</p></div><div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-500">Delivery</p><p className="font-bold text-white">{formatShippingAddress(orderDetail.shippingAddress)}</p><p className="text-xs text-slate-400">{[orderDetail.town, orderDetail.county].filter(Boolean).join(', ')}</p></div></div>
          <div className="space-y-1.5">{(orderDetail.items || []).map((it: any, i: number) => <div key={i} className="flex justify-between"><span className="text-slate-300">{it.quantity} × {it.name}</span><b className="text-white">{formatKES((it.priceAtPurchase || 0) * it.quantity)}</b></div>)}<div className="flex justify-between border-t border-[var(--border)] pt-2 font-black text-white"><span>Total (incl. {formatKES(orderDetail.transportFee)} delivery)</span><span>{formatKES(orderDetail.grandTotal)}</span></div></div>
          <div className="flex flex-wrap items-center gap-2"><Badge cls={orderDetail.isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-amber-500/10 text-amber-400 border-amber-500/25'}>{orderDetail.isPaid ? `Paid${orderDetail.paymentDetails?.mpesaReceipt ? ` · ${orderDetail.paymentDetails.mpesaReceipt}` : ''}` : 'Unpaid'}</Badge>{orderDetail.paymentDetails?.failureReason && <span className="text-xs text-red-400">{orderDetail.paymentDetails.failureReason}</span>}</div>
          <div><label className={labelCls}>Order status</label><div className="flex flex-wrap gap-2">{ORDER_STATUSES.map((s) => <button key={s} onClick={() => setOrderStatus(orderDetail.id, s)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${orderDetail.status === s ? 'ph-tint' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{statusLabel(s)}</button>)}</div></div>
          <div className="flex flex-wrap gap-2"><button onClick={() => addTrackingNote(orderDetail)} className="ph-btn-ghost"><Truck size={15} />Add tracking note</button><button onClick={() => setOrderPaid(orderDetail, !orderDetail.isPaid)} className="ph-btn-ghost">{orderDetail.isPaid ? 'Mark unpaid' : 'Mark as paid (manual)'}</button></div>
          {Array.isArray(orderDetail.trackingHistory) && orderDetail.trackingHistory.length > 0 && <ul className="space-y-1 border-l border-slate-700 pl-3 text-xs text-slate-400">{orderDetail.trackingHistory.slice().reverse().map((h: any, i: number) => <li key={i}><b className="text-slate-200">{h.status}</b> — {h.message} <span className="text-slate-600">{fmtDate(h.timestamp)}</span></li>)}</ul>}
        </div>}
      </Modal>

      {/* Edit customer */}
      <Modal open={!!userEdit} onClose={() => setUserEdit(null)} title="Edit customer" icon={<UserIcon size={18} />} size="sm">
        {userEdit && <div className="space-y-3 p-5"><Field label="Full name"><input className="ph-input" value={userEdit.fullName || ''} onChange={(e) => setUserEdit({ ...userEdit, fullName: e.target.value })} /></Field><Field label="Phone"><input className="ph-input" value={userEdit.phoneNumber || ''} onChange={(e) => setUserEdit({ ...userEdit, phoneNumber: e.target.value })} /></Field><Field label="Email"><input className="ph-input" value={/local$/.test(userEdit.email || '') ? '' : userEdit.email || ''} onChange={(e) => setUserEdit({ ...userEdit, email: e.target.value })} /></Field><button onClick={saveUserEdit} className="ph-btn w-full">Save changes</button></div>}
      </Modal>

      {/* Confirm dialog */}
      <Modal open={!!confirmDlg} onClose={() => setConfirmDlg(null)} title={confirmDlg?.title} icon={<AlertTriangle size={18} />} size="sm">
        <div className="space-y-4 p-5"><p className="text-sm text-slate-300">{confirmDlg?.message}</p><div className="flex justify-end gap-2"><button onClick={() => setConfirmDlg(null)} className="ph-btn-ghost">Cancel</button><button onClick={() => { const a = confirmDlg?.action; setConfirmDlg(null); a && a(); }} className="ph-btn !bg-red-600 !text-white">Confirm</button></div></div>
      </Modal>
    </div>
  );
}
