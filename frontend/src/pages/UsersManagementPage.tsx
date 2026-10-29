import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiError } from '../services/api';
import {
  Button,
  Card,
  FormField,
  Input,
  Select,
  Modal,
  PageHeader,
} from '../components/ui';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'STAFF';
  is_active: boolean;
  created_at: string;
};

const userApi = {
  list: () => axios.get<{ status: string; data: UserRecord[] }>('/api/v1/users', { withCredentials: true }).then(r => r.data.data),
  create: (data: { name: string; email: string; password?: string; role: string; is_active?: boolean }) => axios.post('/api/v1/users', data, { withCredentials: true }).then(r => r.data),
  update: (id: string, data: { name?: string; email?: string; password?: string; role?: string; is_active?: boolean }) => axios.put(`/api/v1/users/${id}`, data, { withCredentials: true }).then(r => r.data),
  delete: (id: string) => axios.delete(`/api/v1/users/${id}`, { withCredentials: true }).then(r => r.data),
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OWNER' | 'STAFF'>('STAFF');
  const [isActive, setIsActive] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.list();
      setUsers(data);
    } catch (err: unknown) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (u: UserRecord) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setIsActive(u.is_active);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (editingUser) {
        const payload: any = { name, email, role, is_active: isActive };
        if (password.trim()) payload.password = password;
        await userApi.update(editingUser.id, payload);
        setSuccess('Pengguna berhasil diperbarui.');
      } else {
        await userApi.create({ name, email, password, role, is_active: isActive });
        setSuccess('Pengguna baru berhasil ditambahkan.');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus akun pengguna ini?')) return;
    setError(null);
    setSuccess(null);
    try {
      await userApi.delete(id);
      setSuccess('Pengguna berhasil dihapus.');
      loadUsers();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna & Hak Akses"
        description="Kelola akun login sistem: ADMIN, OWNER, dan STAFF beserta status aktifnya."
        action={
          <Button variant="primary" onClick={handleOpenCreate}>
            + Tambah Pengguna Baru
          </Button>
        }
      />

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">{success}</div>}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Memuat daftar pengguna...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Belum ada pengguna terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Nama Lengkap</th>
                  <th className="px-6 py-3 text-left font-semibold">Email / Username</th>
                  <th className="px-6 py-3 text-left font-semibold">Role / Hak Akses</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-raised)] transition">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded font-bold ${
                        u.role === 'OWNER' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                        u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded font-semibold ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="secondary" onClick={() => handleOpenEdit(u)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(u.id)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={showModal}
        title={editingUser ? 'Edit Pengguna Sistem' : 'Tambah Pengguna Baru'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nama Lengkap" required>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Pengguna"
            />
          </FormField>

          <FormField label="Email / Login" required>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sentanu.local"
            />
          </FormField>

          <FormField label={`Password ${editingUser ? '(Kosongkan jika tidak diubah)' : ''}`} required={!editingUser}>
            <Input
              type="password"
              {...(!editingUser ? { required: true } : {})}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role / Hak Akses" required>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OWNER' | 'STAFF')}
              >
                <option value="STAFF">STAFF</option>
                <option value="ADMIN">ADMIN</option>
                <option value="OWNER">OWNER</option>
              </Select>
            </FormField>

            <FormField label="Status Akun" required>
              <Select
                value={isActive ? '1' : '0'}
                onChange={(e) => setIsActive(e.target.value === '1')}
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
