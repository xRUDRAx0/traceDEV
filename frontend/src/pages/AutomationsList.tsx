import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, PlayCircle, Settings2, Trash2, Search, Power } from 'lucide-react';
import { API_URL } from '../config';

export default function AutomationsList() {
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/automations`)
      .then(res => res.json())
      .then(data => {
        setAutomations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load automations', err);
        setLoading(false);
      });
  }, []);

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/automations/${id}/execute`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/execute/${data.runId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) return;
    try {
      const res = await fetch(`${API_URL}/api/automations/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const standardAutomations = automations.filter(a => a.executionType !== 'showcase');
  const showcaseAutomations = automations.filter(a => a.executionType === 'showcase');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Automations</h1>
          <p className="text-sm text-text-secondary">Manage and execute your active TRACE automations.</p>
        </div>
        <button onClick={() => navigate('/workflows')} className="px-6 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5">
          New Automation
        </button>
      </div>

      {showcaseAutomations.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-xl font-bold text-text-primary">TRACE Showcase</h2>
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-md tracking-wider">Demo / Hackathon</span>
          </div>
          <p className="text-xs text-text-secondary mb-6 max-w-2xl">
            These are local, preconfigured showcases demonstrating advanced offline automation capabilities including Excel processing, local PDF extraction, and local notification systems without external dependencies.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {showcaseAutomations.map((automation, i) => (
              <div key={i} className="solid-card p-6 flex flex-col group border-2 border-amber-100 bg-gradient-to-br from-white to-amber-50/30 hover:border-amber-300 hover:shadow-lg transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/50 to-transparent rounded-bl-full pointer-events-none" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-text-primary font-bold text-sm">{automation.name}</h3>
                      <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-1">
                        Showcase Ready
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 text-xs text-text-secondary leading-relaxed mb-6 font-medium bg-white/50 p-3 rounded-lg border border-amber-100/50 relative z-10">
                   {automation.id === 'showcase_sales' && 'Excel → Analysis → Report → Demo Email'}
                   {automation.id === 'showcase_invoice' && 'File Discovery → PDF Extraction → Excel Update'}
                   {automation.id === 'showcase_support' && 'Read → Local AI Classify → Local Ticket → Notify'}
                </div>

                <div className="flex items-center justify-between border-t border-amber-100 pt-4 mt-auto relative z-10">
                  <button 
                    onClick={() => handleRunNow(automation.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors w-full justify-center shadow-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Run Showcase
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="solid-card flex flex-col">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search automations..."
              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-9 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-[#0284C7] shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-semibold text-text-muted">Loading automations...</div>
        ) : standardAutomations.length === 0 ? (
          <div className="text-center py-16 text-xs text-text-muted">
            <Zap className="w-8 h-8 text-[#CBD5E1] mx-auto mb-3" />
            No user automations built yet. Go to Workflows to build one!
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {standardAutomations.map((automation, i) => (
                <div key={i} className="solid-card p-6 flex flex-col group border border-[#E2E8F0] hover:border-[#BAE6FD] hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] flex items-center justify-center">
                        <Zap className="w-5 h-5 text-[#9333EA]" />
                      </div>
                      <div>
                        <h3 className="text-text-primary font-bold text-sm">{automation.id}</h3>
                        <p className="text-[10px] font-semibold text-[#059669] uppercase tracking-widest bg-[#D1FAE5] px-2 py-0.5 rounded-md inline-block mt-1">
                          {automation.status || 'Active'}
                        </p>
                      </div>
                    </div>
                    <button className="text-[#94A3B8] hover:text-[#059669] transition-colors p-1">
                      <Power className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 mb-6">
                     <p className="text-xs text-text-secondary mb-3 leading-relaxed">Automates {automation.steps?.length || 0} manual steps recorded by TRACE.</p>
                     <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                       Trigger: <span className="text-text-primary font-bold">Manual</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                      <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Runs</p>
                      <p className="text-lg font-bold text-text-primary">6</p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                      <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Last Run</p>
                      <p className="text-lg font-bold text-text-primary">Today</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-auto">
                    <button onClick={() => handleRunNow(automation.id)} className="flex-1 py-3 bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0284C7] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-[#BAE6FD]">
                      <PlayCircle className="w-4 h-4" /> Run Now
                    </button>
                    <button className="p-3 bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] rounded-xl border border-[#E2E8F0] transition-colors shadow-sm" title="Settings">
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(automation.id)} className="p-3 bg-white hover:bg-[#FEF2F2] text-[#64748B] hover:text-[#DC2626] rounded-xl border border-[#E2E8F0] transition-colors shadow-sm" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
