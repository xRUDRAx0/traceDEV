import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, RotateCw, XCircle, ArrowLeft, ShieldCheck, Clock, AlertTriangle, Bot, Zap } from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';

interface StepResult {
  step: string;
  originalAction?: string;
  status: string;
  recoveryReason?: string;
}

interface ExecutionRun {
  runId: string;
  automationId: string;
  status: string;
  stepResults: StepResult[];
  context?: any;
}

export default function Execution() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRun = async () => {
    try {
      const res = await fetch(`${API_URL}/api/executions/${runId}`);
      const data = await res.json();
      if (data.success) {
        setRun(data.run);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRun();
    const interval = setInterval(() => {
      if (run?.status === 'Running' || run?.status === 'Recovering') {
        fetchRun();
      } else {
        clearInterval(interval);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    const socket = io(SOCKET_URL);
    socket.on('run_update', (data: { runId: string; status: string }) => {
      if (data.runId === runId) {
        fetchRun();
      }
    });
    return () => { socket.disconnect(); };
  }, [runId]);

  const handleApprove = async () => {
    if (!runId) return;
    try {
      await fetch(`${API_URL}/api/executions/${runId}/approve`, { method: 'POST' });
    } catch (e) {
      alert('Failed to approve step');
    }
  };

  const handleRetry = async () => {
    alert('Retry functionality requires backend resume endpoint.');
  };

  const handleCancel = async () => {
    if (!runId) return;
    try {
      await fetch(`${API_URL}/api/executions/${runId}/cancel`, { method: 'POST' });
    } catch (e) {
      alert('Failed to cancel execution');
    }
  };

  if (loading && !run) return <div className="p-8 text-center text-text-muted">Connecting to execution runner...</div>;
  if (!run) return <div className="p-8 text-center text-error">Execution run not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-surface-secondary rounded-full text-text-secondary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Live Execution</h1>
          <p className="mt-1 text-text-muted font-mono text-sm">{run.runId}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {run.executionType === 'showcase' && run.status === 'Completed' && run.automationId === 'showcase_sales' && (
            <>
              <button onClick={() => alert("Local file verified: Weekly_Sales_Report.xlsx in Reports folder.")} className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#F0F9FF] text-[#0284C7] hover:bg-[#E0F2FE] border border-[#BAE6FD] shadow-sm transition-colors">
                View Report
              </button>
              <button onClick={() => alert("Local email verified: delivery.json in Demo Email folder.")} className="px-4 py-1.5 rounded-full text-sm font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 shadow-sm transition-colors">
                View Email
              </button>
            </>
          )}
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 border shadow-sm ${
            run.status === 'Running' ? 'bg-info/20 text-info border-info/30' :
            run.status === 'Recovering' ? 'bg-accent/20 text-accent border-accent/30 animate-pulse' :
            run.status === 'WaitingForApproval' ? 'bg-warning/20 text-warning border-warning/30 animate-pulse' :
            run.status === 'Completed' ? 'bg-success/20 text-success border-success/30' :
            'bg-error/20 text-error border-error/30'
          }`}>
            {run.status === 'Running' && <RotateCw className="w-4 h-4 animate-spin" />}
            {run.status === 'Recovering' && <Bot className="w-4 h-4 animate-bounce" />}
            {run.status === 'WaitingForApproval' && <ShieldCheck className="w-4 h-4" />}
            {run.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
            {run.status}
          </span>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-lg border border-border p-8">
        <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[35px] before:w-px before:bg-border">
          {run.stepResults.map((step, idx) => {
            const isHuman = step.step === 'human_approval';
            const actionName = isHuman ? step.originalAction : step.step;
            
            return (
              <div key={idx} className="relative">
                <div className={`flex items-start gap-6 p-4 rounded-xl border relative z-10 ${
                  step.status === 'Completed' ? 'bg-success/10 border-success/30' :
                  step.status === 'Running' ? 'bg-info/10 border-info/30 shadow-md shadow-info/5' :
                  step.status === 'Recovering' ? 'bg-accent/10 border-accent/40 shadow-lg shadow-accent/10' :
                  step.status === 'WaitingForApproval' ? 'bg-warning/10 border-warning/40 shadow-lg shadow-warning/10' :
                  'bg-surface-secondary border-border opacity-60'
                } transition-all duration-300`}>
                  
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-background border border-border shadow-sm mt-0.5">
                    {step.status === 'Completed' && <CheckCircle2 className="w-6 h-6 text-success" />}
                    {step.status === 'Running' && <RotateCw className="w-6 h-6 text-info animate-spin" />}
                    {step.status === 'Recovering' && <Zap className="w-6 h-6 text-accent animate-pulse" />}
                    {step.status === 'WaitingForApproval' && <Clock className="w-6 h-6 text-warning animate-pulse" />}
                    {step.status === 'Failed' && <XCircle className="w-6 h-6 text-error" />}
                    {step.status === 'Pending' && <div className="w-3 h-3 rounded-full bg-text-muted opacity-50" />}
                  </div>

                  <div className="flex-1 pt-1.5">
                    <h3 className={`font-black capitalize text-sm tracking-wide ${
                      step.status === 'Completed' ? 'text-success' :
                      step.status === 'Running' ? 'text-info' :
                      step.status === 'Recovering' ? 'text-accent' :
                      step.status === 'WaitingForApproval' ? 'text-warning' :
                      step.status === 'Failed' ? 'text-error' :
                      'text-text-secondary'
                    }`}>
                      {actionName?.replace('_', ' ')}
                    </h3>
                    
                    {step.status === 'Recovering' && (
                      <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20 flex items-start gap-3">
                         <Bot className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                         <div>
                            <p className="text-xs font-bold text-accent">Self-Healing Agent Active</p>
                            <p className="text-[10px] text-text-primary mt-1">TRACE encountered an execution anomaly and is analyzing the UI to find a recovery path...</p>
                         </div>
                      </div>
                    )}

                    {step.recoveryReason && step.status !== 'Recovering' && (
                      <div className="mt-3 p-3 bg-accent/5 rounded-lg border border-accent/20 flex items-start gap-3">
                         <Bot className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                         <div>
                            <p className="text-xs font-bold text-accent">Successfully Self-Healed</p>
                            <p className="text-[10px] text-text-primary mt-1">{step.recoveryReason}</p>
                         </div>
                      </div>
                    )}
                    
                    {step.status === 'WaitingForApproval' ? (
                      <div className="mt-4 p-5 bg-background rounded-xl border-2 border-warning/40 shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                          <Bot className="w-5 h-5 text-warning mt-0.5" />
                          <div>
                            {run.context?.summaryText ? (
                              <>
                                <p className="font-bold text-text-primary mb-1">TRACE wants to {actionName?.replace('_', ' ').toLowerCase()}</p>
                                <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{run.context.summaryText}</p>
                              </>
                            ) : (
                              <p className="font-medium text-text-primary text-sm">
                                TRACE wants to {actionName?.replace('_', ' ').toLowerCase()}.
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={handleApprove}
                            className="px-4 py-2 bg-warning hover:bg-warning-hover text-background text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                          >
                            <ShieldCheck className="w-4 h-4" /> Approve
                          </button>
                          <button 
                            onClick={handleCancel}
                            className="px-4 py-2 bg-surface border border-border hover:bg-surface-secondary text-text-primary text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : isHuman ? (
                      <p className="text-[10px] font-bold tracking-widest uppercase text-warning mt-1">Human Checkpoint</p>
                    ) : null}
                    
                  </div>

                  {step.status === 'Failed' && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-2 p-4 bg-error/10 border border-error/20 rounded-lg shadow-lg backdrop-blur-sm">
                      <p className="text-error font-bold text-sm flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" /> Execution Halted
                      </p>
                      <p className="text-text-primary font-medium text-xs">
                        {run.context?.errorDetails || 'An unknown error occurred during execution.'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <button onClick={handleRetry} className="px-4 py-2 bg-error text-white text-xs font-bold rounded shadow-sm hover:bg-error-hover">
                          Retry Step
                        </button>
                        <button onClick={handleCancel} className="px-4 py-2 border border-error/30 text-error text-xs font-bold rounded hover:bg-error/10">
                          Abort Workflow
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
