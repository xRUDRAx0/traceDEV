import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronRight, PlayCircle, StopCircle, FileText, Database, Zap, Activity as ActivityIcon } from 'lucide-react';
import { useObservation } from '../context/ObservationContext';
import InspectModal from '../components/InspectModal';
import { API_URL } from '../config';

export default function Activity() {
  const { isActive, toggleObservation, liveEvents, currentSessionId } = useObservation();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessRes, evRes] = await Promise.all([
          fetch(`${API_URL}/api/sessions`),
          fetch(`${API_URL}/api/events`)
        ]);
        const [sessData, evData] = await Promise.all([sessRes.json(), evRes.json()]);
        setSessions(Array.isArray(sessData) ? sessData : []);
        setAllEvents(Array.isArray(evData) ? evData : []);
      } catch (err) {
        console.error('Failed to load activity data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isActive]); // Reload when observation toggles to get new session data

  // Group events by session
  const eventsBySession: Record<string, any[]> = {};
  
  // Historical
  allEvents.forEach(e => {
    const sid = e.sessionId || e.workflowId;
    if (sid) {
      if (!eventsBySession[sid]) eventsBySession[sid] = [];
      eventsBySession[sid].push(e);
    }
  });

  // Live session
  if (currentSessionId && liveEvents.length > 0) {
    eventsBySession[currentSessionId] = [...liveEvents];
  }

  const getSessionNumber = (sessionId: string) => {
    const idx = [...sessions].reverse().findIndex(s => s.id === sessionId);
    return idx >= 0 ? idx + 1 : sessions.length + 1; // Fallback for live
  };

  const getAppIcon = (appName: string) => {
    if (!appName) return { icon: FileText, color: 'text-text-secondary' };
    if (appName === 'Spreadsheet' || appName.includes('Excel')) return { icon: Database, color: 'text-success' };
    if (appName === 'Gmail' || appName.includes('Chrome')) return { icon: Zap, color: 'text-warning' };
    if (appName === 'Report' || appName.includes('Word')) return { icon: ActivityIcon, color: 'text-accent' };
    return { icon: FileText, color: 'text-text-secondary' };
  };

  const getSemanticAction = (act: any) => {
    if (act.action === 'click') return `Clicked "${act.elementName || act.target || 'UI Element'}"`;
    if (act.action === 'copy') return `Copied data from ${act.application}`;
    if (act.action === 'type') return `Typed text`;
    return act.action.replace('_', ' ');
  };

  const renderTimeline = (sessionEvents: any[]) => {
    const filtered = sessionEvents.filter(e => 
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.target && e.target.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.application && e.application.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filtered.length === 0) return <div className="p-4 text-xs text-text-muted">No matching events.</div>;

    return (
      <div className="py-4 pl-4 pr-4 border-t border-border bg-surface-secondary/30 relative">
        <div className="absolute left-8 top-8 bottom-8 w-px bg-border"></div>
        <div className="space-y-4">
          {filtered.map((act, i) => {
            const appName = act.app || act.application || 'Unknown';
            const { icon: Icon, color } = getAppIcon(appName);
            const time = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            return (
              <div key={i} className="flex gap-4 relative">
                <div className="w-16 text-[10px] font-bold text-text-muted pt-2 shrink-0 text-right">
                  {time}
                </div>
                <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 mt-0.5 relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-muted"></div>
                </div>
                <div 
                  className="flex-1 bg-surface border border-border rounded-md p-3 hover:border-accent transition-colors cursor-pointer shadow-sm flex items-center justify-between group"
                  onClick={() => setSelectedEvent({...act, sessionNumber: getSessionNumber(act.sessionId || act.workflowId)})}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <div>
                      <p className="text-xs font-bold text-text-primary capitalize">{getSemanticAction(act)}</p>
                      <p className="text-[10px] text-text-secondary">{appName} {act.windowTitle ? `· ${act.windowTitle}` : ''}</p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-accent px-2 py-1 bg-surface-secondary rounded transition-opacity">
                    Inspect
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Prepare session list for rendering (mix live + history)
  let displaySessions = [...sessions];
  if (currentSessionId && !displaySessions.find(s => s.id === currentSessionId)) {
    displaySessions.unshift({
      id: currentSessionId,
      startTime: liveEvents[0]?.timestamp || new Date().toISOString(),
      endTime: null,
      isLive: true
    });
  }
  
  displaySessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-5xl mx-auto">
      
      {/* Observation State Card (Matches Reference) */}
      {isActive ? (
        <div className="solid-card overflow-hidden p-8 relative">
           <div className="absolute right-0 top-0 w-64 h-64 bg-[#E0F2FE]/40 rounded-full blur-[60px] -z-10 pointer-events-none translate-x-1/2 -translate-y-1/4"></div>
           
           <div className="flex items-center gap-4 mb-10">
             <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center border border-[#A7F3D0]">
               <div className="w-3 h-3 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/20"></div>
             </div>
             <div>
               <h2 className="text-xl font-bold text-text-primary">Observation Active</h2>
               <p className="text-sm text-text-secondary">TRACE is running in the background.</p>
             </div>
           </div>

           <div className="grid grid-cols-3 gap-12 mb-10">
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">SESSION DURATION</p>
                <p className="text-4xl font-bold text-text-primary font-mono tracking-tight">{formatDuration(duration)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">ACTIONS</p>
                <p className="text-4xl font-bold text-text-primary">{liveEvents.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">APPS</p>
                <p className="text-4xl font-bold text-text-primary">{new Set(liveEvents.map(e => e.app || e.application)).size}</p>
              </div>
           </div>

           <div className="border-t border-[#F1F5F9] pt-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">LIVE ACTIVITY FEED</h3>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
                    <span className="text-xs font-semibold text-[#10B981]">Recording</span>
                 </div>
              </div>
              
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9] p-10 flex flex-col items-center justify-center min-h-[200px]">
                 {liveEvents.length === 0 ? (
                    <>
                      <ActivityIcon className="w-8 h-8 text-[#94A3B8] mb-3" />
                      <p className="text-sm text-[#64748B] font-medium">Waiting for activity...</p>
                    </>
                 ) : (
                    <div className="w-full space-y-3">
                      {liveEvents.slice(0, 3).map((act, i) => {
                        const appName = act.app || act.application || 'Unknown';
                        const { icon: Icon, color } = getAppIcon(appName);
                        return (
                          <div key={i} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-[#F1F5F9] shadow-sm">
                            <Icon className={`w-5 h-5 ${color}`} />
                            <div>
                              <p className="text-sm font-semibold text-text-primary capitalize">{getSemanticAction(act)}</p>
                              <p className="text-[11px] text-text-secondary">{appName}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                 )}
              </div>
           </div>

           <button 
             onClick={toggleObservation}
             className="px-8 py-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
           >
             <StopCircle className="w-4 h-4" /> Finish Observation
           </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Activity</h1>
            <p className="text-sm text-text-secondary">Review your recorded observation sessions.</p>
          </div>
          <button 
            onClick={toggleObservation}
            className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5"
          >
            <PlayCircle className="w-4 h-4" /> Start Observation
          </button>
        </div>
      )}

      <div className="solid-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-surface-secondary/50">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded px-9 py-2 text-xs font-bold text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-text-muted">Loading sessions...</div>
          ) : displaySessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">No sessions recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {displaySessions.map((session, idx) => {
                const sEvents = eventsBySession[session.id] || [];
                if (searchTerm && !sEvents.some(e => 
                  e.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  (e.target && e.target.toLowerCase().includes(searchTerm.toLowerCase()))
                )) {
                  // Keep it if session id matches or something, but let's just filter out empty matching sessions
                  if (searchTerm !== '') return null;
                }

                const uniqueApps = new Set(sEvents.map(e => e.app || e.application)).size;
                const isExpanded = expandedSessionId === session.id;
                const isLive = session.isLive || (isActive && session.id === currentSessionId);
                
                let timeString = '';
                if (session.startTime) {
                  const start = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const end = session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
                  timeString = `${start} – ${end}`;
                }

                return (
                  <div key={session.id} className="bg-surface transition-colors">
                    {/* Session Header */}
                    <div 
                      className={`p-5 flex items-center justify-between cursor-pointer hover:bg-surface-secondary ${isExpanded ? 'bg-surface-secondary' : ''}`}
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-text-muted">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-sm font-bold text-text-primary">Session #{getSessionNumber(session.id)}</h3>
                            {isLive && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span> Recording
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary font-medium">
                            Today · {timeString}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 text-right">
                        <div>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Events</p>
                          <p className="text-sm font-bold text-text-primary">{sEvents.length}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Apps</p>
                          <p className="text-sm font-bold text-text-primary">{uniqueApps}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Expansion */}
                    {isExpanded && renderTimeline(sEvents)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <InspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
