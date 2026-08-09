'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Search,
  Plus,
  FileText,
  Trash2,
  Copy,
  ArrowLeft,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eraser,
  Palette,
  Highlighter,
} from 'lucide-react';
import { usePencilStore, type PencilDocument } from '@/stores/pencil-store';
import { cn } from '@/lib/utils';

const TEXT_COLORS = [
  { label: 'Black', value: '#18181b' },
  { label: 'Gray', value: '#71717a' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Orange', value: '#fed7aa' },
];

const FONT_FAMILIES = [
  { label: 'Sans Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Monospace', value: '"Courier New", monospace' },
];

type ParagraphStyle = 'p' | 'h1' | 'h2' | 'h3';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface DocNode {
  type?: string;
  text?: string;
  content?: DocNode[];
}

function extractPreviewText(content: string, maxLen = 140): string {
  if (!content) return '';
  let parsed: DocNode;
  try {
    parsed = JSON.parse(content);
  } catch {
    return '';
  }
  let text = '';
  const walk = (node: DocNode | undefined) => {
    if (!node || text.length >= maxLen) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      text += node.text + ' ';
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (text.length >= maxLen) break;
        walk(child);
      }
    }
  };
  walk(parsed);
  text = text.trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded transition-colors shrink-0',
        'text-foreground/70 dark:text-white/70 hover:bg-accent dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white',
        active && 'bg-[var(--accent-color)]/15 text-[var(--accent-color)]',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

