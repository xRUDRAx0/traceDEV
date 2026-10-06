import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Layers, Clock, Zap, FileText, Database, ArrowRight, Bot } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useObservation } from '../context/ObservationContext';
import TraceLogo from '../components/TraceLogo';
import { API_URL } from '../config';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [isGenerating, setIsGenerating] = useState(false);
  const { liveEvents, isActive } = useObservation();

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/dashboard`).then(r => r.json()),
      fetch(`${API_URL}/api/events`).then(r => r.json()),
      fetch(`${API_URL}/api/automations/runs`).then(r => r.json()),
      fetch(`${API_URL}/api/automations`).then(r => r.json())
    ]).then(([d, e, r, a]) => {
      setData(d);
      setEvents(Array.isArray(e) ? e : []);
      setRuns(Array.isArray(r) ? r : []);
      setAutomations(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(e => {
      console.error('Failed to load dashboard data', e);
      setLoading(false);
    });
  }, [liveEvents.length, isActive]);

  // Combine saved events with live events
  const allEvents = useMemo(() => {
    const liveEventIds = new Set(liveEvents.map(e => e.id));
    const filteredSaved = events.filter(e => !liveEventIds.has(e.id));
    return [...filteredSaved, ...liveEvents];
  }, [events, liveEvents]);

  const {
    activitiesToday, activitiesYesterday,
    workflowsDetected, workflowsYesterday,
    timeSavedMs, timeSavedPreviousMs,
    runsCount, runsPreviousCount,
    chartData, recentActivity
  } = useMemo(() => {
    const now = new Date();
    
    const isToday = (d: Date) => d.toDateString() === now.toDateString();
    const isYesterday = (d: Date) => {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return d.toDateString() === y.toDateString();
    };
    const isThisWeek = (d: Date) => {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0,0,0,0);
      return d >= start;
    };
    const isLastWeek = (d: Date) => {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0,0,0,0);
      const end = new Date(now);
      end.setDate(now.getDate() - now.getDay() - 1);
      end.setHours(23,59,59,999);
      return d >= start && d <= end;
    };
    const isThisMonth = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const isLastMonth = (d: Date) => {
      const lm = new Date(now);
      lm.setMonth(now.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    };

    const isInPeriod = (dateStr: string, period: string) => {
      const d = new Date(dateStr);
      if (period === 'Today') return isToday(d);
      if (period === 'This Week') return isThisWeek(d);
      if (period === 'This Month') return isThisMonth(d);
      return true;
    };

    const isInPreviousPeriod = (dateStr: string, period: string) => {
      const d = new Date(dateStr);
      if (period === 'Today') return isYesterday(d);
      if (period === 'This Week') return isLastWeek(d);
      if (period === 'This Month') return isLastMonth(d);
      return false;
    };

    const getRunTimeSaved = (run: any) => {
      // Note: execution runs use startedAt/completedAt but some legacy runs might use startTime/endTime. Handle both.
      const runStatus = run.status?.toLowerCase();
      const endTs = run.completedAt || run.endTime;
      const startTs = run.startedAt || run.startTime;
      if (runStatus !== 'completed' || !endTs) return 0;
      
      const runDurationS = (new Date(endTs).getTime() - new Date(startTs).getTime()) / 1000;
      const auto = automations.find(a => a.id === run.automationId);
      
      const manual = auto?.estimatedManualDuration || (runDurationS * 5);
      const savedS = Math.max(0, manual - runDurationS);
      
      return savedS * 1000; // ms
    };

    const activitiesTodayCount = allEvents.filter(e => isToday(new Date(e.timestamp))).length;
    const activitiesYesterdayCount = allEvents.filter(e => isYesterday(new Date(e.timestamp))).length;

    const workflowsDetectedCount = data?.workflowsDetected || 0;
    
    const periodRuns = runs.filter(r => isInPeriod(r.startTime, timeFilter));
    const previousRuns = runs.filter(r => isInPreviousPeriod(r.startTime, timeFilter));

    const runsCountVal = periodRuns.length;
    const runsPreviousCountVal = previousRuns.length;

    const timeSavedMsVal = periodRuns.reduce((acc, r) => acc + getRunTimeSaved(r), 0);
    const timeSavedPreviousMsVal = previousRuns.reduce((acc, r) => acc + getRunTimeSaved(r), 0);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let cData = days.map(day => ({ name: day, time: 0 }));
    
    periodRuns.forEach(r => {
      if (r.status === 'completed' && r.endTime) {
        const d = new Date(r.endTime);
        const savedMins = getRunTimeSaved(r) / 60000;
        cData[d.getDay()].time += savedMins;
      }
    });

    const recentActivityArr = [...allEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

    return {
      activitiesToday: activitiesTodayCount,
      activitiesYesterday: activitiesYesterdayCount,
      workflowsDetected: workflowsDetectedCount,
      workflowsYesterday: workflowsDetectedCount,
      timeSavedMs: timeSavedMsVal,
      timeSavedPreviousMs: timeSavedPreviousMsVal,
      runsCount: runsCountVal,
      runsPreviousCount: runsPreviousCountVal,
      chartData: cData,
      recentActivity: recentActivityArr
    };
  }, [allEvents, runs, automations, data, timeFilter]);

  if (loading && !data) {
    return <div className="p-8 text-center text-text-secondary text-sm">Loading Dashboard...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-error text-sm">Unable to load dashboard data.<br/><button onClick={() => window.location.reload()} className="mt-2 px-4 py-1 border border-border rounded text-text-primary hover:bg-surface-secondary">Retry</button></div>;
  }

  const formatMs = (ms: number) => {
    if (ms <= 0) return '0m';
    const hrs = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${m}m`;
    return `${m}m`;
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? `↑ 100% vs previous` : 'No previous data';
    const diff = current - previous;
    const pct = Math.round((Math.abs(diff) / previous) * 100);
    return diff >= 0 ? `↑ ${pct}% vs previous` : `↓ ${Math.abs(pct)}% vs previous`;
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleBuildAutomation = async () => {
    if (!data.topOpportunity || !data.aiAnalysis) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/automation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          aiAnalysis: data.aiAnalysis, 
          workflowId: data.topOpportunity.targetWorkflowId 
        })
      });
      const result = await response.json();
      if (result.success) {
        navigate(`/builder?planId=${result.planId}`);
      } else {
        alert('Failed to generate automation plan');
      }
    } catch (e) {
      console.error(e);
      alert('Error generating automation');
    } finally {
      setIsGenerating(false);
    }
  };

  const displayFormattedTime = formatMs(timeSavedMs);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 pt-4 max-w-[1400px] w-full mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Good morning, Rudra. 👋</h1>
          <p className="text-sm text-text-secondary">
            TRACE learns how you work and helps automate repetitive work. 
          </p>
        </div>
        <div className="hidden md:block bg-[#FFF7ED] text-[#EA580C] text-xs font-semibold px-4 py-2 rounded-2xl border border-[#FED7AA]">
          Make today more productive!
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { title: 'ACTIVITIES TODAY', value: activitiesToday, trend: getTrend(activitiesToday, activitiesYesterday), trendLabel: 'vs yesterday', trendColor: activitiesToday >= activitiesYesterday ? 'text-success' : 'text-error', icon: Activity, iconBg: 'bg-[#F0F9FF]', iconColor: 'text-[#0284C7]', onClick: () => navigate('/activity') },
          { title: 'WORKFLOWS DETECTED', value: workflowsDetected, trend: 'No previous data', trendLabel: '', trendColor: 'text-text-muted', icon: Layers, iconBg: 'bg-[#F0FDF4]', iconColor: 'text-[#16A34A]', onClick: () => navigate('/workflows') },
          { title: `TIME SAVED (${timeFilter.toUpperCase()})`, value: displayFormattedTime, trend: getTrend(timeSavedMs, timeSavedPreviousMs), trendLabel: 'vs previous period', trendColor: timeSavedMs >= timeSavedPreviousMs ? 'text-success' : 'text-error', icon: Clock, iconBg: 'bg-[#FFF1F2]', iconColor: 'text-[#E11D48]', onClick: () => navigate('/insights') },
          { title: 'AUTOMATIONS RUN', value: runsCount, trend: getTrend(runsCount, runsPreviousCount), trendLabel: 'vs last week', trendColor: runsCount >= runsPreviousCount ? 'text-success' : 'text-error', icon: Zap, iconBg: 'bg-[#FAF5FF]', iconColor: 'text-[#9333EA]', onClick: () => navigate('/executions') },
        ].map((stat, i) => (
          <div key={i} onClick={stat.onClick} className="solid-card group p-6 cursor-pointer hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">{stat.title}</span>
            </div>
            <h3 className="text-3xl font-bold text-text-primary tracking-tight mb-1">{stat.value}</h3>
            <p className={`text-[11px] font-medium ${stat.trendColor}`}>{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Recent Activity */}
        <div className="solid-card p-6 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Recent Activity</h2>
            <button onClick={() => navigate('/activity')} className="text-xs font-medium text-text-muted hover:text-text-primary transition-colors">View all →</button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-0 relative">
              {recentActivity.length > 0 ? recentActivity.map((act: any, i: number) => {
                let Icon = FileText;
                if (act.app === 'Spreadsheet' || act.application === 'Excel') Icon = Database;
                else if (act.app === 'Gmail') Icon = Zap;

                return (
                  <div key={i} className="flex gap-4 relative pb-5">
                    {i !== recentActivity.length - 1 && (
                      <div className="absolute top-5 left-[23px] bottom-0 w-px bg-[#F1F5F9]"></div>
                    )}
                    
                    <div className="text-[11px] font-medium text-text-muted mt-1 w-12 text-right shrink-0">
                      {formatTime(act.timestamp)}
                      <div className="text-[9px] text-text-muted">PM</div>
                    </div>
                    
                    <div className="w-6 h-6 rounded-full bg-white border border-[#F1F5F9] flex items-center justify-center relative z-10 shrink-0 mt-0.5 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                    </div>
                    
                    <div className="flex-1 flex items-start gap-3 pt-0.5">
                      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-text-muted" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-text-primary">{act.action === 'click' ? `Clicked in ${act.application || 'Chrome'}` : act.action === 'type' ? `Typed in ${act.application || 'Chrome'}` : `Action in ${act.application || 'Chrome'}`}</div>
                        <div className="text-xs text-text-muted truncate mt-0.5">{act.metadata?.elementName || act.metadata?.typedText || act.action}</div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full pt-12">
                  <Activity className="w-8 h-8 text-[#E2E8F0] mb-3" />
                  <div className="text-sm text-text-muted text-center font-medium">No recent activity</div>
                  <div className="text-xs text-text-muted text-center mt-1">Start observation to record events</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Trace Opportunity */}
        <div className="solid-card p-6 flex flex-col h-[420px]">
          <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
            <TraceLogo className="text-xs text-text-primary" /> Opportunity
          </h2>
          
          {data.topOpportunity ? (
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-text-primary mb-1">{data.topOpportunity.name}</h3>
              <p className="text-xs text-text-muted italic mb-5">"TRACE noticed that..."</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-[10px] text-text-muted font-medium uppercase mb-1">Automation</p>
                  <p className="text-2xl font-bold text-[#16A34A]">{data.aiAnalysis?.automationPotential || 85}%</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-[10px] text-text-muted font-medium uppercase mb-1">Repetitions</p>
                  <p className="text-2xl font-bold text-text-primary">{data.topOpportunity.occurrenceCount}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-[10px] text-text-muted font-medium uppercase mb-1">Avg. Time</p>
                  <p className="text-xl font-bold text-text-primary">{Math.max(1, Math.round((data.topOpportunity.averageDurationSeconds || 0)/60))} min</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-4">
                  <p className="text-[10px] text-text-muted font-medium uppercase mb-1">Potential Saving</p>
                  <p className="text-xl font-bold text-[#16A34A]">~{Math.max(1, Math.round((data.topOpportunity.averageDurationSeconds || 0)/60))}m/run</p>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Recommended Action</p>
                <p className="text-xs text-text-secondary">Review deterministic insights and consider manual automation.</p>
                <button 
                  onClick={handleBuildAutomation}
                  disabled={isGenerating}
                  className="w-full py-3 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#1E293B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Building...' : 'Build Automation'}
                </button>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-sm text-text-muted">
                <Bot className="w-8 h-8 text-[#E2E8F0] mb-3" />
                No major opportunities detected yet.
             </div>
          )}
        </div>

        {/* Column 3: Time Saved Overview */}
        <div className="solid-card p-6 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Time Saved Overview</h2>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-white text-xs font-medium text-text-primary border border-[#E2E8F0] outline-none cursor-pointer rounded-lg px-3 py-1.5 focus:border-[#0284C7] transition-colors"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
          </div>
          
          <div className="mb-6">
             <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Total Time Saved</p>
             <h3 className="text-3xl font-bold text-text-primary tracking-tight mb-1">{displayFormattedTime}</h3>
             <p className={`text-[11px] font-medium ${timeSavedMs >= timeSavedPreviousMs ? 'text-success' : 'text-error'}`}>{getTrend(timeSavedMs, timeSavedPreviousMs)}</p>
          </div>

          <div className="flex-1 w-full min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 500}} tickFormatter={(v) => `${Math.round(v)}m`} />
                <XAxis dataKey="name" hide />
                <Tooltip 
                  cursor={{stroke: '#E2E8F0', strokeWidth: 1, strokeDasharray: '4 4'}} 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#F1F5F9', borderRadius: '12px', fontSize: '11px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#0F172A' }}
                />
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Line type="monotone" dataKey="time" stroke="#F59E0B" strokeWidth={2.5} dot={{r: 4, fill: '#FFFFFF', strokeWidth: 2, stroke: '#F59E0B'}} activeDot={{r: 6, fill: '#F59E0B', strokeWidth: 0}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
