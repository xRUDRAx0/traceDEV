import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, Search, Clock, Zap, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '../config';

export default function History() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/executions`).then(r => r.json()),
      fetch(`${API_URL}/api/automations`).then(r => r.json())
    ]).then(([execData, autoData]) => {
      setExecutions(Array.isArray(execData) ? execData : []);
      setAutomations(Array.isArray(autoData) ? autoData : []);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load history', err);
      setLoading(false);
    });
  }, []);

  const getAutomation = (id: string) => automations.find(a => a.id === id);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-primary">TRACE Time Machine</h1>
          <p className="mt-1 text-text-secondary font-medium">Replay past executions and view optimizations.</p>
        </div>
        <div className="w-12 h-12 bg-surface border border-border rounded-xl flex items-center justify-center shadow-sm">
          <HistoryIcon className="w-6 h-6 text-accent" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-text-muted font-bold">Loading temporal logs...</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-12 text-sm text-text-muted font-bold">No executions recorded yet.</div>
      ) : (
        <div className="space-y-6">
          {executions.map(run => {
            const automation = getAutomation(run.automationId);
            const name = automation?.name || run.automationId;
            const duration = run.completedAt ? Math.round((run.completedAt - run.startedAt) / 1000) : 0;
            const manualDuration = automation?.estimatedManualDuration || 0;
            const saved = Math.max(0, manualDuration - duration);
            const isExpanded = expandedId === run.runId;

            return (
              <div key={run.runId} className="bg-surface border-2 border-border rounded-xl overflow-hidden shadow-sm transition-all hover:border-accent/40">
                <div 
                  className="p-5 flex items-center justify-between cursor-pointer bg-surface-secondary/30"
                  onClick={() => setExpandedId(isExpanded ? null : run.runId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center">
                      {run.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Clock className="w-5 h-5 text-warning" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                        {name}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-background border border-border">v{automation?.version || 1}</span>
                      </h3>
                      <p className="text-xs text-text-secondary mt-1">
                        {new Date(run.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-text-muted uppercase">Time Saved</p>
                      <p className="text-sm font-black text-success flex items-center justify-end gap-1">
                        <Zap className="w-3 h-3" />
                        {Math.floor(saved / 60)}m {saved % 60}s
                      </p>
                    </div>
                    <div className="text-text-muted">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-border bg-background/50 flex gap-8">
                    {/* Feature 10: Comparison View */}
                    <div className="w-1/3 space-y-4">
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Optimization Metrics</h4>
                      <div className="bg-surface border border-border p-4 rounded-lg space-y-4 shadow-sm">
                        <div>
                          <p className="text-[10px] text-text-muted font-bold uppercase mb-1">Original Manual Workflow</p>
                          <p className="text-sm font-bold text-text-secondary line-through opacity-70">
                            {automation?.steps.length || 0} manual actions<br/>
                            {Math.floor(manualDuration / 60)}m {manualDuration % 60}s
                          </p>
                        </div>
                        <div className="w-full h-px bg-border"></div>
                        <div>
                          <p className="text-[10px] text-accent font-bold uppercase mb-1">TRACE Execution</p>
                          <p className="text-sm font-black text-text-primary">
                            {run.stepResults.length} logical steps<br/>
                            {Math.floor(duration / 60)}m {duration % 60}s
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Feature 10: Timeline View */}
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Execution Timeline</h4>
                      <div className="relative pl-4 space-y-4 before:absolute before:inset-y-0 before:left-[7px] before:w-px before:bg-border">
                        {run.stepResults.map((step: any, idx: number) => {
                          // Mocking timestamps incrementally for the replay effect based on run duration
                          const stepTime = new Date(run.startedAt + (idx * Math.max(1000, (duration*1000) / run.stepResults.length)));
                          return (
                            <div key={idx} className="relative flex items-start gap-4">
                              <div className={`absolute -left-[4px] top-1.5 w-2 h-2 rounded-full border-2 border-background ${step.status === 'Completed' ? 'bg-success' : step.status === 'Failed' ? 'bg-error' : 'bg-warning'}`}></div>
                              <div className="text-[10px] font-bold text-text-muted w-16 pt-0.5 shrink-0">
                                {stepTime.toLocaleTimeString([], { hour12: false })}
                              </div>
                              <div className="flex-1 bg-surface border border-border p-3 rounded-lg shadow-sm">
                                <p className="text-xs font-bold text-text-primary capitalize">{step.originalAction || step.step}</p>
                                {step.recoveryReason && (
                                  <div className="mt-2 text-[10px] text-warning bg-warning/10 p-2 rounded border border-warning/20">
                                    <span className="font-bold">Self-Healed:</span> {step.recoveryReason}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
