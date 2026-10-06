import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, BarChart2, Folder, Globe, Zap } from 'lucide-react';

export default function ShowcaseLanding() {
  const navigate = useNavigate();

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-500 pb-16 pt-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F8FAFC] rounded-full text-[#64748B] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold text-text-primary tracking-tight">TRACE Automation Showcase</h1>
             <span className="px-2.5 py-0.5 bg-[#F0F9FF] text-[#0284C7] rounded-md uppercase tracking-widest text-[10px] font-semibold border border-[#BAE6FD]">Developer Demo</span>
          </div>
          <p className="mt-2 text-[#64748B] font-medium">Watch TRACE complete a real business workflow from data to delivery. All processing happens locally on your machine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Featured Showcase */}
        <div className="md:col-span-3 solid-card p-10 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden group border border-[#E2E8F0]">
          <div className="absolute top-0 right-0 p-40 bg-[#F0F9FF] rounded-full blur-[80px] -z-10 transition-colors duration-700"></div>
          
          <div className="w-28 h-28 bg-[#FAF5FF] rounded-2xl flex items-center justify-center shrink-0 border border-[#E9D5FF] shadow-sm">
             <BarChart2 className="w-12 h-12 text-[#9333EA]" />
          </div>
          
          <div className="flex-1 space-y-4">
             <div>
               <div className="flex items-center gap-2 mb-1">
                 <h2 className="text-2xl font-bold text-text-primary">Weekly Sales Report</h2>
                 <span className="px-2 py-0.5 bg-[#D1FAE5] text-[#059669] text-[10px] font-semibold uppercase tracking-widest rounded-md border border-[#A7F3D0]">Featured</span>
               </div>
               <p className="text-text-secondary text-sm max-w-xl leading-relaxed">
                 Reads local sales data, analyzes reporting periods, calculates revenue & growth, generates a formatted Excel file, and delivers it via a local mock email.
               </p>
             </div>
             
             <div className="flex gap-8 pt-3">
               <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Estimated Manual Time</p>
                  <p className="font-mono text-sm text-text-primary line-through opacity-60">~3m 42s</p>
               </div>
               <div>
                  <p className="text-[10px] font-semibold text-[#0284C7] uppercase tracking-wider mb-1">TRACE Execution</p>
                  <p className="font-mono text-lg font-bold text-[#0284C7]">~10s</p>
               </div>
               <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Actions</p>
                  <p className="font-mono text-sm font-semibold text-text-primary">13 Automated</p>
               </div>
             </div>
          </div>
          
          <div className="shrink-0 w-full md:w-auto mt-6 md:mt-0">
             <button 
               onClick={() => navigate('/showcase/run/weekly-sales')}
               className="w-full md:w-auto px-8 py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] font-semibold flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5"
             >
               <Zap className="w-5 h-5 fill-current" /> Run Showcase
             </button>
          </div>
        </div>

        {/* Other Showcases (Disabled for UI purpose) */}
        <div className="solid-card p-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-300 flex flex-col">
           <div className="w-14 h-14 bg-[#F8FAFC] rounded-xl flex items-center justify-center mb-5 border border-[#F1F5F9]">
             <Folder className="w-6 h-6 text-[#64748B]" />
           </div>
           <h3 className="font-bold text-text-primary mb-2 text-lg">File Organization</h3>
           <p className="text-sm text-text-secondary mb-6 line-clamp-2 leading-relaxed flex-1">Automatically categorizes and moves downloaded files into project folders based on content.</p>
           <button disabled className="w-full py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] font-semibold text-xs rounded-xl cursor-not-allowed">Coming Soon</button>
        </div>

        <div className="solid-card p-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-300 flex flex-col">
           <div className="w-14 h-14 bg-[#F8FAFC] rounded-xl flex items-center justify-center mb-5 border border-[#F1F5F9]">
             <Globe className="w-6 h-6 text-[#64748B]" />
           </div>
           <h3 className="font-bold text-text-primary mb-2 text-lg">Web Research</h3>
           <p className="text-sm text-text-secondary mb-6 line-clamp-2 leading-relaxed flex-1">Scrapes competitor pricing from specified sites and aggregates into a summary dashboard.</p>
           <button disabled className="w-full py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#94A3B8] font-semibold text-xs rounded-xl cursor-not-allowed">Coming Soon</button>
        </div>

      </div>
    </div>
  );
}
