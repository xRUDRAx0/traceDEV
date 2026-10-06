import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Eye, Lock, Zap, Bot, Bell, Monitor, Sun, Moon } from 'lucide-react';
import { useObservation } from '../context/ObservationContext';
import { useTheme } from '../context/ThemeContext';
import TraceLogo from '../components/TraceLogo';

export default function Settings() {
  const { isActive, toggleObservation, isLoading } = useObservation();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('Appearance');

  const tabs = ['Appearance', 'Observation', 'Privacy', 'Automation Safety', 'AI & Logic', 'Notifications'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Settings</h1>
          <p className="text-sm text-text-secondary">Manage observation preferences, privacy, automation safety, and appearance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-2">
          {tabs.map((tab, i) => (
            <button 
              key={i} 
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-5 py-3 rounded-lg text-xs font-semibold tracking-wide transition-colors ${activeTab === tab ? 'bg-[#0F172A] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-6">
          
          {/* Appearance Settings */}
          {activeTab === 'Appearance' && (
            <section className="solid-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-[#0F172A]" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Appearance Settings</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Theme Preference</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center justify-center p-6 rounded border transition-all ${theme === 'light' ? 'border-text-primary ring-1 ring-text-primary bg-surface-secondary' : 'border-border bg-surface hover:bg-surface-secondary'}`}
                    >
                      <Sun className={`w-8 h-8 mb-4 ${theme === 'light' ? 'text-text-primary' : 'text-text-secondary'}`} />
                      <span className={`text-xs font-bold ${theme === 'light' ? 'text-text-primary' : 'text-text-secondary'}`}>Light Mode</span>
                    </button>

                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center justify-center p-6 rounded border transition-all ${theme === 'dark' ? 'border-text-primary ring-1 ring-text-primary bg-surface-secondary' : 'border-border bg-surface hover:bg-surface-secondary'}`}
                    >
                      <Moon className={`w-8 h-8 mb-4 ${theme === 'dark' ? 'text-text-primary' : 'text-text-secondary'}`} />
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-text-primary' : 'text-text-secondary'}`}>Dark Mode</span>
                    </button>

                    <button 
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center justify-center p-6 rounded border transition-all ${theme === 'system' ? 'border-text-primary ring-1 ring-text-primary bg-surface-secondary' : 'border-border bg-surface hover:bg-surface-secondary'}`}
                    >
                      <Monitor className={`w-8 h-8 mb-4 ${theme === 'system' ? 'text-text-primary' : 'text-text-secondary'}`} />
                      <span className={`text-xs font-bold ${theme === 'system' ? 'text-text-primary' : 'text-text-secondary'}`}>System</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-text-secondary mt-6">System mode will automatically switch between Light and Dark themes based on your OS preference.</p>
                </div>
              </div>
            </section>
          )}

          {/* Observation Settings */}
          {activeTab === 'Observation' && (
            <section className="solid-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <Eye className="w-5 h-5 text-text-primary" />
                <h2 className="text-xl font-bold text-text-primary">Observation Settings</h2>
              </div>
              
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-2">Global Observation Status</h3>
                    <p className="text-sm text-text-secondary max-w-sm">When active, TRACE securely observes and logs your approved desktop activities to find automation opportunities.</p>
                  </div>
                  <button 
                    onClick={toggleObservation} 
                    disabled={isLoading}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-success' : 'bg-text-muted'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="pt-8 border-t border-border">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-6">Recording Preferences</h3>
                  <div className="space-y-4">
                    {['Capture UI screenshots during observation', 'Log keystrokes (Filtered for privacy)', 'Track application focus time'].map((pref, i) => (
                      <label key={i} className="flex items-center gap-4 cursor-pointer">
                        <input type="checkbox" defaultChecked={i === 0 || i === 2} className="w-4 h-4 rounded bg-background border-border text-text-primary focus:ring-text-primary/50" />
                        <span className="text-sm font-bold text-text-primary">{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Privacy */}
          {activeTab === 'Privacy' && (
            <section className="solid-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <Shield className="w-5 h-5 text-text-primary" />
                <h2 className="text-xl font-bold text-text-primary">Privacy & Security</h2>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Approved Applications</h3>
                  <p className="text-sm text-text-secondary mb-6">TRACE will ONLY observe activity within these checked applications.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Google Chrome', 'Microsoft Excel', 'Slack', 'Terminal', 'Visual Studio Code', 'Figma'].map((app, i) => (
                      <label key={i} className="flex items-center gap-4 cursor-pointer p-4 rounded bg-surface-secondary border border-border transition-colors">
                        <input type="checkbox" defaultChecked={i < 3} className="w-4 h-4 rounded bg-background border-border text-text-primary" />
                        <span className="text-sm font-bold text-text-primary">{app}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-2">Sensitive Data Redaction</h3>
                    <p className="text-sm text-text-secondary">Automatically blur passwords, credit cards, and PII from recordings.</p>
                  </div>
                  <button className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-success focus:outline-none`}>
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white translate-x-7 transition-transform`} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Automation Safety */}
          {activeTab === 'Automation Safety' && (
            <section className="solid-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <Lock className="w-5 h-5 text-text-primary" />
                <h2 className="text-xl font-bold text-text-primary">Automation Safety</h2>
              </div>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-2">Require Human Approval</h3>
                    <p className="text-sm text-text-secondary">Pause automations before executing sensitive actions (e.g. sending emails, deleting files).</p>
                  </div>
                  <button className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors bg-success focus:outline-none`}>
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white translate-x-7 transition-transform`} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* AI Settings */}
          {activeTab === 'AI & Logic' && (
            <section className="solid-card p-8">
              <div className="flex items-center gap-3 mb-8">
                <TraceLogo className="text-3xl" />
                <h2 className="text-xl font-bold text-text-primary">AI Provider Settings</h2>
              </div>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Primary AI Engine</label>
                   <select className="w-full bg-surface border border-border rounded px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-text-primary/50">
                     <option>Gemini 1.5 Pro (Recommended)</option>
                     <option>GPT-4o</option>
                     <option>Claude 3.5 Sonnet</option>
                   </select>
                 </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
