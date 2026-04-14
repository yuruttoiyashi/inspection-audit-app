import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthProvider';
import ProtectedRoute from './ProtectedRoute';
import AppShell from './AppShell';

import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import InspectionTargetsPage from '../pages/targets/InspectionTargetsPage';
import InspectionTemplatesPage from '../pages/templates/InspectionTemplatesPage';
import InspectionTemplateItemsPage from '../pages/template-items/InspectionTemplateItemsPage';
import InspectionsPage from '../pages/inspections/InspectionsPage';
import NewInspectionPage from '../pages/inspections/NewInspectionPage';
import InspectionDetailPage from '../pages/inspections/InspectionDetailPage';
import EditInspectionPage from '../pages/inspections/EditInspectionPage';

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/targets" element={<InspectionTargetsPage />} />
            <Route path="/templates" element={<InspectionTemplatesPage />} />
            <Route
              path="/templates/:templateId/items"
              element={<InspectionTemplateItemsPage />}
            />

            <Route path="/inspections" element={<InspectionsPage />} />
            <Route path="/inspections/new" element={<NewInspectionPage />} />
            <Route path="/inspections/:inspectionId" element={<InspectionDetailPage />} />
            <Route
              path="/inspections/:inspectionId/edit"
              element={<EditInspectionPage />}
            />

            <Route path="/inspection-targets" element={<InspectionTargetsPage />} />
            <Route path="/inspection-templates" element={<InspectionTemplatesPage />} />
            <Route
              path="/inspection-templates/:templateId/items"
              element={<InspectionTemplateItemsPage />}
            />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}