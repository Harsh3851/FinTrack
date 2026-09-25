import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { LoginInput, RegisterInput, User } from '@fintrack/shared';
import { dataSource } from '../data';
import { HttpClient } from '../data/http/client';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: User | null;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  loginDemo(): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;
    dataSource.auth
      .restore()
      .catch(() => null)
      .then((restored) => {
        if (!active) return;
        setUser(restored);
        setStatus(restored ? 'authenticated' : 'anonymous');
      });
    const client = (dataSource as { client?: unknown }).client;
    const unsubscribe =
      client instanceof HttpClient
        ? client.onSessionExpired(() => {
            setUser(null);
            setStatus('anonymous');
            queryClient.clear();
          })
        : undefined;
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [queryClient]);

  const signIn = useCallback(
    (next: User) => {
      queryClient.clear();
      setUser(next);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (input) => signIn((await dataSource.auth.login(input)).user),
      register: async (input) => signIn((await dataSource.auth.register(input)).user),
      loginDemo: async () => signIn((await dataSource.auth.demo()).user),
      logout: async () => {
        await dataSource.auth.logout();
        queryClient.clear();
        setUser(null);
        setStatus('anonymous');
      },
    }),
    [status, user, signIn, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
