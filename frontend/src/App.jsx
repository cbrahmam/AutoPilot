import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import MobileGate from './components/MobileGate';
import ToastContainer from './components/Toast';
import NewTaskPage from './pages/NewTaskPage';
import TaskDetailPage from './pages/TaskDetailPage';
import HistoryPage from './pages/HistoryPage';
import TemplatesPage from './pages/TemplatesPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import DemoReplayPage from './pages/DemoReplayPage';

export default function App() {
  return (
    <ErrorBoundary>
      <MobileGate>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<NewTaskPage />} />
              <Route path="/task/:taskId" element={<TaskDetailPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/demo/:demoId" element={<DemoReplayPage />} />
            </Routes>
          </Layout>
          <ToastContainer />
        </BrowserRouter>
      </MobileGate>
    </ErrorBoundary>
  );
}
