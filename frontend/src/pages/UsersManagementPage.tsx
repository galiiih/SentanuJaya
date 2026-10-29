import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiError } from '../services/api';

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Pengguna & Hak Akses</h1>
          <p className="text-sm text-slate-600">Kelola akun login sistem: ADMIN, OWNER, dan STAFF beserta status aktifnya.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 font-medium text-sm transition"
        >
          + Tambah Pengguna Baru
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">{success}</div>}

      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat daftar pengguna...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada pengguna terdaftar.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Nama Lengkap</th>
                <th className="px-6 py-3 text-left">Email / Username</th>
                <th className="px-6 py-3 text-left">Role / Hak Akses</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded font-bold ${
                      u.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded font-semibold ${
                      u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-medium text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition font-medium text-xs"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingUser ? 'Edit Pengguna Sistem' : 'Tambah Pengguna Baru'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nama Pengguna"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Login</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="admin@sentanu.local"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password {editingUser && '(Kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  {...(!editingUser ? { required: true } : {})}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Hak Akses</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMIN' | 'OWNER' | 'STAFF')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={isActive ? '1' : '0'}
                    onChange={(e) => setIsActive(e.target.value === '1')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
