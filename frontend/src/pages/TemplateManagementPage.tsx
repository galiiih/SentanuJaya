import React, { useEffect, useState } from 'react';
import { documentTemplateApi, apiError } from '../services/api';
import type { DocumentTemplateRecord } from '../services/api';
import VisualEditorModal from '../components/VisualEditorModal';

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<DocumentTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoice' | 'surat_jalan'>('invoice');

  // Modal / Editor state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<'invoice' | 'surat_jalan'>('invoice');
  const [uploadFormat, setUploadFormat] = useState<'html' | 'docx' | 'xlsx'>('html');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadContent, setUploadContent] = useState('');

  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateRecord | null>(null);
  const [visualTemplate, setVisualTemplate] = useState<DocumentTemplateRecord | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentTemplateApi.list();
      setTemplates(res.data);
    } catch (err: unknown) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append('name', uploadName);
      formData.append('document_type', uploadType);
      formData.append('format', uploadFormat);
      if (uploadFile) formData.append('file', uploadFile);
      if (uploadContent) formData.append('content', uploadContent);

      await documentTemplateApi.create(formData);
      setSuccessMsg('Template berhasil diunggah/dibuat.');
      setShowUploadModal(false);
      setUploadName('');
      setUploadFile(null);
      setUploadContent('');
      loadTemplates();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  const handleOpenEditor = (tpl: DocumentTemplateRecord) => {
    setEditingTemplate(tpl);
    setEditName(tpl.name);
    setEditContent(tpl.content || '');
    setPreviewHtml(tpl.content || '<p>Tidak ada konten HTML.</p>');
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await documentTemplateApi.update(editingTemplate.id, {
        name: editName,
        content: editContent,
      });
      setSuccessMsg('Template berhasil diperbarui.');
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  const handleActivate = async (id: number) => {
    if (!confirm('Aktifkan template ini sebagai template utama?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await documentTemplateApi.activate(id);
      setSuccessMsg('Template berhasil diaktifkan.');
      loadTemplates();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus template draft ini?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await documentTemplateApi.delete(id);
      setSuccessMsg('Template berhasil dihapus.');
      loadTemplates();
    } catch (err: unknown) {
      setError(apiError(err));
    }
  };

  const filteredTemplates = templates.filter((t) => t.document_type === activeTab);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Template & HTML Editor</h1>
          <p className="text-sm text-slate-600">Kelola template cetak Surat Jalan dan Invoice dengan editor HTML aman & sinkronisasi ERP.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 font-medium text-sm transition"
        >
          + Unggah / Buat Template
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}
      {successMsg && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">{successMsg}</div>}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('invoice')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'invoice' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Template Invoice ({templates.filter((t) => t.document_type === 'invoice').length})
        </button>
        <button
          onClick={() => setActiveTab('surat_jalan')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'surat_jalan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Template Surat Jalan ({templates.filter((t) => t.document_type === 'surat_jalan').length})
        </button>
      </div>

      {/* Templates Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Memuat template...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada template untuk kategori ini.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3 text-left">Nama Template</th>
                <th className="px-6 py-3 text-left">Format</th>
                <th className="px-6 py-3 text-left">Versi</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTemplates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {tpl.name}
                    {tpl.is_active && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 uppercase text-xs font-bold text-slate-600">{tpl.format}</td>
                  <td className="px-6 py-4 text-slate-600">v{tpl.version}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded font-semibold ${
                        tpl.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tpl.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {tpl.format === 'html' && (
                      <>
                        <button
                          onClick={() => setVisualTemplate(tpl)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition font-medium"
                        >
                          Visual Editor
                        </button>
                        <button
                          onClick={() => handleOpenEditor(tpl)}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition font-medium"
                        >
                          HTML Editor
                        </button>
                      </>
                    )}
                    {!tpl.is_active && (
                      <button
                        onClick={() => handleActivate(tpl.id)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition font-medium"
                      >
                        Aktifkan
                      </button>
                    )}
                    {!tpl.is_active && (
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition font-medium"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-none flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Unggah / Buat Template Baru</h2>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Template</label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Contoh: Template Invoice Standar"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Dokumen</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as 'invoice' | 'surat_jalan')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="surat_jalan">Surat Jalan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Format</label>
                  <select
                    value={uploadFormat}
                    onChange={(e) => setUploadFormat(e.target.value as 'html' | 'docx' | 'xlsx')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="html">HTML</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                  </select>
                </div>
              </div>

              {uploadFormat === 'html' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Konten HTML (Opsional jika unggah file)</label>
                  <textarea
                    rows={5}
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                    placeholder="<html><body>...</body></html>"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">File Template (Opsional)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HTML Editor Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-none flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">HTML Source Editor: {editingTemplate.name}</h2>
                <p className="text-xs text-slate-600">Versi saat ini: v{editingTemplate.version} | Format: HTML</p>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 grid grid-cols-2 divide-x divide-slate-200 overflow-hidden">
              {/* Code editor pane */}
              <div className="flex flex-col p-4 space-y-3 bg-slate-900 text-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-400">HTML Source Code</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    setPreviewHtml(e.target.value);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded p-3 font-mono text-xs text-emerald-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Sandboxed iframe preview pane */}
              <div className="flex flex-col p-4 space-y-3 bg-slate-100">
                <span className="text-xs font-semibold text-slate-600">Live Sandboxed Preview</span>
                <div className="flex-1 bg-white border border-slate-300 rounded shadow-inner overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    sandbox="allow-same-origin"
                    title="Template Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-100 font-medium"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow"
              >
                Simpan Perubahan (v{editingTemplate.version + 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {visualTemplate && (
        <VisualEditorModal
          template={visualTemplate}
          onClose={() => setVisualTemplate(null)}
          onSaved={() => {
            setVisualTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}
