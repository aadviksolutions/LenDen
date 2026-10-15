'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  BarChart2,
  FileText,
  Users,
  Package,
  BarChart3,
  Store,
  Building2,
  Truck,
  Briefcase,
  HelpCircle,
  X,
  Sparkles,
  Check,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'STARTER' | 'GROWTH' | 'SCALE' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleEnterDemo = async (plan: 'STARTER' | 'GROWTH' | 'SCALE') => {
    try {
      setDemoLoading(plan);
      setError(null);
      const res = await fetch('/api/demo/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to enter demo workspace');
      }
      window.location.href = data.redirectUrl || '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error launching demo workspace');
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || 'Invalid credentials. Please verify your email and password.'
        );
      }

      // If user is SUPER_ADMIN, redirect to /platform-admin unless redirect query was set
      if (data.user?.platformRole === 'SUPER_ADMIN' && redirectUrl === '/') {
        router.push('/platform-admin');
      } else {
        router.push(redirectUrl);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during login.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-slate-800 relative overflow-x-hidden selection:bg-[#00B887]/20 selection:text-[#071F38] flex flex-col justify-between">
      {/* ================= BACKGROUND DECORATIVE ELEMENTS ================= */}

      {/* Top-Right Restrained Abstract Curved Waves (Teal & Emerald ribbons) */}
      <div className="absolute top-0 right-0 w-[420px] sm:w-[500px] lg:w-[620px] h-[480px] sm:h-[580px] lg:h-[720px] pointer-events-none overflow-hidden z-0">
        <svg
          viewBox="0 0 500 700"
          className="w-full h-full object-cover"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Emerald Green Ribbon Wave (Innermost) */}
          <path
            d="M500 80 C 340 130, 240 280, 260 450 C 280 580, 380 660, 500 690 Z"
            fill="url(#emeraldRibbon)"
            opacity="0.9"
          />
          {/* Deep Teal Ribbon Wave (Middle) */}
          <path
            d="M500 160 C 370 210, 290 340, 310 490 C 330 600, 410 670, 500 700 Z"
            fill="url(#tealRibbon)"
            opacity="0.95"
          />
          {/* Deep Navy Curved Wave Accent (Edge) */}
          <path
            d="M500 250 C 420 290, 350 400, 370 530 C 390 620, 440 680, 500 710 Z"
            fill="url(#navyRibbon)"
            opacity="0.85"
          />

          <defs>
            <linearGradient id="emeraldRibbon" x1="260" y1="80" x2="500" y2="690" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00B887" />
              <stop offset="1" stopColor="#008F91" />
            </linearGradient>
            <linearGradient id="tealRibbon" x1="290" y1="160" x2="500" y2="700" gradientUnits="userSpaceOnUse">
              <stop stopColor="#008F91" />
              <stop offset="1" stopColor="#071F38" />
            </linearGradient>
            <linearGradient id="navyRibbon" x1="350" y1="250" x2="500" y2="710" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0D2C4D" />
              <stop offset="1" stopColor="#071F38" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top-Right Dot Matrix Pattern */}
      <div className="absolute top-6 right-6 sm:top-10 sm:right-12 w-28 h-28 pointer-events-none opacity-25 z-0 hidden sm:block">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="dot-grid" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#008F91" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      {/* Top-Right "Trusted by Indian Businesses" Badge */}
      <div className="absolute top-5 right-8 sm:top-8 sm:right-24 lg:right-32 z-10 pointer-events-none hidden md:block text-right">
        <div className="inline-block transform -rotate-3">
          <span className="font-serif italic text-xs sm:text-sm text-slate-700 font-medium tracking-wide">
            Trusted by
          </span>
          <br />
          <span className="font-serif italic font-bold text-sm sm:text-base text-[#00B887] tracking-wide">
            Indian Businesses
          </span>
          {/* Curved green flourish underline */}
          <svg className="w-28 h-2 text-[#00B887] mt-0.5 ml-auto" viewBox="0 0 100 8" fill="none">
            <path d="M2 6C30 1 70 1 98 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Floating Emerald Leaf Accent between left text and right card */}
      <div className="absolute top-[18%] right-[45%] lg:right-[43%] w-12 h-14 pointer-events-none hidden xl:block z-0 transform -rotate-12">
        <svg viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full filter drop-shadow-xs">
          <path
            d="M8 58 C 4 32, 24 8, 54 4 C 54 32, 38 52, 8 58 Z"
            fill="url(#floatingLeafGrad)"
          />
          <defs>
            <linearGradient id="floatingLeafGrad" x1="8" y1="58" x2="54" y2="4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00B887" />
              <stop offset="1" stopColor="#008F91" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom-Left Organic Botanical Leaves Motif */}
      <div className="absolute bottom-0 left-0 w-48 sm:w-60 lg:w-72 h-48 sm:h-60 lg:h-72 pointer-events-none z-0">
        <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Deep Forest Green Base Leaf */}
          <path
            d="M-20 280 C -10 170, 50 100, 150 85 C 130 150, 90 220, -20 280 Z"
            fill="#062F24"
            fillOpacity="0.9"
          />
          {/* Mid Layer Leaf */}
          <path
            d="M-30 280 C 15 190, 95 130, 200 120 C 155 185, 80 240, -30 280 Z"
            fill="#005A44"
            fillOpacity="0.95"
          />
          {/* Rich Emerald Main Leaf */}
          <path
            d="M-10 280 C 35 200, 120 160, 230 170 C 175 225, 95 255, -10 280 Z"
            fill="#00B887"
          />
          {/* Central Leaf Vein Accent */}
          <path
            d="M-10 280 C 50 230, 130 195, 230 170"
            stroke="#A7F3D0"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          {/* Foreground Petite Sprout Leaf */}
          <path
            d="M0 280 C 15 235, 60 205, 130 210 C 90 245, 45 268, 0 280 Z"
            fill="#008F91"
          />
          {/* Accent Leaf Blade */}
          <path
            d="M-25 210 C 10 160, 65 130, 120 140 C 75 180, 30 200, -25 210 Z"
            fill="#10B981"
            fillOpacity="0.95"
          />
        </svg>
      </div>

      {/* Mid-Background Soft Radial Glow Behind Form Card */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-[#00B887]/8 via-[#008F91]/5 to-transparent blur-3xl pointer-events-none z-0" />

      {/* ================= MAIN HERO TWO-COLUMN CONTAINER ================= */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 relative z-10 flex-1 flex flex-col justify-center">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* ================= LEFT SECTION (55% Width) ================= */}
          <div className="w-full lg:w-[55%] space-y-4 sm:space-y-5 lg:space-y-6">
            
            {/* 1. Lenden Horizontal Logo & Tagline */}
            <div className="space-y-1.5">
              <Link href="/" className="inline-flex items-center group">
                <img
                  src="/logo-horizontal.png"
                  alt="Lenden"
                  className="h-10 sm:h-11 lg:h-12 w-auto object-contain transition-transform group-hover:scale-[1.01]"
                />
              </Link>
              <p className="text-xs sm:text-[13px] font-medium text-slate-500 tracking-tight pl-0.5">
                Billing • Inventory • Customers • Growing Business
              </p>
            </div>

            {/* 2. Compact Outlined Pill: ALL-IN-ONE BUSINESS MANAGEMENT */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E6F7F0] border border-[#A7F3D0] text-[10px] sm:text-[11px] font-bold tracking-wider text-[#008F91] uppercase shadow-2xs">
                <BarChart2 className="w-3.5 h-3.5 text-[#00B887]" />
                <span>ALL-IN-ONE BUSINESS MANAGEMENT</span>
              </div>
            </div>

            {/* 3. Main Headline */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] xl:text-[64px] font-black tracking-tight leading-[1.06]">
                <span className="text-[#071F38] block">Har Hisab,</span>
                <span className="text-[#00B887] block">Ab Aasaan.</span>
              </h1>
            </div>

            {/* 4. Supporting Description */}
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-lg">
              Billing, inventory, customer ledgers and payments — designed for growing Indian businesses.
            </p>

            {/* 5. 2x2 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-xl pt-1">
              {/* Card 1: Simple Billing */}
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#E6F7F0] text-[#00B887] border border-[#A7F3D0]/60 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#00B887]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Simple Billing
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Create professional invoices in seconds.
                  </p>
                </div>
              </div>

              {/* Card 2: Udhaar & Payments */}
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]/60 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Udhaar & Payments
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Track outstanding balances and collections.
                  </p>
                </div>
              </div>

              {/* Card 3: Inventory Control */}
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]/60 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Inventory Control
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Manage stock, purchases and suppliers.
                  </p>
                </div>
              </div>

              {/* Card 4: Business Insights */}
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200 transition-all flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]/60 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-[#D97706]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#071F38]">
                    Business Insights
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    Understand sales, expenses and profit at a glance.
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Built for Growing Indian Businesses (Categories) */}
            <div className="pt-2 max-w-xl">
              {/* Divider with centered title */}
              <div className="relative flex items-center justify-center mb-3">
                <div className="w-full border-t border-slate-200/90" />
                <span className="absolute px-3 bg-[#F6F9FC] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  BUILT FOR GROWING INDIAN BUSINESSES
                </span>
              </div>

              {/* 4 Category Badges with Icons */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 mb-1.5">
                    <Store className="w-4 h-4 text-[#071F38]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                    Retail Stores
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 mb-1.5">
                    <Building2 className="w-4 h-4 text-[#071F38]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                    Wholesalers
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 mb-1.5">
                    <Truck className="w-4 h-4 text-[#071F38]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                    Distributors
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-700 mb-1.5">
                    <Briefcase className="w-4 h-4 text-[#071F38]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700">
                    Service Businesses
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ================= RIGHT SECTION (45% Width) ================= */}
          <div className="w-full lg:w-[45%] flex justify-center lg:justify-end">
            {/* White Floating Login Card */}
            <div className="w-full max-w-[460px] lg:max-w-[480px] bg-white rounded-3xl p-7 sm:p-9 lg:p-10 shadow-[0_20px_60px_-15px_rgba(7,31,56,0.08)] border border-slate-100 relative">
              
              {/* Top: Actual Lenden Horizontal Logo Centered */}
              <div className="flex justify-center mb-3">
                <img
                  src="/logo-horizontal.png"
                  alt="Lenden"
                  className="h-9 sm:h-10 w-auto object-contain"
                />
              </div>

              {/* Heading & Subtitle */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-[27px] font-black tracking-tight text-[#071F38]">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1 font-normal">
                  Sign in to continue to your Lenden workspace.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Email Address Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@yourbusiness.com"
                      className="block w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887] transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="block w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00B887]/30 focus:border-[#00B887] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#00B887] focus:ring-[#00B887] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-bold text-[#00B887] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Action Button: Sign In -> */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 text-xs sm:text-sm font-bold text-white bg-[#00B887] hover:bg-[#009E74] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#00B887] transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center my-4">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute px-3 bg-white text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
              </div>

              {/* Outlined Green Button: Register your business */}
              <Link
                href="/register"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-[#00B887] text-[#00B887] hover:bg-emerald-50/70 font-bold text-xs sm:text-sm transition-all text-center cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register your business</span>
              </Link>

              {/* Supporting Text */}
              <p className="text-[11px] sm:text-xs text-slate-400 text-center mt-2.5 leading-relaxed">
                New to Lenden? Start your free trial and manage your business with ease.
              </p>

              {/* Trust Indicators at Bottom of Card */}
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="w-4 h-4 text-[#00B887] mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-600 leading-tight">
                    Secure &<br />Encrypted
                  </span>
                </div>

                <div className="flex flex-col items-center border-x border-slate-100 px-1">
                  <Lock className="w-4 h-4 text-[#00B887] mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-600 leading-tight">
                    Your Data<br />Stays Private
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <Users className="w-4 h-4 text-[#00B887] mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-600 leading-tight">
                    Built for<br />Indian Businesses
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ================= EXPLORE DEMO WORKSPACES SECTION ================= */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 border-t border-slate-200/90 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/90 text-[10px] sm:text-[11px] font-bold text-[#00B887] uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00B887]" />
              <span>INSTANT EVALUATION • NO REGISTRATION REQUIRED</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#071F38] tracking-tight">
              Explore Lenden Live Demo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              Test each plan separately in its own isolated demo workspace pre-populated with realistic
              sample data. Zero payment, zero risk.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#008F91] hover:text-[#00B887] transition-colors self-start md:self-auto bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs"
          >
            <span>View Full Pricing & Plans</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card A: Explore Starter */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-slate-300 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Starter Plan
                </span>
                <span className="text-xs text-slate-400 font-semibold">1 User • 1 Location</span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-[#071F38]">₹199</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>

              <p className="text-xs text-slate-500 mt-2 min-h-[36px] leading-relaxed">
                Single-counter billing, customer ledger & udhaar tracking for solo shop owners.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Unlimited Invoices & GST Bills</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Customer Ledger & Udhaar Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Payment Recording & Receipts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Basic Stock & Expense Tracking</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => handleEnterDemo('STARTER')}
                disabled={demoLoading !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#071F38] hover:bg-[#0D2C4D] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {demoLoading === 'STARTER' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Try Starter Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card B: Explore Growth (Recommended) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#00B887] shadow-lg shadow-emerald-500/10 flex flex-col justify-between transition-all relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B887] text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs">
              Recommended
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Growth Plan
                </span>
                <span className="text-xs text-slate-500 font-semibold">3 Users • 1 Location</span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-[#071F38]">₹499</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>

              <p className="text-xs text-slate-500 mt-2 min-h-[36px] leading-relaxed">
                Multi-user commercial suite with purchases, supplier khata, and low-stock alerts.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Everything in Starter, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Purchase Invoices & Suppliers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Low-Stock Alerts & Stock History</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Staff Roles & Permissions (3 Users)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => handleEnterDemo('GROWTH')}
                disabled={demoLoading !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#00B887] hover:bg-[#009E74] text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {demoLoading === 'GROWTH' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Try Growth Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card C: Explore Scale */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:border-slate-300 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Scale Plan
                </span>
                <span className="text-xs text-slate-400 font-semibold">10 Users • 3 Branches</span>
              </div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-[#071F38]">₹999</span>
                <span className="text-xs text-slate-500 font-semibold">/ month</span>
              </div>

              <p className="text-xs text-slate-500 mt-2 min-h-[36px] leading-relaxed">
                Multi-branch chain operations with consolidated reporting & granular staff roles.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-purple-700 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Everything in Growth, plus:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Multi-Location Management (3 Branches)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Consolidated Branch Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#00B887] shrink-0" />
                  <span>Granular Roles & Audit Trail</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => handleEnterDemo('SCALE')}
                disabled={demoLoading !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#071F38] hover:bg-[#0D2C4D] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {demoLoading === 'SCALE' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Try Scale Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#00B887]" />
                <h3 className="font-bold text-sm text-[#071F38]">Password Assistance</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <p>
                To maintain tenant isolation and security, password resets are handled directly by your business workspace administrator.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-semibold text-slate-800">Are you a Business Owner?</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Contact Lenden technical support at{' '}
                  <span className="font-mono font-medium text-[#071F38]">admin@lenden.local</span> for account recovery.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-[#071F38] text-white rounded-xl text-xs font-semibold hover:bg-[#0D2C4D] transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F6F9FC]" />}>
      <LoginForm />
    </Suspense>
  );
}
