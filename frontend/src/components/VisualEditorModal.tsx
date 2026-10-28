import { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { documentTemplateApi, apiError } from '../services/api';
import type { DocumentTemplateRecord } from '../services/api';

interface VisualEditorModalProps {
  template: DocumentTemplateRecord;
  onClose: () => void;
  onSaved: () => void;
}

export default function VisualEditorModal({ template, onClose, onSaved }: VisualEditorModalProps) {
  const editorRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template.format !== 'html') return;

    const editor = grapesjs.init({
      container: '#gjs-editor-container',
      height: '100%',
      width: 'auto',
      storageManager: false,
      panels: { defaults: [] },
      blockManager: {
        blocks: [
          {
            id: 'section',
            label: 'Section / Container',
            category: 'Layout',
            content: '<section style="padding: 20px; border: 1px dashed #ccc;"><p>Container Section</p></section>',
          },
          {
            id: 'text',
            label: 'Text',
            category: 'Basic',
            content: '<p>Teks placeholder atau keterangan dokumen...</p>',
          },
          {
            id: 'heading',
            label: 'Heading',
            category: 'Basic',
            content: '<h1>Judul Dokumen</h1>',
          },
          {
            id: 'table',
            label: 'Tabel Item',
            category: 'Business',
            content: `
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Item / Deskripsi</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Qty</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Harga Satuan</th>
                    <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">{{item_name}}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">{{quantity}}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">{{unit_price}}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">{{total_price}}</td>
                  </tr>
                </tbody>
              </table>
            `,
          },
        ],
      },
    });

    editorRef.current = editor;

    if (template.gjs_project) {
      try {
        const projectData = JSON.parse(template.gjs_project);
        editor.loadProjectData(projectData);
      } catch (e) {
        if (template.content) {
          editor.setComponents(template.content);
        }
      }
    } else if (template.content) {
      editor.setComponents(template.content);
    }

    if (template.css) {
      editor.setStyle(template.css);
    }

    return () => {
      editor.destroy();
    };
  }, [template]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const editor = editorRef.current;
      const html = editor.getHtml();
      const css = editor.getCss();
      const projectData = editor.getProjectData();
      const fullContent = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;

      await documentTemplateApi.update(template.id, {
        name: template.name,
        content: fullContent,
        css: css,
        gjs_project: JSON.stringify(projectData),
      });

      setSuccess('Template visual dan GrapesJS project berhasil disimpan.');
      setTimeout(() => {
        onSaved();
      }, 800);
    } catch (err: unknown) {
      setError(apiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = () => {
    editorRef.current?.Commands.run('core:undo');
  };

  const handleRedo = () => {
    editorRef.current?.Commands.run('core:redo');
  };

  if (template.format !== 'html') {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-none flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Format Tidak Didukung Visual Editor</h2>
          <p className="text-sm text-slate-600">
            Visual Drag-and-Drop Editor hanya tersedia untuk template dengan format HTML. Template ini berformat <strong className="uppercase">{template.format}</strong>.
          </p>
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-none flex flex-col z-50 overflow-hidden">
      <header className="bg-slate-900 text-white px-6 py-3 flex justify-between items-center shadow">
        <div>
          <h1 className="text-base font-bold">Visual Drag-and-Drop Editor: {template.name}</h1>
          <p className="text-xs text-slate-400">GrapesJS WYSIWYG Editor — Sinkronisasi Dua Arah & Project Persistence</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUndo}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-medium text-slate-200 transition"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-medium text-slate-200 transition"
          >
            Redo
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow transition disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Visual Template'}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg px-2"
          >
            ✕
          </button>
        </div>
      </header>

      {error && <div className="bg-red-50 text-red-700 px-6 py-2 text-xs border-b border-red-200">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 px-6 py-2 text-xs border-b border-emerald-200">{success}</div>}

      <div className="flex-1 relative overflow-hidden bg-slate-100">
        <div id="gjs-editor-container" className="w-full h-full" />
      </div>
    </div>
  );
}
