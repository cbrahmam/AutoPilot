import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import NewTaskPage from './pages/NewTaskPage';
import TaskDetailPage from './pages/TaskDetailPage';
import HistoryPage from './pages/HistoryPage';
import TemplatesPage from './pages/TemplatesPage';
import StatsPage from './pages/StatsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<NewTaskPage />} />
          <Route path="/task/:taskId" element={<TaskDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
