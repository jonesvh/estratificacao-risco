import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/Login/Login';
import { DashboardPage } from './pages/Dashboard/Dashboard';
import { QuestionnaireListPage } from './pages/Questionnaires/QuestionnaireList';
import { QuestionnaireDetailPage } from './pages/Questionnaires/QuestionnaireDetail';
import { QuestionnaireNewPage } from './pages/Questionnaires/QuestionnaireNew';
import { QuestionnaireEditPage } from './pages/Questionnaires/QuestionnaireEdit';
import { BeneficiaryListPage } from './pages/Beneficiaries/BeneficiaryList';
import { BeneficiaryDetailPage } from './pages/Beneficiaries/BeneficiaryDetail';
import { ResponseListPage } from './pages/Responses/ResponseList';
import { ResponseApplyPage } from './pages/Responses/ResponseApply';
import { ResponseDetailPage } from './pages/Responses/ResponseDetail';
import { ExportPage } from './pages/Export/Export';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/questionnaires" element={<QuestionnaireListPage />} />
            <Route path="/questionnaires/new" element={<QuestionnaireNewPage />} />
            <Route path="/questionnaires/:id" element={<QuestionnaireDetailPage />} />
            <Route path="/questionnaires/:id/edit" element={<QuestionnaireEditPage />} />
            <Route path="/beneficiaries" element={<BeneficiaryListPage />} />
            <Route path="/beneficiaries/:id" element={<BeneficiaryDetailPage />} />
            <Route path="/responses" element={<ResponseListPage />} />
            <Route path="/responses/apply" element={<ResponseApplyPage />} />
            <Route path="/responses/:id" element={<ResponseDetailPage />} />
            <Route path="/export" element={<ExportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
