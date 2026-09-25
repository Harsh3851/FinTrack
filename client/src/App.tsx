import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthContext';
import { GuestOnly, RequireAuth } from './auth/RouteGuards';
import { ThemeProvider, useTheme } from './lib/theme';
import { ApiError } from './lib/errors';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TransactionDialogProvider } from './components/TransactionDialog';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Client errors (validation, auth, not found) will not succeed on retry.
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      },
    },
  });
}

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 3500 }}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route
          element={
            <TransactionDialogProvider>
              <AppLayout />
            </TransactionDialogProvider>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

const queryClient = createQueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {/* HashRouter keeps deep links working on static GitHub Pages hosting. */}
          <HashRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </HashRouter>
          <ThemedToaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
