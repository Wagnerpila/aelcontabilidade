import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Mensagens from './pages/Mensagens';
import Empresas from './pages/Empresas';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import Register from './pages/Register';
import GerenciamentoTarefas from './pages/GerenciamentoTarefas';
import OnboardingGuard from '@/components/OnboardingGuard';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Rotas públicas: não dependem de autenticação
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    navigateToLogin();
    return null;
  }

  return (
    <Routes>
      {/* Onboarding — sem layout, sem guard */}
      <Route path="/Onboarding" element={<Onboarding />} />

      {/* Rotas protegidas pelo OnboardingGuard */}
      <Route path="/" element={
        <OnboardingGuard>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </OnboardingGuard>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <OnboardingGuard>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </OnboardingGuard>
          }
        />
      ))}
      <Route path="/Mensagens" element={
        <OnboardingGuard>
          <LayoutWrapper currentPageName="Mensagens"><Mensagens /></LayoutWrapper>
        </OnboardingGuard>
      } />
      <Route path="/Empresas" element={
        <OnboardingGuard>
          <LayoutWrapper currentPageName="Empresas"><Empresas /></LayoutWrapper>
        </OnboardingGuard>
      } />
      <Route path="/GerenciamentoTarefas" element={
        <OnboardingGuard>
          <LayoutWrapper currentPageName="GerenciamentoTarefas"><GerenciamentoTarefas /></LayoutWrapper>
        </OnboardingGuard>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App