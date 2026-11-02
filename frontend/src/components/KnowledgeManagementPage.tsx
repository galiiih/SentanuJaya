import { useState, useEffect } from 'react';
import { nanuKnowledgeApi, type NanuKnowledgeBaseRecord, type NanuKnowledgeCandidateRecord } from '../services/api';
import { useAuth } from '../auth';
import { BookOpen, CheckCircle, XCircle, Search, Plus, ShieldAlert, Sparkles, Filter } from 'lucide-react';

export function KnowledgeManagementPage() {
  const { user } = useAuth();
  const isAdminOrOwner = ['ADMIN', 'OWNER', 'DEV'].includes(user?.role || '');

  const [activeTab, setActiveTab] = useState<'official' | 'candidates'>('official');
  
  // Official Knowledge state
  const [officialList, setOfficialList] = useState<NanuKnowledgeBaseRecord[]>([]);
  const [officialSearch, setOfficialSearch] = useState('');
  const [officialLoading, setOfficialLoading] = useState(false);

  // Candidates state
  const [candidateList, setCandidateList] = useState<NanuKnowledgeCandidateRecord[]>([]);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('');
  const [candidateLoading, setCandidateLoading] = useState(false);

  // Review Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<NanuKnowledgeCandidateRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Submit Candidate Modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newModule, setNewModule] = useState('general');
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (activeTab === 'official') {
      fetchOfficial();
    } else if (activeTab === 'candidates' && isAdminOrOwner) {
      fetchCandidates();
    }
  }, [activeTab, officialSearch, candidateStatusFilter]);

  const fetchOfficial = async () => {
    setOfficialLoading(true);
    try {
      const res = await nanuKnowledgeApi.listOfficial({ search: officialSearch });
      setOfficialList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch official knowledge', err);
    } finally {
      setOfficialLoading(false);
    }
  };

  const fetchCandidates = async () => {
    setCandidateLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (candidateStatusFilter) params.status = candidateStatusFilter;
      const res = await nanuKnowledgeApi.listCandidates(params);
      setCandidateList(res.data || []);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedCandidate) return;
    setReviewing(true);
    try {
      await nanuKnowledgeApi.reviewCandidate(selectedCandidate.id, {
        status,
        reviewer_notes: reviewNotes,
      });
      setSelectedCandidate(null);
      setReviewNotes('');
      fetchCandidates();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal melakukan review kandidat.');
    } finally {
      setReviewing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion || !newAnswer) {
      setSubmitError('Pertanyaan dan jawaban wajib diisi.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      await nanuKnowledgeApi.storeCandidate({
        question: newQuestion,
        answer: newAnswer,
        module: newModule,
        title: newTitle || undefined,
      });
      setSubmitSuccess('Kandidat knowledge berhasil diajukan untuk ditinjau.');
      setNewQuestion('');
      setNewAnswer('');
      setNewTitle('');
      setTimeout(() => {
        setShowSubmitModal(false);
        setSubmitSuccess('');
        if (activeTab === 'candidates') fetchCandidates();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || 'Gagal mengajukan kandidat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-500" />
            Nanu AI Knowledge Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola basis pengetahuan resmi Nanu AI dan tinjau pengajuan koreksi/kandidat dari pengguna.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ajukan Knowledge Baru
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('official')}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'official'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Official Knowledge Base ({officialList.length})
        </button>
        {isAdminOrOwner && (
          <button
            onClick={() => setActiveTab('candidates')}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Review Kandidat ({candidateList.length})
          </button>
        )}
      </div>

      {/* Tab 1: Official Knowledge */}
      {activeTab === 'official' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul, pola pertanyaan, atau isi knowledge..."
              value={officialSearch}
              onChange={(e) => setOfficialSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-sm placeholder:text-slate-400"
            />
          </div>

          {officialLoading ? (
            <div className="text-center py-12 text-slate-500">Memuat knowledge resmi...</div>
          ) : officialList.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada knowledge resmi yang dipublikasikan.</p>
              <p className="text-sm text-slate-400 mt-1">Ajukan kandidat atau setujui dari menu review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officialList.map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base">{item.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {item.module || 'general'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded mb-3">
                      Q: {item.question_pattern}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-4">
                      {item.content}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
                    <span>Target: {item.audience_role}</span>
                    <span>Dipublikasikan: {new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Candidate Review */}
      {activeTab === 'candidates' && isAdminOrOwner && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg px-3 py-2 outline-none"
              >
                <option value="">Semua Status</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <span className="text-xs text-slate-500">Total Kandidat: {candidateList.length}</span>
          </div>

          {candidateLoading ? (
            <div className="text-center py-12 text-slate-500">Memuat kandidat knowledge...</div>
          ) : candidateList.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Tidak ada kandidat knowledge yang ditemukan.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 font-semibold">Judul / Modul</th>
                      <th className="p-4 font-semibold">Pertanyaan & Jawaban</th>
                      <th className="p-4 font-semibold">Pengaju</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {candidateList.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="p-4 align-top">
                          <div className="font-semibold text-slate-900 dark:text-white">{c.title || 'Kandidat Nanu'}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-mono">
                            {c.module || 'general'}
                          </span>
                        </td>
                        <td className="p-4 align-top max-w-md">
                          <p className="font-medium text-slate-900 dark:text-white mb-1">Q: {c.question}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded line-clamp-3">
                            A: {c.answer}
                          </p>
                        </td>
                        <td className="p-4 align-top text-xs">
                          <div className="font-medium text-slate-900 dark:text-white">{c.submitter?.name || 'User'}</div>
                          <div className="text-slate-400">{new Date(c.created_at).toLocaleDateString('id-ID')}</div>
                        </td>
                        <td className="p-4 align-top">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                            c.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : c.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 align-top text-right">
                          <button
                            onClick={() => setSelectedCandidate(c)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-medium transition"
                          >
                            Tinjau / Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Review Kandidat Knowledge
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Judul / Modul</span>
                <p className="font-semibold text-slate-900 dark:text-white">{selectedCandidate.title || 'Tanpa Judul'} ({selectedCandidate.module})</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Pertanyaan</span>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-slate-800 dark:text-slate-200">{selectedCandidate.question}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Jawaban / Koreksi yang Diajukan</span>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedCandidate.answer}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 block font-medium mb-1">Catatan Reviewer (Opsional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Tambahkan catatan alasan approval / rejection..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReview('rejected')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Tolak (Reject)
              </button>
              <button
                type="button"
                disabled={reviewing}
                onClick={() => handleReview('approved')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Setujui (Approve)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit New Candidate Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500" />
              Ajukan Kandidat Knowledge Baru
            </h2>
            <form onSubmit={handleManualSubmit} className="space-y-4 text-sm">
              {submitError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{submitError}</div>}
              {submitSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg">{submitSuccess}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Judul Pengetahuan</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Cara Input Material Baru"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Modul Terkait</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none"
                >
                  <option value="general">General</option>
                  <option value="materials">Materials & Inventory</option>
                  <option value="customer-po">Customer PO</option>
                  <option value="delivery">Surat Jalan / Delivery</option>
                  <option value="invoicing">Invoicing & Billing</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Pertanyaan / Topik *</label>
                <input
                  type="text"
                  required
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Contoh: Bagaimana cara membuat customer po baru?"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Jawaban / Panduan Resmi *</label>
                <textarea
                  required
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Tuliskan langkah-langkah atau panduan yang akurat..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Kandidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
