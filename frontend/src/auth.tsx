// oxlint-disable react/only-export-components
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, apiError, type ApiUser } from './services/api';

export const roles = ['ADMIN', 'OWNER', 'STAFF'] as const;
export type Role = typeof roles[number];

export const permissions = {
  dashboardView: 'dashboard.view',
  custodyView: 'custody.view',
  materialView: 'material.view',
  deliveryView: 'delivery.view',
  deliveryCreate: 'delivery.create',
  acceptanceView: 'acceptance.view',
  acceptanceCreate: 'acceptance.create',
  acceptanceSubmit: 'acceptance.submit',
  acceptancePost: 'acceptance.post',
  invoiceView: 'invoice.view',
  invoiceCreate: 'invoice.create',
  invoiceApprove: 'invoice.approve',
  paymentView: 'payment.view',
  paymentCreate: 'payment.create',
  poView: 'po.view',
  poCreate: 'po.create',
  poEdit: 'po.edit',
  poActivate: 'po.activate',
  poCancel: 'po.cancel',
  poClose: 'po.close',
} as const;
export type Permission = typeof permissions[keyof typeof permissions];

const rolePermissions: Record<Role, readonly Permission[]> = {
  ADMIN: Object.values(permissions).filter((permission) => permission !== permissions.invoiceApprove),
  OWNER: [permissions.dashboardView, permissions.custodyView, permissions.invoiceView, permissions.invoiceCreate, permissions.invoiceApprove, permissions.paymentView, permissions.paymentCreate, permissions.poView, permissions.poCreate, permissions.poEdit, permissions.poActivate, permissions.poCancel, permissions.poClose, permissions.deliveryView, permissions.deliveryCreate, permissions.acceptanceView, permissions.acceptanceCreate, permissions.acceptanceSubmit, permissions.acceptancePost],
  STAFF: [permissions.dashboardView, permissions.custodyView, permissions.materialView, permissions.deliveryView, permissions.deliveryCreate, permissions.acceptanceView, permissions.poView, permissions.poCreate, permissions.poEdit],
};

export type User = ApiUser & { role: Role; permissions: readonly Permission[] };

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => User | null;
  hasPermission: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function asUser(apiUser: ApiUser): User {
  if (!roles.includes(apiUser.role as Role)) throw new Error('Role pengguna tidak valid.');
  const role = apiUser.role as Role;
  return { ...apiUser, role, permissions: rolePermissions[role] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    authApi.me().then((apiUser) => setUser(asUser(apiUser))).catch(() => setUser(null)).finally(() => setChecked(true));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady: checked,
    isAuthenticated: user !== null,
    login: async (email, password) => {
      try { setUser(asUser(await authApi.login(email, password))); }
      catch (error) { throw new Error(apiError(error)); }
    },
    logout: async () => {
      try { await authApi.logout(); } finally { setUser(null); }
    },
    getCurrentUser: () => user,
    hasPermission: (permission) => user?.permissions.includes(permission) ?? false,
  }), [checked, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
