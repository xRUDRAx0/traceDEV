import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

export default function AgentView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState('');
  
  const instruction = location.state?.instruction;

  useEffect(() => {
    if (!instruction) {
      navigate('/');
      return;
    }

    const runAgentProcess = async () => {
      try {
        // Initial simulated log to show immediate feedback
        setLogs([{ agent: 'Coordinator', status: 'Received natural language request', detail: instruction }]);
        
        const res = await fetch(`${API_URL}/api/execute-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: instruction })
        });
        
        const data = await res.json();
        
        if (data.success && data.agentLog) {
          // Play the logs staggered for visual effect
          for (let i = 0; i < data.agentLog.length; i++) {
            await new Promise(r => setTimeout(r, 600));
            setLogs(prev => [...prev, data.agentLog[i]]);
          }
          
          await new Promise(r => setTimeout(r, 1000));
          navigate(`/execute/${data.runId}`);
        } else {
          setError(data.message || 'Failed to process request.');
        }
      } catch (err: any) {
        setError(err.message || 'Server error.');
      }
    };

    runAgentProcess();
  }, [instruction, navigate]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 pt-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6 relative shadow-inner">
           <div className="absolute inset-0 border border-accent/20 rounded-3xl animate-ping opacity-20"></div>
           <BrainCircuit className="w-10 h-10 text-accent" />
        </div>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">AI Orchestration</h1>
        <p className="text-text-secondary">Translating your instruction into execution steps...</p>
      </div>

      <div className="solid-card p-6 min-h-[300px]">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
             <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
               <span className="text-error font-bold">!</span>
             </div>
             <div>
               <p className="text-error font-bold">{error}</p>
               <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                 Try Again
               </button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-surface-secondary border border-border rounded-lg mb-8">
               <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Original Request</p>
               <p className="text-sm font-medium text-text-primary italic">"{instruction}"</p>
            </div>
            
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider pl-2 mb-4">Agent Swarm Activity</h3>
            
            <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-[23px] before:w-px before:bg-border">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 relative animate-in slide-in-from-left-4 fade-in duration-300">
                  <div className="w-12 flex justify-center shrink-0 pt-0.5 relative z-10">
                     <div className="w-3 h-3 rounded-full bg-success ring-4 ring-background border border-success"></div>
                  </div>
                  <div className="flex-1 bg-surface border border-border rounded-lg p-4 shadow-sm">
                    <p className="text-xs font-bold text-text-primary mb-1">{log.agent}</p>
                    <p className="text-sm text-text-secondary flex items-center gap-2">
                       {log.status} <ChevronRight className="w-3 h-3 text-border" /> <span className="font-bold text-accent">{log.detail}</span>
                    </p>
                  </div>
                </div>
              ))}
              
              {!error && logs.length > 0 && (
                <div className="flex gap-4 relative pt-2">
                  <div className="w-12 flex justify-center shrink-0 pt-0.5 relative z-10">
                     <Loader2 className="w-4 h-4 text-text-muted animate-spin bg-background" />
                  </div>
                  <div className="flex-1 text-xs text-text-muted font-bold pt-0.5">
                    Working...
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
