import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor, User, LogOut } from 'lucide-react';
import TraceLogo from './TraceLogo';
import { useTheme } from '../context/ThemeContext';
import { useObservation } from '../context/ObservationContext';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Navigation array
  const navItems = [
    { to: '/', match: '/', label: 'Home' },
    { to: '/dashboard', match: '/dashboard', label: 'Dashboard' },
    { to: '/activity', match: '/activity', label: 'Activity' },
    { to: '/workflows', match: '/workflows', label: 'Workflows' },
    { to: '/automations', match: '/automations', label: 'Automations' },
    { to: '/executions', match: '/executions', label: 'Executions' },
    { to: '/insights', match: '/insights', label: 'Insights' },
    { to: '/settings', match: '/settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden relative">
      
      {/* Top Navigation */}
      <header className="w-full max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between z-50">
        <div className="flex items-center">
          <TraceLogo className="text-3xl text-text-primary" />
        </div>
        
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isCurrentActive = location.pathname === item.match;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  isCurrentActive
                    ? 'bg-[#FFF1F2] text-[#0F172A]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-5">
          {/* Theme Toggle */}
          <div className="relative">
            <button 
              className="text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center"
              onClick={() => { setShowThemeMenu(!showThemeMenu); setShowProfile(false); }}
              title="Theme"
            >
              {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {showThemeMenu && (
              <div className="absolute top-full right-0 mt-3 w-32 solid-card py-1 z-50 animate-in slide-in-from-top-2">
                <button onClick={() => { setTheme('light'); setShowThemeMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-surface-secondary flex items-center gap-3 text-text-secondary hover:text-text-primary">
                  <Sun className="w-3.5 h-3.5" /> Light
                </button>
                <button onClick={() => { setTheme('dark'); setShowThemeMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-surface-secondary flex items-center gap-3 text-text-secondary hover:text-text-primary">
                  <Moon className="w-3.5 h-3.5" /> Dark
                </button>
                <button onClick={() => { setTheme('system'); setShowThemeMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-surface-secondary flex items-center gap-3 text-text-secondary hover:text-text-primary">
                  <Monitor className="w-3.5 h-3.5" /> System
                </button>
              </div>
            )}
          </div>

          <button className="relative text-text-secondary hover:text-text-primary transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span className="absolute 0 right-0 w-2 h-2 bg-error rounded-full border border-surface"></span>
          </button>

          {/* Profile */}
          <div className="relative">
            <button 
              className="w-8 h-8 rounded-full bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center text-xs font-bold transition-colors"
              onClick={() => { setShowProfile(!showProfile); setShowThemeMenu(false); }}
            >
              R
            </button>
            
            {showProfile && (
              <div className="absolute top-full right-0 mt-3 w-48 solid-card py-1 z-50 animate-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-border mb-1 bg-surface-secondary rounded-t-lg">
                  <p className="text-sm font-bold text-text-primary">Rudra</p>
                  <p className="text-[10px] font-medium text-text-secondary">rudra@trace.ai</p>
                </div>
                <button onClick={() => { navigate('/settings'); setShowProfile(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-secondary flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Profile
                </button>
                <div className="h-px bg-border my-1"></div>
                <button onClick={() => { alert('In demo mode, you cannot sign out.'); setShowProfile(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-error hover:bg-error/10 flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative z-10 flex flex-col items-center pt-4 pb-12">
        <div 
          key={location.pathname} 
          className={`w-full animate-fade-in-subtle px-8 max-w-[1400px]`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
