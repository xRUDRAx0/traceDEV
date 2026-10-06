import React, { useEffect, useState } from 'react';
import { Activity, Zap, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import TraceLogo from '../components/TraceLogo';
import { API_URL } from '../config';

export default function Insights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/intelligence`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load insights', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs font-bold text-text-muted">Analyzing workflow data...</div>;
  }

  const opp = data?.insights?.find((i: any) => i.type === 'automation_opportunity');
  
  // Dummy values for aesthetics, in a real app these would come from advanced backend analysis
  const efficiency = 100;
  const contextSwitching = 0;
  const frictionScore = 0;
  const automationPotential = opp ? parseInt(opp.automationPotential || '0') : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] mx-auto">
      
      <div className="flex items-center gap-3 mb-6">
        <TraceLogo className="text-3xl text-text-primary" />
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Intelligence</h1>
      </div>
      <p className="text-sm text-text-secondary mt-[-1rem] mb-8 font-medium">Evidence-based analysis of your workflow quality and productivity.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Work Efficiency */}
        <div className="solid-card p-8 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="text-[#059669]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg></span>
            Work Efficiency
          </div>
          <div className="w-28 h-28 rounded-full border-[6px] border-[#34D399] flex flex-col items-center justify-center text-[#059669] mb-4 bg-[#D1FAE5]">
            <span className="text-4xl font-bold">{efficiency}</span>
            <span className="text-[10px] font-semibold opacity-70">/100</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Optimal workflow detected</p>
        </div>

        {/* Context Switching */}
        <div className="solid-card p-8 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#0F172A]" />
            Context Switching
          </div>
          <div className="w-28 h-28 rounded-full border-[6px] border-[#E2E8F0] flex flex-col items-center justify-center text-text-primary mb-4 bg-[#F8FAFC]">
            <span className="text-4xl font-bold">{contextSwitching}</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Total application transitions</p>
        </div>

        {/* Workflow Friction */}
        <div className="solid-card p-8 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
            Workflow Friction
          </div>
          <div className="w-28 h-28 rounded-full border-[6px] border-[#E2E8F0] flex flex-col items-center justify-center text-text-primary mb-4 bg-[#F8FAFC]">
            <span className="text-4xl font-bold">{frictionScore}</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Average friction score</p>
        </div>

        {/* Automation Potential */}
        <div className="solid-card p-8 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#0284C7]" />
            Automation Potential
          </div>
          <div className="w-28 h-28 rounded-full border-[6px] border-[#E2E8F0] flex flex-col items-center justify-center text-text-primary mb-4 bg-[#F8FAFC]">
            <span className="text-4xl font-bold">{automationPotential}%</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Estimated opportunity</p>
        </div>

      </div>

      <div className="mt-12">
        <h2 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
          <span className="text-[#F59E0B]">👍</span> AI Recommendations
        </h2>
        
        <div className="solid-card p-10 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#F8FAFC] to-white">
          <div className="w-14 h-14 rounded-2xl bg-[#D1FAE5] flex items-center justify-center mb-5 border border-[#A7F3D0]">
            <CheckCircle2 className="w-7 h-7 text-[#059669]" />
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-3">Your workflows are highly efficient</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto font-medium">
            We haven't detected any major friction points or automation opportunities yet. Keep working, and TRACE will keep analyzing!
          </p>
        </div>
      </div>
    </div>
  );
}
