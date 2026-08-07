'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import FriendsList from './FriendsList';
import UserMenu from './UserMenu';

type HostedDocumentKind = 'text' | 'csv';

interface HostedDocument {
  id: string;
  projectId: string;
  subtaskId: string;
  kind: HostedDocumentKind;
  title: string;
  content: string;
  updatedAt: string;
}

interface DocumentProject {
  slug: string;
  title: string;
  boardId: string;
}

export default function HostedDocumentView({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<HostedDocument | null>(null);
  const [project, setProject] = useState<DocumentProject | null>(null);
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (!response.ok) throw new Error('Failed to load document');
        const data = (await response.json()) as { document: HostedDocument; project: DocumentProject };
        if (!cancelled) {
          setDocument(data.document);
          setProject(data.project);
          setTitle(data.document.title);
          setDraft(data.document.content);
        }
      } catch {
        if (!cancelled) {
          setError('Document not found or unavailable.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadDocument();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [documentId]);

  const saveDocument = async () => {
    if (!document) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: draft }),
      });
      if (!response.ok) throw new Error('Failed to save document');
      const data = (await response.json()) as { document: HostedDocument; project: DocumentProject };
      setDocument(data.document);
      setProject(data.project);
      setTitle(data.document.title);
      setDraft(data.document.content);
    } catch {
      setError('Could not save this document.');
    } finally {
      setSaving(false);
    }
  };

  const csvRows = document?.kind === 'csv'
    ? ((Papa.parse<string[]>(draft || '', { skipEmptyLines: false }).data as string[][]).filter((row) => row.length > 1 || row[0] !== ''))
    : [];
  const editableCsvRows = csvRows.length > 0 ? csvRows : [['']];
  const csvColumnCount = Math.max(1, ...editableCsvRows.map((row) => row.length));

  const setCsvCell = (rowIndex: number, columnIndex: number, value: string) => {
    const rows = editableCsvRows.map((row) => [...row]);
    rows[rowIndex] = rows[rowIndex] || [];
    while (rows[rowIndex].length < csvColumnCount) rows[rowIndex].push('');
    rows[rowIndex][columnIndex] = value;
    setDraft(Papa.unparse(rows));
  };

  const addCsvRow = () => {
    setDraft(Papa.unparse([...editableCsvRows.map((row) => [...row]), Array.from({ length: csvColumnCount }, () => '')]));
  };

  const addCsvColumn = () => {
    setDraft(Papa.unparse(editableCsvRows.map((row) => [...row, ''])));
  };

  const projectHref = project
    ? `/project/${project.slug}?boardId=${encodeURIComponent(project.boardId)}`
    : '/';

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--header-surface)] shadow-[0_8px_24px_rgba(17,17,17,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <Link href={projectHref} className="app-toolbar-button app-toolbar-button-neutral">
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            <FriendsList />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="py-24 text-center text-[var(--muted)]">Loading...</div>
        ) : error && !document ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-500">{error}</div>
        ) : document ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_18px_50px_rgba(17,17,17,0.06)]">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">
                  {project?.title || 'Document'}
                </p>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="hero-title mt-2 block w-full border-0 bg-transparent p-0 text-3xl text-[var(--foreground)] focus:outline-none md:text-5xl"
                />
              </div>
              <button
                type="button"
                onClick={saveDocument}
                disabled={saving}
                className="app-toolbar-button app-toolbar-button-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}

            {document.kind === 'csv' ? (
              <div className="space-y-4">
                <div className="overflow-auto rounded-xl border border-[var(--border)]">
                  <table className="min-w-full border-collapse text-sm">
                    <tbody>
                      {editableCsvRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-[var(--border)] last:border-b-0">
                          {Array.from({ length: csvColumnCount }).map((_, columnIndex) => (
                            <td key={columnIndex} className="min-w-36 border-r border-[var(--border)] last:border-r-0">
                              <input
                                value={row[columnIndex] ?? ''}
                                onChange={(event) => setCsvCell(rowIndex, columnIndex, event.target.value)}
                                className="block w-full border-0 bg-transparent px-3 py-2 text-[var(--foreground)] focus:bg-[var(--panel-strong)] focus:outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={addCsvRow} className="app-toolbar-button app-toolbar-button-neutral">
                    + Row
                  </button>
                  <button type="button" onClick={addCsvColumn} className="app-toolbar-button app-toolbar-button-neutral">
                    + Column
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="min-h-[32rem] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] focus:border-[var(--accent)]/40 focus:outline-none"
                spellCheck={false}
              />
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
