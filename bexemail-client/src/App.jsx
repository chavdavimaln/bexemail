import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CampaignsList from './pages/CampaignsList';
import CampaignWizard from './pages/CampaignWizard';
import TemplatesList from './pages/TemplatesList';
import TemplateEditor from './pages/TemplateEditor';
import Contacts from './pages/Contacts';
import TargetLists from './pages/TargetLists';
import BulkImportPage from './modules/bulk-import/pages/BulkImportPage';
import ImportHistoryPage from './modules/bulk-import/pages/ImportHistoryPage';
import CampaignReport from './pages/CampaignReport';
import PreferenceCenter from './pages/PreferenceCenter';
import Settings from './pages/Settings';
import SubscriptionForms from './pages/SubscriptionForms';
import SubscriberForms from './modules/forms/SubscriberForms';
import DeveloperAPI from './pages/DeveloperAPI';
import HistoryLogs from './pages/HistoryLogs';
import Profile from './pages/Profile';
import Profiles from './pages/Profiles';
import Login from './pages/Login';
import { AutomationProvider, AutomationRoutes } from './modules/automations';
import AutomationErrorBoundary from './modules/automations/components/AutomationErrorBoundary';
import { NotificationProvider } from './components/NotificationContext';
import ExportPanel from './pages/ExportPanel';
import BackupRestore from './pages/BackupRestore'; // HMR trigger to resolve new files
import axios from 'axios';

// Keep relative API requests on the API server while running the Vite client.
// In production, Nginx proxies /api requests on the current origin.
axios.defaults.baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : undefined);

// Global Axios Interceptor for JWT
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

axios.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Optionally trigger a logout if token expires
    // localStorage.removeItem('isAuthenticated');
    // localStorage.removeItem('token');
    // window.location.href = '/login';
  }
  return Promise.reject(error);
});

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import { ModalProvider } from './context/ModalContext';

import BackupsAndHistory from './pages/BackupsAndHistory';

function App() {
  return (
    <ModalProvider>
      <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="campaigns" element={<CampaignsList />} />
            <Route path="campaigns/new" element={<CampaignWizard />} />
            <Route path="create-campaign" element={<CampaignWizard />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="contacts/bulk-import" element={<BulkImportPage />} />
            <Route path="contacts/import-logs" element={<ImportHistoryPage />} />
            <Route path="contacts/export" element={<ExportPanel />} />
            <Route path="contacts/backup" element={<Navigate to="/backups" replace />} />
            <Route path="backups" element={<BackupsAndHistory initialTab="management" />} />
            <Route path="backups/schedules" element={<BackupsAndHistory initialTab="schedules" />} />
            <Route path="lists" element={<TargetLists />} />
            <Route path="templates" element={<TemplatesList />} />
            <Route path="templates/new" element={<TemplateEditor />} />
            <Route path="templates/:id/edit" element={<TemplateEditor />} />
            <Route path="reports" element={<CampaignReport />} />
            <Route path="reports/:id" element={<CampaignReport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/system" element={<Settings />} />
            <Route path="settings/api-access" element={<DeveloperAPI />} />
            <Route path="automations/*" element={
              <AutomationErrorBoundary>
                <AutomationProvider>
                  <AutomationRoutes />
                </AutomationProvider>
              </AutomationErrorBoundary>
            } />
            <Route path="integrations" element={<SubscriptionForms />} />
            <Route path="forms" element={<SubscriberForms />} />
            <Route path="developer" element={<DeveloperAPI />} />
            <Route path="history" element={<BackupsAndHistory initialTab="history" />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profiles" element={<Profiles />} />
            {/* Add more routes here later */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Public Routes */}
          <Route path="/preferences/:id" element={<PreferenceCenter />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  </ModalProvider>
  );
}

export default App;
