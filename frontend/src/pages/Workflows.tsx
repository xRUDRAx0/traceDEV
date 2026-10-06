import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Bot, Zap, Trash2, Search, Filter } from 'lucide-react';
import TraceLogo from '../components/TraceLogo';
import { API_URL } from '../config';

export default function Workflows() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard`)
      .then(res => res.json())
      .then(data => {
        setWorkflows(data.detectedWorkflows || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load workflows', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Workflows</h1>
          <p className="text-sm text-text-secondary">Recurring patterns TRACE has observed.</p>
        </div>
      </div>

      <div className="solid-card flex flex-col">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search workflows..."
              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-9 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-[#0284C7] shadow-sm"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-semibold text-text-primary hover:bg-[#F8FAFC] transition-colors flex items-center gap-2 shadow-sm">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-semibold text-text-muted">Detecting patterns...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-16 text-xs text-text-muted">
            <Layers className="w-8 h-8 text-[#CBD5E1] mx-auto mb-3" />
            No recurring workflows detected yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[10px] text-text-muted font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-4 pl-6">Workflow Name</th>
                  <th className="py-4">Repetitions</th>
                  <th className="py-4">Automation Score</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-sm">
                {workflows.map((row: any, i: number) => {
                  const isReady = row.status === 'Ready';
                  const badgeClasses = isReady ? 'text-[#059669] bg-[#D1FAE5] border-[#A7F3D0]' : 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]';
                  
                  return (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td className="py-5 pl-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-[#F0F9FF] flex items-center justify-center`}>
                            <Layers className={`w-5 h-5 text-[#0284C7]`} />
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">{row.name}</p>
                            <p className="text-[11px] text-text-muted truncate max-w-[250px] font-medium mt-0.5">
                              {row.repeatedActions ? row.repeatedActions.join(' → ') : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 font-semibold text-text-secondary">{row.occurrenceCount}</td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-text-primary">{row.score}%</span>
                          <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isReady ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} style={{ width: `${row.score}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${badgeClasses} flex items-center gap-1.5 w-max shadow-sm`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {row.status}
                        </span>
                      </td>
                      <td className="py-5 text-right pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => navigate(`/analysis`)} title="Analyze" className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] text-[11px] font-semibold text-text-primary border border-[#E2E8F0] transition-colors flex items-center gap-1.5 shadow-sm">
                            <TraceLogo className="text-[10px]" /> Analyze
                          </button>
                          <button onClick={() => navigate(`/builder`)} title="Build Automation" className="px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-[11px] font-semibold text-white transition-colors flex items-center gap-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.15)]">
                            <Zap className="w-3 h-3" /> Build
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
