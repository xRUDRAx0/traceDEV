import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, LayoutDashboard, Sparkles, Zap } from 'lucide-react';
import TraceLogo from '../components/TraceLogo';
import { useObservation } from '../context/ObservationContext';

export default function Home() {
  const navigate = useNavigate();
  const { toggleObservation, isActive } = useObservation();

  const handleStartObserving = () => {
    if (!isActive) {
      toggleObservation();
    }
    // We navigate to activity or somewhere else maybe, but prompt says "Observation UI opens"
    // Wait, the prompt says "User clicks Start Observing -> Observation UI opens (or just toggles)". 
    // In our app, there is a Recorder/Activity page or we just let it toggle.
    // Let's just toggle and maybe navigate to activity.
    navigate('/activity');
  };

  return (
    <div className="flex-1 w-full h-full min-h-[calc(100vh-4rem)] flex flex-col relative bg-transparent overflow-hidden animate-in fade-in duration-700">
      
      {/* Sparkle decorations - abstracting the small yellow sparkles from the image */}
      <div className="absolute top-32 left-1/2 -translate-x-12 text-warning/30 animate-pulse">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="absolute top-24 right-1/4 text-warning/20 animate-pulse delay-700">
        <Sparkles className="w-8 h-8" />
      </div>
      <div className="absolute bottom-48 left-1/3 text-warning/40 animate-pulse delay-300">
        <Sparkles className="w-6 h-6" />
      </div>

      <div className="flex-1 flex items-center justify-center w-full max-w-[1200px] mx-auto px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center w-full">
          
          {/* Left Content */}
          <div className="flex flex-col">
            <h1 className="text-[52px] font-black text-text-primary leading-[1.1] tracking-tight mb-2">
              Hello, Rudra.
            </h1>
            <h2 className="text-[32px] font-bold text-text-secondary mb-8 tracking-tight">
              Let's get some work done.
            </h2>
            
            <p className="text-sm font-medium text-text-secondary leading-relaxed max-w-[380px] mb-8">
              TRACE observes how you work, understands repetitive patterns, and helps turn them into reliable automations.
            </p>

            {/* Feature 4: Natural Language Execution Input */}
            <div className="w-full max-w-[420px] mb-12 relative group">
              <input 
                type="text" 
                placeholder="What do you want TRACE to do?"
                className="w-full bg-surface border-2 border-border rounded-xl px-5 py-4 text-sm font-bold text-text-primary focus:outline-none focus:border-accent transition-all shadow-sm"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget.value;
                    if (!input.trim()) return;
                    e.currentTarget.disabled = true;
                    try {
                      // Navigate to a temporary loading screen or Agent view
                      navigate('/agent-view', { state: { instruction: input } });
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted bg-surface-secondary px-2 py-1 rounded border border-border">↵ Enter</span>
              </div>
            </div>

            <div className="flex items-center gap-4 max-w-[420px] mb-8">
              <button 
                onClick={handleStartObserving}
                className="flex-1 py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 font-semibold text-sm"
              >
                <PlayCircle className="w-4 h-4" /> Start Observing
              </button>
              
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-3.5 bg-white hover:bg-surface-secondary text-text-primary rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.02)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 font-semibold text-sm border border-border"
              >
                <LayoutDashboard className="w-4 h-4 text-text-muted" /> Go to Dashboard
              </button>
            </div>

            <div className="max-w-[420px]">
              <div className="relative group">
                <button 
                  onClick={() => navigate('/showcase')}
                  className="relative w-full py-3 bg-[#F0F9FF] text-[#0284C7] rounded-xl flex items-center justify-center gap-3 font-bold text-xs tracking-wide uppercase border border-[#BAE6FD] hover:bg-[#E0F2FE] transition-colors"
                >
                  <Zap className="w-4 h-4 fill-current" /> Run Automation Showcase
                </button>
              </div>
              <p className="text-center text-[10px] text-text-muted font-bold tracking-widest uppercase mt-3">Live Developer Demo</p>
            </div>
          </div>

          {/* Right Content - Large Logo Card */}
          <div className="flex justify-center md:justify-end relative">
             <div className="w-full max-w-[400px] aspect-square rounded-[32px] bg-white border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center relative z-10">
               <TraceLogo className="text-[100px] text-[#0F172A]" />
               <p className="mt-2 text-[#64748B] text-lg font-medium">Your Work, Automated</p>
             </div>
             
             {/* Massive soft organic blobs behind the card matching the reference */}
             <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#FEF08A]/40 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
             <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#E0F2FE]/60 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
             <div className="absolute top-[20%] left-[-20%] w-[250px] h-[250px] bg-[#F3E8FF]/50 rounded-full blur-[60px] -z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Flow Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[11px] font-bold tracking-widest uppercase text-text-secondary">
        <span>Observe</span>
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
        <span>Understand</span>
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
        <span className="text-warning">Automate</span>
      </div>
      
    </div>
  );
}