export default function Pencil() {
  const documents = usePencilStore((s) => s.documents);
  const loaded = usePencilStore((s) => s.loaded);
  const load = usePencilStore((s) => s.load);
  const createDocument = usePencilStore((s) => s.createDocument);
  const updateDocument = usePencilStore((s) => s.updateDocument);
  const deleteDocument = usePencilStore((s) => s.deleteDocument);
  const duplicateDocument = usePencilStore((s) => s.duplicateDocument);
  const getDocument = usePencilStore((s) => s.getDocument);

  const [view, setView] = useState<'home' | 'editor'>('home');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [openPopover, setOpenPopover] = useState<'color' | 'highlight' | 'link' | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  const toolbarRef = useRef<HTMLDivElement>(null);
  const loadedDocIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start typing your document…' }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'pencil-page-content',
      },
    },
    content: '',
  }, []);

  // Load the active document's content into the editor when it changes.
  useEffect(() => {
    if (!editor || view !== 'editor' || !activeDocId) return;
    if (loadedDocIdRef.current === activeDocId) return;
    const doc = getDocument(activeDocId);
    loadedDocIdRef.current = activeDocId;
    let parsed: JSONContent | string = '';
    if (doc?.content) {
      try {
        parsed = JSON.parse(doc.content) as JSONContent;
      } catch {
        parsed = '';
      }
    }
    editor.commands.setContent(parsed, { emitUpdate: false });
    setTitleDraft(doc?.title ?? 'Untitled document');
    setSaveStatus('saved');
  }, [editor, view, activeDocId, getDocument]);

  // Autosave on content changes (debounced).
  useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => {
      const id = loadedDocIdRef.current;
      if (!id) return;
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateDocument(id, { content: JSON.stringify(editor.getJSON()) });
        setSaveStatus('saved');
      }, 600);
    };
    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, updateDocument]);

  const openDocument = useCallback((id: string) => {
    loadedDocIdRef.current = null;
    setActiveDocId(id);
    setView('editor');
    setOpenPopover(null);
  }, []);

  const handleNewDocument = useCallback(() => {
    const id = createDocument();
    openDocument(id);
  }, [createDocument, openDocument]);

  const handleBackToHome = useCallback(() => {
    setView('home');
    setActiveDocId(null);
    loadedDocIdRef.current = null;
    setOpenPopover(null);
  }, []);

  const commitTitle = useCallback(() => {
    if (!activeDocId) return;
    const trimmed = titleDraft.trim() || 'Untitled document';
    setTitleDraft(trimmed);
    updateDocument(activeDocId, { title: trimmed });
  }, [activeDocId, titleDraft, updateDocument]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteDocument(id);
      if (activeDocId === id) {
        handleBackToHome();
      }
    },
    [deleteDocument, activeDocId, handleBackToHome]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateDocument(id);
    },
    [duplicateDocument]
  );

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? documents.filter((d) => d.title.toLowerCase().includes(q)) : documents;
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [documents, search]);

  const currentParagraphStyle: ParagraphStyle = editor?.isActive('heading', { level: 1 })
    ? 'h1'
    : editor?.isActive('heading', { level: 2 })
      ? 'h2'
      : editor?.isActive('heading', { level: 3 })
        ? 'h3'
        : 'p';

  const applyParagraphStyle = useCallback(
    (value: ParagraphStyle) => {
      if (!editor) return;
      if (value === 'p') {
        editor.chain().focus().setParagraph().run();
      } else {
        const level = Number(value.slice(1)) as 1 | 2 | 3;
        editor.chain().focus().setHeading({ level }).run();
      }
    },
    [editor]
  );

  const applyFontFamily = useCallback(
    (value: string) => {
      if (!editor) return;
      if (!value) {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(value).run();
      }
    },
    [editor]
  );

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    setOpenPopover(null);
    setLinkUrl('');
  }, [editor, linkUrl]);

  if (view === 'home') {
    return (
      <div className="flex flex-col h-full bg-card dark:bg-zinc-900 text-card-foreground select-none">
        <div className="px-5 py-4 border-b border-border flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-color)]/15 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[var(--accent-color)]" />
            </div>
            <span className="text-base font-semibold">Pencil</span>
          </div>
          <div className="flex-1 relative max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-muted dark:bg-white/5 border border-border outline-none focus:ring-1 focus:ring-[var(--accent-color)]/50 placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={handleNewDocument}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-color)] hover:opacity-90 text-white text-sm font-medium transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New document
          </button>
        </div>

        <div className="flex-1 overflow-y-auto os-scrollbar p-5">
          {!loaded ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Loading…
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted dark:bg-white/5 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div className="text-sm">
                {documents.length === 0 ? 'No documents yet' : 'No documents match your search'}
              </div>
              {documents.length === 0 && (
                <button
                  onClick={handleNewDocument}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent-color)] hover:opacity-90 text-white text-sm font-medium transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Create your first document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onOpen={() => openDocument(doc.id)}
                  onDelete={() => handleDelete(doc.id)}
                  onDuplicate={() => handleDuplicate(doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/40 dark:bg-zinc-900 text-card-foreground select-none">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center gap-3 px-3 shrink-0 bg-card dark:bg-zinc-900">
        <button
          onClick={handleBackToHome}
          title="Back to documents"
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent dark:hover:bg-white/10 text-foreground/70 dark:text-white/70 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <FileText className="w-4 h-4 text-[var(--accent-color)] shrink-0" />
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-sm font-medium bg-transparent outline-none border border-transparent hover:border-border focus:border-border rounded px-1.5 py-0.5 max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
        </span>
      </div>

      {/* Toolbar */}
      <div
        ref={toolbarRef}
        className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card dark:bg-zinc-900 flex-wrap shrink-0"
      >
        <ToolbarButton title="Undo" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}>
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}>
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <select
          value={currentParagraphStyle}
          onChange={(e) => applyParagraphStyle(e.target.value as ParagraphStyle)}
          className="h-7 text-xs rounded px-1.5 bg-transparent border border-border hover:bg-accent dark:hover:bg-white/10 outline-none cursor-pointer"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <select
          defaultValue=""
          onChange={(e) => applyFontFamily(e.target.value)}
          className="h-7 text-xs rounded px-1.5 ml-1 bg-transparent border border-border hover:bg-accent dark:hover:bg-white/10 outline-none cursor-pointer"
        >
          <option value="">Default font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <ToolbarDivider />

        <ToolbarButton title="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Underline" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={editor?.isActive('strike')} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        {/* Text color */}
        <div className="relative">
          <ToolbarButton
            title="Text color"
            active={openPopover === 'color'}
            onClick={() => setOpenPopover(openPopover === 'color' ? null : 'color')}
          >
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          {openPopover === 'color' && (
            <div className="absolute top-full left-0 mt-1 bg-popover dark:bg-zinc-800 border border-border rounded-lg shadow-xl p-2 grid grid-cols-5 gap-1.5 z-50">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => {
                    editor?.chain().focus().setColor(c.value).run();
                    setOpenPopover(null);
                  }}
                  className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight color */}
        <div className="relative">
          <ToolbarButton
            title="Highlight"
            active={openPopover === 'highlight'}
            onClick={() => setOpenPopover(openPopover === 'highlight' ? null : 'highlight')}
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
          {openPopover === 'highlight' && (
            <div className="absolute top-full left-0 mt-1 bg-popover dark:bg-zinc-800 border border-border rounded-lg shadow-xl p-2 grid grid-cols-3 gap-1.5 z-50">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => {
                    editor?.chain().focus().toggleHighlight({ color: c.value }).run();
                    setOpenPopover(null);
                  }}
                  className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton title="Align left" active={editor?.isActive({ textAlign: 'left' })} onClick={() => editor?.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Align center" active={editor?.isActive({ textAlign: 'center' })} onClick={() => editor?.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Align right" active={editor?.isActive({ textAlign: 'right' })} onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Justify" active={editor?.isActive({ textAlign: 'justify' })} onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton title="Quote" active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            title="Link"
            active={editor?.isActive('link') || openPopover === 'link'}
            onClick={() => {
              setLinkUrl((editor?.getAttributes('link').href as string) || '');
              setOpenPopover(openPopover === 'link' ? null : 'link');
            }}
          >
            <Link2 className="w-4 h-4" />
          </ToolbarButton>
          {openPopover === 'link' && (
            <div className="absolute top-full left-0 mt-1 bg-popover dark:bg-zinc-800 border border-border rounded-lg shadow-xl p-2 flex items-center gap-1.5 z-50 w-64">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                placeholder="Paste a link"
                className="flex-1 text-xs px-2 py-1 rounded bg-muted dark:bg-white/5 border border-border outline-none"
              />
              <button
                onClick={applyLink}
                className="text-xs px-2 py-1 rounded bg-[var(--accent-color)] hover:opacity-90 text-white font-medium transition-opacity"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <ToolbarDivider />

        <ToolbarButton
          title="Clear formatting"
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Page canvas */}
      <div className="flex-1 overflow-y-auto os-scrollbar py-8">
        <div className="mx-auto bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-sm shadow-lg min-h-[1056px] w-full max-w-[816px] px-[76px] py-[96px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status bar */}
      <div className="h-6 border-t border-border text-[11px] text-muted-foreground flex items-center justify-end gap-3 px-3 bg-card dark:bg-zinc-900 shrink-0">
        <span>{editor?.storage.characterCount?.words() ?? 0} words</span>
        <span>{editor?.storage.characterCount?.characters() ?? 0} characters</span>
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  onOpen,
  onDelete,
  onDuplicate,
}: {
  doc: PencilDocument;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const preview = useMemo(() => extractPreviewText(doc.content), [doc.content]);

  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col rounded-lg border border-border bg-background dark:bg-white/[0.03] hover:border-[var(--accent-color)]/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      <div className="h-24 bg-muted dark:bg-white/5 flex items-start p-3 border-b border-border">
        <p className="text-[9px] leading-snug text-muted-foreground line-clamp-5">
          {preview || 'Empty document'}
        </p>
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <span className="text-sm font-medium truncate">{doc.title}</span>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(doc.updatedAt)}</span>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <button
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="w-6 h-6 flex items-center justify-center rounded bg-card/90 dark:bg-zinc-900/90 border border-border hover:bg-accent dark:hover:bg-white/10"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-6 h-6 flex items-center justify-center rounded bg-card/90 dark:bg-zinc-900/90 border border-border hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
