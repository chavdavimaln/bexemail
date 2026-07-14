import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CampaignsList from './pages/CampaignsList';
import CampaignWizard from './pages/CampaignWizard';
import TemplatesList from './pages/TemplatesList';
import TemplateEditor from './pages/TemplateEditor';
import Contacts from './pages/Contacts';
import CampaignReport from './pages/CampaignReport';
import PreferenceCenter from './pages/PreferenceCenter';
import Settings from './pages/Settings';
import AutomationsList from './pages/AutomationsList';
import AutomationBuilder from './pages/AutomationBuilder';
import SubscriptionForms from './pages/SubscriptionForms';
import DeveloperAPI from './pages/DeveloperAPI';
import { NotificationProvider } from './components/NotificationContext';

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="campaigns" element={<CampaignsList />} />
            <Route path="campaigns/new" element={<CampaignWizard />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="templates" element={<TemplatesList />} />
            <Route path="templates/new" element={<TemplateEditor />} />
            <Route path="templates/:id/edit" element={<TemplateEditor />} />
            <Route path="reports/:id" element={<CampaignReport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="automations" element={<AutomationsList />} />
            <Route path="automations/new" element={<AutomationBuilder />} />
            <Route path="integrations" element={<SubscriptionForms />} />
            <Route path="developer" element={<DeveloperAPI />} />
            {/* Add more routes here later */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Public Routes */}
          <Route path="/preferences/:id" element={<PreferenceCenter />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
