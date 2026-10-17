'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DemoBanner } from './DemoBanner';
import { ActionModalProvider, useActionModal } from '@/context/ActionModalContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

import { MobileBottomNavigation } from './MobileBottomNavigation';

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const { openAction } = useActionModal();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.endsWith('/print') ||
    pathname.startsWith('/view/invoice/');

  if (isAuthPage) {
    return <main className="min-h-screen bg-slate-50 text-slate-900">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col font-sans text-slate-900 selection:bg-slate-200">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isCollapsed={desktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed((prev) => !prev)}
      />

      {/* Main Content Area with dynamic left padding for sidebar */}
      <div
        className={`flex-1 flex flex-col transition-[padding] duration-200 ease-in-out ${
          desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Demo Mode Top Banner */}
        <DemoBanner />

        {/* Top Header */}
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenQuickActionModal={(type) => openAction(type)}
          isSidebarCollapsed={desktopCollapsed}
          onToggleSidebarCollapse={() => setDesktopCollapsed((prev) => !prev)}
        />

        {/* Dynamic Page Container with bottom padding for mobile navigation bar */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 pb-24 sm:pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile-First Sticky Bottom Navigation Bar */}
        <MobileBottomNavigation onOpenMobileMenu={() => setMobileSidebarOpen(true)} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionModalProvider>
        <ToastProvider>
          <React.Suspense
            fallback={
              <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <AppShellInner>{children}</AppShellInner>
          </React.Suspense>
        </ToastProvider>
      </ActionModalProvider>
    </AuthProvider>
  );
}
