import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, StopCircle, CheckCircle2, Zap, BrainCircuit, Save } from 'lucide-react';
import { useObservation } from '../context/ObservationContext';
import { API_URL } from '../config';

export default function Recorder() {
  const navigate = useNavigate();
  const { isActive, toggleObservation, liveEvents, currentSessionId } = useObservation();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [proposedWorkflow, setProposedWorkflow] = useState<any>(null);

  const handleToggle = async () => {
    if (isActive) {
      // Stopping observation -> Trigger Analysis
      const sessionId = currentSessionId;
      await toggleObservation();
      
      if (sessionId && liveEvents.length > 0) {
        setAnalyzing(true);
        try {
          // Send session to AI for workflow generation
          const res = await fetch(`${API_URL}/api/teach`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json();
          setProposedWorkflow(data);
        } catch (err) {
          console.error('Analysis failed', err);
        } finally {
          setAnalyzing(false);
        }
      }
    } else {
      // Start observation
      setProposedWorkflow(null);
      await toggleObservation();
    }
  };

  const handleSave = async () => {
    if (!proposedWorkflow) return;
    try {
      await fetch(`${API_URL}/api/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposedWorkflow)
      });
      navigate('/workflows');
    } catch (err) {
      console.error('Failed to save workflow', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 pt-4 animate-in fade-in duration-500">
      <div className="text-center space-y-4 mb-12">
        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <BrainCircuit className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-black text-text-primary tracking-tight">Teach TRACE</h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Perform your task normally. TRACE will observe your actions and automatically generate an optimized, reusable workflow.
        </p>
      </div>

      {!proposedWorkflow && !analyzing && (
        <div className="solid-card p-12 text-center flex flex-col items-center">
          <button 
            onClick={handleToggle}
            className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 ${
              isActive 
                ? 'bg-error text-white animate-pulse shadow-error/20' 
                : 'bg-accent text-white shadow-accent/20'
            }`}
          >
            {isActive ? <StopCircle className="w-10 h-10 mb-2" /> : <PlayCircle className="w-10 h-10 mb-2 pl-1" />}
            <span className="font-bold text-sm">{isActive ? 'Finish' : 'Start'}</span>
          </button>
          
          {isActive && (
            <div className="mt-8 text-center animate-in slide-in-from-bottom-4">
              <p className="text-sm font-bold text-error mb-2 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-error animate-ping"></span> Observing your actions...
              </p>
              <p className="text-xs text-text-muted">{liveEvents.length} events captured</p>
            </div>
          )}
        </div>
      )}

      {analyzing && (
        <div className="solid-card p-12 text-center flex flex-col items-center space-y-6">
          <div className="w-16 h-16 border-4 border-surface-secondary border-t-accent rounded-full animate-spin"></div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">Analyzing Activity...</h3>
            <p className="text-sm text-text-secondary mt-1">Extracting logical steps and finding optimizations.</p>
          </div>
        </div>
      )}

      {proposedWorkflow && !analyzing && (
        <div className="solid-card overflow-hidden animate-in zoom-in-95 duration-500 border-2 border-accent/30 shadow-xl shadow-accent/5">
          <div className="bg-surface-secondary p-6 text-center border-b border-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none"></div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 mb-4">
              <CheckCircle2 className="w-4 h-4" /> WORKFLOW DISCOVERED
            </span>
            <h2 className="text-2xl font-black text-text-primary mb-1">{proposedWorkflow.name}</h2>
            <p className="text-sm font-medium text-text-muted max-w-md mx-auto">
              TRACE translated {proposedWorkflow.executionCount || liveEvents.length} observed actions into {proposedWorkflow.steps?.length || 0} logical steps.
            </p>
          </div>

          <div className="p-8 grid grid-cols-3 gap-6 text-center">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Est. Manual Time</p>
              <p className="text-xl font-black text-text-secondary">{Math.floor((proposedWorkflow.estimatedManualDuration || 0)/60)}m {(proposedWorkflow.estimatedManualDuration || 0)%60}s</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">TRACE Time</p>
              <p className="text-xl font-black text-accent">{Math.floor((proposedWorkflow.averageDuration || 0)/60)}m {(proposedWorkflow.averageDuration || 0)%60}s</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Time Saved</p>
              <p className="text-xl font-black text-success flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                {Math.floor((proposedWorkflow.timeSavedPerRun || 0)/60)}m {(proposedWorkflow.timeSavedPerRun || 0)%60}s
              </p>
            </div>
          </div>

          <div className="px-8 pb-8 flex flex-col items-center">
            <div className="w-full bg-surface-secondary/50 rounded-lg p-4 mb-6 border border-border flex justify-between items-center">
               <span className="text-sm font-bold text-text-primary">Confidence Score</span>
               <span className="text-sm font-black text-success">{proposedWorkflow.confidence || 96}%</span>
            </div>
            <button 
              onClick={handleSave}
              className="w-full sm:w-auto px-8 py-3 bg-accent hover:bg-accent-hover text-background text-sm font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Workflow to Memory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
