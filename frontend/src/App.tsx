import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Recorder from './pages/Recorder';
import ActivityPage from './pages/Activity';
import Workflows from './pages/Workflows';
import AutomationsList from './pages/AutomationsList';
import ExecutionsList from './pages/ExecutionsList';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import Builder from './pages/Builder';
import Execution from './pages/Execution';
import Analytics from './pages/Analytics';
import Analysis from './pages/Analysis';
import AgentView from './pages/AgentView';
import ShowcaseLanding from './pages/ShowcaseLanding';
import ShowcaseExecution from './pages/ShowcaseExecution';
import ShowcaseInbox from './pages/ShowcaseInbox';
import { ObservationProvider } from './context/ObservationContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <ObservationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="automations" element={<AutomationsList />} />
              <Route path="executions" element={<ExecutionsList />} />
              <Route path="recorder" element={<Recorder />} />
              <Route path="analysis" element={<Analysis />} />
              <Route path="agent-view" element={<AgentView />} />
              <Route path="showcase" element={<ShowcaseLanding />} />
              <Route path="showcase/run/:scenarioId" element={<ShowcaseExecution />} />
              <Route path="showcase/inbox" element={<ShowcaseInbox />} />
              <Route path="builder" element={<Builder />} />
              <Route path="execute/:runId" element={<Execution />} />
              <Route path="insights" element={<Insights />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ObservationProvider>
    </ThemeProvider>
  );
}

export default App;
