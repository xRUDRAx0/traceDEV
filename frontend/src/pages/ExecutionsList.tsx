import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Zap, Search, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

export default function ExecutionsList() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/automations/runs`)
      .then(res => res.json())
      .then(data => {
        setRuns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load runs', err);
        setLoading(false);
      });
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-[#059669]" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-[#DC2626]" />;
    if (status === 'running') return <Zap className="w-4 h-4 text-[#0284C7] animate-pulse" />;
    return <Clock className="w-4 h-4 text-[#D97706]" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-[#059669] bg-[#D1FAE5] border-[#A7F3D0]';
    if (status === 'failed') return 'text-[#DC2626] bg-[#FEE2E2] border-[#FECACA]';
    if (status === 'running') return 'text-[#0284C7] bg-[#E0F2FE] border-[#BAE6FD]';
    return 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Executions</h1>
          <p className="text-sm text-text-secondary">History of all TRACE automations executed.</p>
        </div>
      </div>

      <div className="solid-card flex flex-col">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC]/50 flex items-center gap-4">
          <div className="flex-1 relative max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search execution history..."
              className="w-full bg-white border border-[#E2E8F0] rounded-lg px-9 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-[#0284C7] shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs font-semibold text-text-muted">Loading executions...</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-16 text-xs text-text-muted">
            <Clock className="w-8 h-8 text-[#CBD5E1] mx-auto mb-3" />
            No automations have been executed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] text-[10px] text-text-muted font-semibold uppercase tracking-wider bg-[#F8FAFC]">
                  <th className="py-4 pl-6">Automation</th>
                  <th className="py-4">Started</th>
                  <th className="py-4">Duration</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-sm">
                {runs.map((run, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors group cursor-pointer" onClick={() => navigate(`/execute/${run.id}`)}>
                    <td className="py-5 pl-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-[#FAF5FF] flex items-center justify-center`}>
                          <Zap className={`w-5 h-5 text-[#9333EA]`} />
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary">{run.automationId}</p>
                          <p className="text-[11px] text-text-muted font-medium mt-0.5">Run ID: {run.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 font-semibold text-text-secondary">
                      {new Date(run.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-5 font-semibold text-text-secondary">
                      {run.endTime ? `${Math.round((new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000)}s` : '-'}
                    </td>
                    <td className="py-5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${getStatusColor(run.status)} flex items-center gap-1.5 w-max shadow-sm capitalize`}>
                        {getStatusIcon(run.status)} {run.status}
                      </span>
                    </td>
                    <td className="py-5 text-right pr-6">
                      <ChevronRight className="w-5 h-5 text-text-muted inline-block group-hover:text-text-primary transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
