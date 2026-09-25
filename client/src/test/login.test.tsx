import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { GuestOnly, RequireAuth } from '../auth/RouteGuards';
import { LoginPage } from '../pages/LoginPage';
import { renderWithProviders } from './utils';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<p>Dashboard for signed-in user</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

describe('Login flow (demo mode)', () => {
  it('redirects anonymous users to the login page', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText(/Demo mode — data is stored in your browser/)).toBeInTheDocument();
  });

  it('validates the form and reports wrong credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'nobody@example.com');
    await user.type(screen.getByLabelText('Password'), 'whatever1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  it('signs in with the one-click demo account', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });
    await user.click(await screen.findByRole('button', { name: /Try the demo account/ }));
    expect(
      await screen.findByText('Dashboard for signed-in user', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
