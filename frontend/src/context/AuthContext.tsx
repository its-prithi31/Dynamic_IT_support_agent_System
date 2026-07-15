import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Role } from '../data/mockData';
import { fetchCurrentUser, loginUser, registerUser } from '../services/api';

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleLabel = (role: string): Role => role.toLowerCase() === 'admin' ? 'Admin' : role.toLowerCase().includes('technician') ? 'IT Technician' : 'Employee';
const toUser = (value: { id: number | string; name: string; email: string; role: string }): User => ({ ...value, id: String(value.id), role: roleLabel(value.role) });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedUser = localStorage.getItem('aegis-user');
  const [user, setUser] = useState<User | null>(storedUser ? JSON.parse(storedUser) : null);

  useEffect(() => {
    if (!localStorage.getItem('aegis-access-token')) return;
    void fetchCurrentUser().then((value) => { const next = toUser(value); setUser(next); localStorage.setItem('aegis-user', JSON.stringify(next)); }).catch(() => localStorage.removeItem('aegis-access-token'));
  }, []);

  const login = async (email: string, password: string) => {
    const session = await loginUser(email, password);
    localStorage.setItem('aegis-access-token', session.access_token);
    localStorage.setItem('aegis-refresh-token', session.refresh_token);
    const next = toUser(await fetchCurrentUser()); setUser(next); localStorage.setItem('aegis-user', JSON.stringify(next));
  };

  const register = async (name: string, email: string, password: string, _role: Role) => {
    await registerUser(name, email, password);
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('aegis-user');
    localStorage.removeItem('aegis-access-token');
    localStorage.removeItem('aegis-refresh-token');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
