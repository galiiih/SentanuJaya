import { useState, useEffect } from 'react';
import { nanuKnowledgeApi, type NanuKnowledgeBaseRecord, type NanuKnowledgeCandidateRecord } from '../services/api';
import { useAuth } from '../auth';
import { Modal, Input, Select, Textarea, Button, Card } from './ui';
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
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-500" />
            Nanu AI Knowledge Management
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Kelola basis pengetahuan resmi Nanu AI dan tinjau pengajuan koreksi/kandidat dari pengguna.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajukan Knowledge Baru
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => setActiveTab('official')}
          className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'official'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
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
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
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
          <Card className="flex items-center gap-3">
            <Search className="w-5 h-5 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul, pola pertanyaan, atau isi knowledge..."
              value={officialSearch}
              onChange={(e) => setOfficialSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)]"
            />
          </Card>

          {officialLoading ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">Memuat knowledge resmi...</div>
          ) : officialList.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--foreground)] font-medium">Belum ada knowledge resmi yang dipublikasikan.</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Ajukan kandidat atau setujui dari menu review.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officialList.map((item) => (
                <Card key={item.id} className="flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-[var(--foreground)] text-base">{item.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {item.module || 'general'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded mb-3">
                      Q: {item.question_pattern}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-wrap line-clamp-4">
                      {item.content}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex justify-between items-center text-xs text-[var(--muted-foreground)]">
                    <span>Target: {item.audience_role}</span>
                    <span>Dipublikasikan: {new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Candidate Review */}
      {activeTab === 'candidates' && isAdminOrOwner && (
        <div className="space-y-4">
          <Card className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
              <Select
                value={candidateStatusFilter}
                onChange={(e) => setCandidateStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">Total Kandidat: {candidateList.length}</span>
          </Card>

          {candidateLoading ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">Memuat kandidat knowledge...</div>
          ) : candidateList.length === 0 ? (
            <Card className="text-center py-12">
              <ShieldAlert className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--foreground)] font-medium">Tidak ada kandidat knowledge yang ditemukan.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--surface)] text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <th className="p-4 font-semibold">Judul / Modul</th>
                      <th className="p-4 font-semibold">Pertanyaan & Jawaban</th>
                      <th className="p-4 font-semibold">Pengaju</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-[var(--foreground)]">
                    {candidateList.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--surface)] transition">
                        <td className="p-4 align-top">
                          <div className="font-semibold text-[var(--foreground)]">{c.title || 'Kandidat Nanu'}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-mono">
                            {c.module || 'general'}
                          </span>
                        </td>
                        <td className="p-4 align-top max-w-md">
                          <p className="font-medium text-[var(--foreground)] mb-1">Q: {c.question}</p>
                          <p className="text-xs text-[var(--muted-foreground)] bg-[var(--surface)] p-2 rounded line-clamp-3">
                            A: {c.answer}
                          </p>
                        </td>
                        <td className="p-4 align-top text-xs">
                          <div className="font-medium text-[var(--foreground)]">{c.submitter?.name || 'User'}</div>
                          <div className="text-[var(--muted-foreground)]">{new Date(c.created_at).toLocaleDateString('id-ID')}</div>
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
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedCandidate(c)}
                            className="text-xs py-1.5 px-3"
                          >
                            Tinjau / Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal open={!!selectedCandidate} title="Review Kandidat Knowledge" onClose={() => setSelectedCandidate(null)}>
        {selectedCandidate && (
          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-[var(--muted-foreground)] block font-medium">Judul / Modul</span>
              <p className="font-semibold text-[var(--foreground)]">{selectedCandidate.title || 'Tanpa Judul'} ({selectedCandidate.module})</p>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)] block font-medium">Pertanyaan</span>
              <p className="bg-[var(--surface)] p-3 rounded-lg text-[var(--foreground)]">{selectedCandidate.question}</p>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)] block font-medium">Jawaban / Koreksi yang Diajukan</span>
              <p className="bg-[var(--surface)] p-3 rounded-lg text-[var(--foreground)] whitespace-pre-wrap">{selectedCandidate.answer}</p>
            </div>
            <div>
              <label className="text-xs text-[var(--muted-foreground)] block font-medium mb-1">Catatan Reviewer (Opsional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Tambahkan catatan alasan approval / rejection..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedCandidate(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={reviewing}
                onClick={() => handleReview('rejected')}
                className="flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Tolak (Reject)
              </Button>
              <Button
                type="button"
                variant="success"
                loading={reviewing}
                onClick={() => handleReview('approved')}
                className="flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                Setujui (Approve)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit New Candidate Modal */}
      <Modal open={showSubmitModal} title="Ajukan Kandidat Knowledge Baru" onClose={() => setShowSubmitModal(false)}>
        <form onSubmit={handleManualSubmit} className="space-y-4 text-sm">
          {submitError && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg">{submitError}</div>}
          {submitSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg">{submitSuccess}</div>}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Judul Pengetahuan</label>
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Cara Input Material Baru"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Modul Terkait</label>
            <Select
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
            >
              <option value="general">General</option>
              <option value="materials">Materials & Inventory</option>
              <option value="customer-po">Customer PO</option>
              <option value="delivery">Surat Jalan / Delivery</option>
              <option value="invoicing">Invoicing & Billing</option>
              <option value="production">Production</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Pertanyaan / Topik *</label>
            <Input
              type="text"
              required
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Contoh: Bagaimana cara membuat customer po baru?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Jawaban / Panduan Resmi *</label>
            <Textarea
              required
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Tuliskan langkah-langkah atau panduan yang akurat..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSubmitModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Kirim Kandidat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
