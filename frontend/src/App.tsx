import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/shared/error-boundary';

// Pages
import { LandingPage } from '@/features/landing/landing-page';
import { LoginPage } from '@/features/auth/login-page';
import { SignupPage } from '@/features/auth/signup-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { UploadPage } from '@/features/calls/upload-page';
import { CallsListPage } from '@/features/calls/calls-list-page';
import { CallDetailPage } from '@/features/calls/call-detail-page';
import { PracticePage } from '@/features/practice/practice-page';
import { StoriesPage } from '@/features/stories/stories-page';
import { SettingsPage } from '@/features/settings/settings-page';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Authenticated routes */}
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="calls" element={<CallsListPage />} />
                <Route path="calls/:callId" element={<CallDetailPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="practice" element={<PracticePage />} />
                <Route path="stories" element={<StoriesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryProvider>

      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '!bg-card !text-card-foreground !border !border-border !shadow-xl !rounded-xl !text-sm',
          duration: 4000,
        }}
      />
    </ErrorBoundary>
  );
}
