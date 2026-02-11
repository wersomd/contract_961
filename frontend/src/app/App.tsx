import React from 'react';
import { Toaster } from '@/app/components/ui/sonner';
import { MainLayout } from '@/app/layouts/main-layout';
import { AuthProvider, useAuth } from '@/context/auth-context';

// Auth pages
import { LoginPage } from '@/app/pages/login-page';
import { ResetPasswordPage } from '@/app/pages/reset-password-page';

// Admin pages
import { DashboardPage } from '@/app/pages/dashboard-page';
import { RequestsListPage } from '@/app/pages/requests-list-page';
import { CreateRequestWizard } from '@/app/pages/create-request-wizard';
import { RequestDetailPage } from '@/app/pages/request-detail-page';
import { ClientsPage } from '@/app/pages/clients-page';
import { SettingsPage } from '@/app/pages/settings-page';
import { AuditLogPage } from '@/app/pages/audit-log-page';

// Client pages
import { ClientViewDocumentPage } from '@/app/pages/client-view-document';
import { ClientEnterCodePage } from '@/app/pages/client-enter-code';
import { ClientSignedSuccessPage } from '@/app/pages/client-signed-success';
import { VerifyPage } from '@/app/pages/verify-page';

type Page =
  | 'login'
  | 'reset-password'
  | 'dashboard'
  | 'requests'
  | 'create-request'
  | 'request-detail'
  | 'clients'
  | 'settings'
  | 'audit'
  | 'client-view'
  | 'client-code'
  | 'client-success'
  | 'verify';

function AppContent() {
  const { user, isLoading, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('dashboard');
  const [darkMode, setDarkMode] = React.useState(false);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string>('');
  const [clientToken, setClientToken] = React.useState<string | null>(null);

  // Check if this is a client signing URL: /client/:token or verify URL: /verify/:verifyToken
  React.useEffect(() => {
    const path = window.location.pathname;
    const clientMatch = path.match(/^\/client\/([a-zA-Z0-9-]+)/);
    const verifyMatch = path.match(/^\/verify\/([a-f0-9]{64})/i); // 64 hex chars
    if (clientMatch) {
      setClientToken(clientMatch[1]);
      setCurrentPage('client-view');
    } else if (verifyMatch) {
      setClientToken(verifyMatch[1]); // Use clientToken to store verifyToken
      setCurrentPage('verify');
    }
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in - show login
  if (!user) {
    if (currentPage === 'reset-password') {
      return (
        <>
          <ResetPasswordPage onBack={() => setCurrentPage('login')} />
          <Toaster />
        </>
      );
    }
    return (
      <>
        <LoginPage
          onLogin={(token, userData) => {
            login(token, userData);
            setCurrentPage('dashboard');
          }}
          onForgotPassword={() => setCurrentPage('reset-password')}
        />
        <Toaster />
      </>
    );
  }

  const handleViewRequest = (id: string) => {
    setSelectedRequestId(id);
    setCurrentPage('request-detail');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('login');
  };

  // Client pages (for signing flow)
  if (currentPage.startsWith('client-')) {
    switch (currentPage) {
      case 'client-view':
        return (
          <>
            <ClientViewDocumentPage
              token={clientToken}
              onSign={() => setCurrentPage('client-code')}
            />
            <Toaster />
          </>
        );
      case 'client-code':
        return (
          <>
            <ClientEnterCodePage
              token={clientToken}
              onSuccess={() => setCurrentPage('client-success')}
              onBack={() => setCurrentPage('client-view')}
            />
            <Toaster />
          </>
        );
      case 'client-success':
        return (
          <>
            <ClientSignedSuccessPage token={clientToken} />
            <Toaster />
          </>
        );
    }
  }

  // Verify page (public)
  if (currentPage === 'verify') {
    return (
      <>
        <VerifyPage token={clientToken || undefined} />
        <Toaster />
      </>
    );
  }

  // Admin pages
  const renderAdminPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onCreateRequest={() => setCurrentPage('create-request')}
            onViewAllRequests={() => setCurrentPage('requests')}
            onViewRequest={handleViewRequest}
          />
        );
      case 'requests':
        return (
          <RequestsListPage
            onCreateRequest={() => setCurrentPage('create-request')}
            onViewRequest={handleViewRequest}
          />
        );
      case 'create-request':
        return (
          <CreateRequestWizard
            onBack={() => setCurrentPage('requests')}
            onComplete={() => setCurrentPage('requests')}
          />
        );
      case 'request-detail':
        return (
          <RequestDetailPage
            requestId={selectedRequestId}
            onBack={() => setCurrentPage('requests')}
          />
        );
      case 'clients':
        return <ClientsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'audit':
        return <AuditLogPage />;
      default:
        return (
          <DashboardPage
            onCreateRequest={() => setCurrentPage('create-request')}
            onViewAllRequests={() => setCurrentPage('requests')}
            onViewRequest={handleViewRequest}
          />
        );
    }
  };

  const currentRoute = currentPage === 'create-request' || currentPage === 'request-detail'
    ? '/requests'
    : currentPage === 'requests'
      ? '/requests'
      : currentPage === 'dashboard'
        ? '/dashboard'
        : currentPage === 'clients'
          ? '/clients'
          : currentPage === 'audit'
            ? '/audit'
            : currentPage === 'settings'
              ? '/settings'
              : '/dashboard';

  return (
    <>
      <MainLayout
        currentPage={currentRoute}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userName={user.name}
      >
        {renderAdminPage()}
      </MainLayout>
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}