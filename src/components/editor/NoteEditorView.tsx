import React, { useState, useRef, useEffect } from 'react';
import type { Note, TableData } from '../../types/notes';
import type { LockCredentials } from '../../hooks/useNotesStorage';
import { AppleShareIcon, AppleMoreCircleIcon, ApplePencilMarkupIcon, AppleNewNoteIcon } from '../icons/AppleIcons';
import { NoteActionPopoverMenu } from './NoteActionPopoverMenu';
import { KeyboardAccessoryBar } from './KeyboardAccessoryBar';
import { TextFormatSheet, type TextHierarchy } from './TextFormatSheet';
import { TableEditor } from './TableEditor';
import { TextColorSheet, type ColorScope } from './TextColorSheet';
import { RichBodyEditor, type RichBodyEditorHandle } from './RichBodyEditor';
import { domToSpans } from './RichBodyEditor';
import { DocumentScannerModal } from '../scanner/DocumentScannerModal';
import { SetPasswordModal } from '../security/SetPasswordModal';
import { PasscodePromptModal } from '../security/PasscodePromptModal';
import { AppleAlert } from '../common/AppleAlert';
import { AppleConfirmModal } from '../common/AppleConfirmModal';
import { Check, Camera, CheckSquare, Search, X, Undo2, Redo2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { buildShareText } from '../../utils/share';
import { generateSalt, hashPassword, verifyPassword } from '../../utils/lock';

// Page color shades: strong tone for the header, light tint for the body.
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const m = (v: number) => Math.round(v + (255 - v) * amount);
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface NoteEditorViewProps {  note: Note;
  folderName: string;
  autoSortChecklist: boolean | null;
  setAutoSortChecklist: (val: boolean) => void;
  onBack: () => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onLockNote: (id: string, isLocked: boolean, lock?: LockCredentials, hint?: string) => void;
  onNewNote: () => void;
  folders: { id: string; name: string }[];
  onMoveNote: (targetFolderId: string) => void;
}

export const NoteEditorView: React.FC<NoteEditorViewProps> = ({
  note,
  folderName,
  autoSortChecklist,
  setAutoSortChecklist,
  onBack,
  onUpdateNote,
  onDeleteNote,
  onTogglePin,
  onLockNote,
  onNewNote,
  folders,
  onMoveNote,
}) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isFormattingOpen, setIsFormattingOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanViewerOpen, setIsScanViewerOpen] = useState(false);
  const [isColorSheetOpen, setIsColorSheetOpen] = useState(false);
  const [colorScope, setColorScope] = useState<ColorScope>('selection');
  const [colorHint, setColorHint] = useState('');
  const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);
  const [isUnlockPromptOpen, setIsUnlockPromptOpen] = useState(false);
  const [unlockError, setUnlockError] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAutoSortAlertOpen, setIsAutoSortAlertOpen] = useState(false);
  const [isMoveFolderOpen, setIsMoveFolderOpen] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [backgroundStyle, setBackgroundStyle] = useState<'none' | 'lines'>(
    note.pageBackground ?? 'none'
  );

  // Reload page background when switching notes
  const backgroundNoteIdRef = useRef(note.id);
  useEffect(() => {
    if (note.id !== backgroundNoteIdRef.current) {
      backgroundNoteIdRef.current = note.id;
      setBackgroundStyle(note.pageBackground ?? 'none');
    }
  }, [note.id, note.pageBackground]);

  const toggleBackgroundStyle = () => {
    const next = backgroundStyle === 'none' ? 'lines' : 'none';
    setBackgroundStyle(next);
    onUpdateNote(note.id, { pageBackground: next === 'lines' ? 'lines' : undefined });
  };
  const [clipboardSuccess, setClipboardSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  // A10: formatting persisted per note
  const [hierarchy, setHierarchy] = useState<TextHierarchy>(note.format?.hierarchy ?? 'title');
  const [isBold, setIsBold] = useState(note.format?.bold ?? false);
  const [isItalic, setIsItalic] = useState(note.format?.italic ?? false);
  const [isUnderline, setIsUnderline] = useState(note.format?.underline ?? false);
  const [isStrikethrough, setIsStrikethrough] = useState(note.format?.strikethrough ?? false);
  const [fontSize, setFontSize] = useState(17);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);

  // A10: hierarchy actually renders — it styles the title
  const titleHierarchySize =
    hierarchy === 'title'
      ? 'text-[28px]'
      : hierarchy === 'heading'
        ? 'text-[22px]'
        : hierarchy === 'subheading'
          ? 'text-[20px]'
          : 'text-[17px]';
  const titleHierarchyWeight =
    hierarchy === 'title' || hierarchy === 'heading'
      ? 'font-bold'
      : hierarchy === 'subheading'
        ? 'font-semibold'
        : 'font-normal';

  // Reload persisted format when switching notes
  const formatNoteIdRef = useRef(note.id);
  useEffect(() => {
    if (note.id !== formatNoteIdRef.current) {
      formatNoteIdRef.current = note.id;
      setHierarchy(note.format?.hierarchy ?? 'title');
      setIsBold(note.format?.bold ?? false);
      setIsItalic(note.format?.italic ?? false);
      setIsUnderline(note.format?.underline ?? false);
      setIsStrikethrough(note.format?.strikethrough ?? false);
      // Font size is session-only: always back to standard on return
      setFontSize(17);
    }
  }, [note.id, note.format]);

  const persistFormat = (patch: Partial<NonNullable<Note['format']>>) => {
    // Note: fontSize is intentionally session-only (never persisted).
    const next = {
      hierarchy,
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      strikethrough: isStrikethrough,
      ...patch,
    };
    delete (next as { fontSize?: number }).fontSize;
    onUpdateNote(note.id, { format: next });
  };

  const FONT_SIZES = [17, 18, 19, 20, 21, 22, 23, 24, 25];

  // In-note search (A10: Buscar na Nota works)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const searchMatches = useRef<number[]>([]);
  useEffect(() => {
    if (!searchText) {
      searchMatches.current = [];
      setMatchCount(0);
      setSearchIndex(0);
      return;
    }
    const q = searchText.toLowerCase();
    const body = note.body.toLowerCase();
    const out: number[] = [];
    let i = body.indexOf(q);
    while (i !== -1 && out.length < 200) {
      out.push(i);
      i = body.indexOf(q, i + 1);
    }
    searchMatches.current = out;
    setMatchCount(out.length);
    setSearchIndex(0);
  }, [searchText, note.body]);

  const jumpToMatch = (idx: number) => {
    const list = searchMatches.current;
    if (list.length === 0) return;
    const safe = ((idx % list.length) + list.length) % list.length;
    setSearchIndex(safe);
    richEditorRef.current?.selectPlainRange(list[safe], list[safe] + searchText.length);
  };

  const newChecklistInputRef = useRef<HTMLInputElement>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const checklistRef = useRef(note.checklist);

  // Keep ref in sync with latest checklist
  if (note.checklist !== checklistRef.current) {
    checklistRef.current = note.checklist;
  }

  // Rich body editor (letter color + marker per segment)
  const richEditorRef = useRef<RichBodyEditorHandle>(null);
  const [bodyRev, setBodyRev] = useState(0);
  // Last known caret while the editor was focused. Tapping a sheet button
  // blurs the editor on Android, so insertions fall back to this position
  // instead of silently landing at the end (or nowhere).
  const lastCaretRef = useRef(-1);

  const captureCaret = () => {
    const pos = richEditorRef.current?.caretOffset() ?? -1;
    if (pos >= 0) lastCaretRef.current = pos;
  };

  const currentCaret = (fallbackEnd: boolean): number => {
    const editor = richEditorRef.current;
    const textLen = note.body?.length ?? 0;
    const live = editor?.caretOffset() ?? -1;
    if (live >= 0) {
      lastCaretRef.current = live;
      return live;
    }
    if (lastCaretRef.current >= 0) return Math.min(lastCaretRef.current, textLen);
    return fallbackEnd ? textLen : 0;
  };

  // Undo/redo GLOBAL do corpo da nota: escrita (agrupada por pausa),
  // cores/marca-texto, listas e recuo. Cada passo guarda o estado exato.
  interface BodyHistoryEntry {
    body: string;
    spans?: { text: string; color?: string; bg?: string }[];
    kind: 'base' | 'typing' | 'discrete';
  }
  const bodyHistoryRef = useRef<BodyHistoryEntry[]>([
    { body: note.body, spans: note.bodySpans, kind: 'base' },
  ]);
  const bodyCursorRef = useRef(0);
  const lastPushRef = useRef(0);
  const suppressRecordRef = useRef(false);
  const [historyBounds, setHistoryBounds] = useState({ canUndo: false, canRedo: false });

  const refreshBounds = () => {
    setHistoryBounds({
      canUndo: bodyCursorRef.current > 0,
      canRedo: bodyCursorRef.current < bodyHistoryRef.current.length - 1,
    });
  };

  // Reset history when switching notes (seeded with the initial state)
  const historyNoteIdRef = useRef(note.id);
  if (note.id !== historyNoteIdRef.current) {
    historyNoteIdRef.current = note.id;
    bodyHistoryRef.current = [{ body: note.body, spans: note.bodySpans, kind: 'base' }];
    bodyCursorRef.current = 0;
    lastPushRef.current = 0;
    suppressRecordRef.current = false;
    setHistoryBounds({ canUndo: false, canRedo: false });
  }

  const sameSpans = (
    a: BodyHistoryEntry['spans'],
    b: BodyHistoryEntry['spans']
  ) => JSON.stringify(a) === JSON.stringify(b);

  const recordState = (
    body: string,
    spans: BodyHistoryEntry['spans'],
    kind: 'typing' | 'discrete'
  ) => {
    const hist = bodyHistoryRef.current;
    const cur = bodyCursorRef.current;
    const top = cur >= 0 ? hist[cur] : undefined;
    if (top && top.body === body && sameSpans(top.spans, spans)) return;
    const now = Date.now();
    // Continuous typing merges into a single step
    if (kind === 'typing' && top && top.kind === 'typing' && now - lastPushRef.current < 1200) {
      hist[cur] = { body, spans, kind };
      lastPushRef.current = now;
      return;
    }
    bodyHistoryRef.current = [...hist.slice(0, cur + 1), { body, spans, kind }];
    bodyCursorRef.current = cur + 1;
    lastPushRef.current = now;
    refreshBounds();
  };

  const handleUndoBody = () => {
    if (bodyCursorRef.current <= 0) return;
    bodyCursorRef.current -= 1;
    const snap = bodyHistoryRef.current[bodyCursorRef.current];
    lastPushRef.current = 0;
    onUpdateNote(note.id, { body: snap.body, bodySpans: snap.spans });
    setBodyRev((r) => r + 1);
    refreshBounds();
  };

  const handleRedoBody = () => {
    if (bodyCursorRef.current >= bodyHistoryRef.current.length - 1) return;
    bodyCursorRef.current += 1;
    const snap = bodyHistoryRef.current[bodyCursorRef.current];
    lastPushRef.current = 0;
    onUpdateNote(note.id, { body: snap.body, bodySpans: snap.spans });
    setBodyRev((r) => r + 1);
    refreshBounds();
  };

  // Read the live DOM and record it as one discrete undo step.
  const commitDiscreteEdit = () => {
    suppressRecordRef.current = false;
    const el = richEditorRef.current?.element();
    if (!el) return;
    const { spans, plain } = domToSpans(el);
    recordState(plain, spans.length > 0 ? spans : undefined, 'discrete');
  };

  const handleRichChange = (spans: { text: string; color?: string; bg?: string }[] | undefined, plain: string) => {
    // Typing records (coalesced); programmatic edits suppress this and
    // record one discrete step themselves.
    if (suppressRecordRef.current) {
      suppressRecordRef.current = false;
    } else {
      recordState(plain, spans, 'typing');
    }
    onUpdateNote(note.id, { body: plain, bodySpans: spans });
  };

  // Title change
  const handleTitleChange = (val: string) => {
    onUpdateNote(note.id, { title: val });
  };

  // Body change (plain-text paths: search fallback, etc.)
  const handleBodyChange = (val: string) => {
    onUpdateNote(note.id, { body: val, bodySpans: val ? [{ text: val }] : undefined });
  };

  // Enter inside a list item continues the list (numbered auto-increments).
  // Enter on an empty list item exits the list.
  const handleListEnter = (): boolean => {
    const editor = richEditorRef.current;
    if (!editor) return false;
    const caret = editor.caretOffset();
    if (caret < 0) return false;
    const text = note.body || '';
    const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
    let lineEnd = text.indexOf('\n', caret);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);
    const m = line.match(/^(•|—|\d+\.)\s/);
    if (!m) return false;
    const marker = m[1];
    const contentAfter = line.slice(m[0].length).trim();
    if (contentAfter === '') {
      // Empty item → exit the list by removing the marker
      suppressRecordRef.current = true;
      editor.selectPlainRange(lineStart, lineEnd);
      editor.insertTextAtCaret('');
      commitDiscreteEdit();
      return true;
    }
    const next =
      marker === '•' ? '• ' : marker === '—' ? '— ' : `${parseInt(marker, 10) + 1}. `;
    suppressRecordRef.current = true;
    editor.insertTextAtCaret('\n' + next);
    commitDiscreteEdit();
    return true;
  };

  // Insert text at caret (A10: lists go to the cursor, not the end)
  const insertAtCursor = (snippet: string) => {
    const editor = richEditorRef.current;
    const text = note.body || '';
    if (!editor) {
      handleBodyChange((text ? text + '\n' : '') + snippet);
      return;
    }
    const pos = currentCaret(true);
    editor.selectPlainRange(pos, pos);
    suppressRecordRef.current = true;
    editor.insertTextAtCaret(snippet);
    commitDiscreteEdit();
    const after = editor.caretOffset();
    lastCaretRef.current = after >= 0 ? after : pos + snippet.length;
  };

  // Checklist toggling with auto-sort alert
  const handleToggleChecklist = (itemId: string) => {
    if (!note.checklist) return;

    if (autoSortChecklist === null) {
      setIsAutoSortAlertOpen(true);
    }

    const updated = note.checklist.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    let finalChecklist = updated;
    if (autoSortChecklist === true) {
      finalChecklist = [
        ...updated.filter((i) => !i.checked),
        ...updated.filter((i) => i.checked),
      ];
    }

    checklistRef.current = finalChecklist;
    onUpdateNote(note.id, { checklist: finalChecklist });
  };

  const handleAddChecklistItem = (text: string) => {
    if (!text.trim()) return;
    // Use the longest available source (prop vs ref) to survive rapid Enters
    const fromProp = note.checklist || [];
    const fromRef = checklistRef.current || [];
    const current = fromProp.length >= fromRef.length ? fromProp : fromRef;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      checked: false,
    };
    const updated = [...current, newItem];
    checklistRef.current = updated;
    onUpdateNote(note.id, { checklist: updated });
    setNewChecklistText('');
    setTimeout(() => newChecklistInputRef.current?.focus(), 50);
  };

  // Enter inside any existing item -> jump to the "new item" field
  const handleChecklistItemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    itemText: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (itemText.trim()) {
        setTimeout(() => newChecklistInputRef.current?.focus(), 0);
      }
    }
  };

  const handleRemoveChecklistItem = (itemId: string) => {
    const updated = (note.checklist || []).filter((i) => i.id !== itemId);
    checklistRef.current = updated.length > 0 ? updated : undefined;
    onUpdateNote(note.id, { checklist: updated.length > 0 ? updated : undefined });
  };

  const handleInsertChecklist = () => {
    if (!checklistRef.current || checklistRef.current.length === 0) {
      const initial = [{ id: `item-${Date.now()}`, text: '', checked: false }];
      checklistRef.current = initial;
      onUpdateNote(note.id, { checklist: initial });
      setNewChecklistText('');
      setTimeout(() => newChecklistInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => newChecklistInputRef.current?.focus(), 100);
    }
  };

  const handleInsertTable = () => {
    if (!note.table) {
      const initialTable: TableData = {
        headers: ['', ''],
        rows: [
          ['', ''],
          ['', ''],
        ],
      };
      onUpdateNote(note.id, { table: initialTable });
    }
  };

  // C3: lock with salted hash — the password never touches storage
  const handleSavePassword = async (pass: string, hint: string) => {
    const salt = generateSalt();
    const hash = await hashPassword(pass, salt);
    onLockNote(note.id, true, { salt, hash }, hint);
    setIsSetPasswordOpen(false);
  };

  // A4: removing the lock requires the password
  const handleConfirmUnlock = async (password: string): Promise<boolean> => {
    const ok = await verifyPassword(password, note.lockSalt || '', note.lockHash || '');
    if (ok) {
      onLockNote(note.id, false);
      setIsUnlockPromptOpen(false);
      setUnlockError(false);
      return true;
    }
    setUnlockError(true);
    return false;
  };

  // Page color (whole note): light tint everywhere
  const pageLight = note.pageColor ? mixWithWhite(note.pageColor, 0.82) : null;

  const handlePickPageColor = (hex: string | null) => {
    onUpdateNote(note.id, { pageColor: hex ?? undefined });
    setIsColorSheetOpen(false);
  };

  // Letter color + marker (pencil): selection scope or whole text
  const handlePickColor = (kind: 'color' | 'bg', value: string) => {
    setColorHint('');
    if (colorScope === 'all') {
      const current = note.bodySpans && note.bodySpans.length > 0
        ? note.bodySpans
        : note.body
          ? [{ text: note.body }]
          : [];
      if (current.length === 0) {
        setColorHint('Escreva algo na nota primeiro.');
        return;
      }
      const updated = current.map((s) => ({ ...s, [kind]: value }));
      recordState(note.body, updated, 'discrete');
      onUpdateNote(note.id, { bodySpans: updated });
      setBodyRev((r) => r + 1);
      setIsColorSheetOpen(false);
      return;
    }
    suppressRecordRef.current = true;
    const res = richEditorRef.current?.applyToSelection(kind, value) ?? null;
    if (!res) {
      suppressRecordRef.current = false;
      setColorHint('Selecione um trecho no texto e toque na cor.');
    } else {
      recordState(res.after.plain, res.after.spans, 'discrete');
      setIsColorSheetOpen(false);
    }
  };

  const handleClearColors = () => {
    setColorHint('');
    if (colorScope === 'all') {
      const current = note.bodySpans && note.bodySpans.length > 0
        ? note.bodySpans
        : note.body
          ? [{ text: note.body }]
          : [];
      const updated = current.map((s) => ({ text: s.text }));
      const after = updated.length > 0 ? updated : undefined;
      recordState(note.body, after, 'discrete');
      onUpdateNote(note.id, { bodySpans: after });
      setBodyRev((r) => r + 1);
      setIsColorSheetOpen(false);
      return;
    }
    suppressRecordRef.current = true;
    const res = richEditorRef.current?.clearSelectionFormat() ?? null;
    if (!res) {
      suppressRecordRef.current = false;
      setColorHint('Selecione um trecho no texto para limpar.');
    } else {
      recordState(
        res.after.plain,
        res.after.spans.length > 0 ? res.after.spans : undefined,
        'discrete'
      );
      setIsColorSheetOpen(false);
    }
  };

  // A1: share full note content; never open an empty chooser twice
  const handleShare = async () => {
    if (isSharing) return;
    const text = buildShareText(note);
    if (!text) {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
      return;
    }
    setIsSharing(true);
    try {
      await Share.share({
        title: note.title,
        text,
        dialogTitle: 'Compartilhar Nota',
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'Share canceled') {
        try {
          await navigator.clipboard.writeText(text);
          setClipboardSuccess(true);
          setTimeout(() => setClipboardSuccess(false), 2000);
        } catch {
          // Clipboard fallback failed
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden select-none relative">
      {/* Top Navigation Bar matching Tela 08, 09, 13, 20 */}
      <div
        className="h-[44px] px-4 flex items-center justify-between border-b border-[#E5E5EA] z-30 relative"
        style={{ backgroundColor: pageLight ?? '#FFFFFF' }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar para a lista"
          className="text-[17px] text-[#D97706] hover:opacity-80 active:opacity-60 transition flex items-center gap-1 -ml-1"
        >
          <span className="text-[20px] leading-none mb-0.5">‹</span>
          <span className="truncate max-w-[150px]">{folderName}</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Font size picker (Excel-style) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFontSizeOpen((v) => !v)}
              className="h-[28px] min-w-[44px] px-1.5 rounded-[8px] border border-[#E5E5EA] bg-white text-black text-[14px] font-semibold flex items-center justify-center gap-0.5 hover:opacity-80 transition ring-1 ring-[#E49F13]/60"
              title="Tamanho da letra"
              aria-label={`Tamanho da letra: ${fontSize}`}
              aria-expanded={isFontSizeOpen}
            >
              {fontSize}
              <span className="text-[10px] text-[#8E8E93]">▾</span>
            </button>
            {isFontSizeOpen && (
              <div
                role="listbox"
                aria-label="Tamanhos de letra"
                className="absolute top-[34px] left-0 z-50 w-[120px] bg-white/95 backdrop-blur-2xl rounded-[12px] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                {FONT_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={s === fontSize}
                    onClick={() => {
                      setFontSize(s);
                      persistFormat({ fontSize: s });
                      setIsFontSizeOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between active:bg-black/5 transition ${
                      s === fontSize ? 'bg-[#FEF3C7]/60' : ''
                    }`}
                  >
                    <span className="text-black font-semibold" style={{ fontSize: 15 }}>{s}</span>
                    {s === 17 && (
                      <span className="text-[11px] text-[#8E8E93]">Padrão</span>
                    )}
                    {s === fontSize && s !== 17 && (
                      <span className="text-[13px] text-[#D97706]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUndoBody}
            disabled={!historyBounds.canUndo}
            className="text-[#D97706] hover:opacity-80 transition disabled:opacity-30"
            title="Desfazer"
            aria-label="Desfazer"
          >
            <Undo2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleRedoBody}
            disabled={!historyBounds.canRedo}
            className="text-[#D97706] hover:opacity-80 transition disabled:opacity-30"
            title="Refazer"
            aria-label="Refazer"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="text-[#D97706] hover:opacity-80 transition disabled:opacity-40"
            title="Compartilhar"
            aria-label="Compartilhar nota"
          >
            <AppleShareIcon className="w-5 h-5" />
          </button>

          {/* More actions menu */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsActionMenuOpen((v) => !v);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[#D97706] hover:opacity-80 transition"
              title="Mais opções"
              aria-label="Mais opções"
              aria-expanded={isActionMenuOpen}
            >
              <AppleMoreCircleIcon className="w-6 h-6" />
            </button>

            <NoteActionPopoverMenu
              isOpen={isActionMenuOpen}
              isPinned={note.isPinned}
              isLocked={note.isLocked}
              onClose={() => setIsActionMenuOpen(false)}
              onScan={() => setIsScannerOpen(true)}
              onTogglePin={() => onTogglePin(note.id)}
              onLockClick={() => {
                if (note.isLocked) {
                  setUnlockError(false);
                  setIsUnlockPromptOpen(true);
                } else {
                  setIsSetPasswordOpen(true);
                }
              }}
              onSearchInNote={() => {
                setIsSearchOpen(true);
                setSearchText('');
              }}
              onMoveNote={() => setIsMoveFolderOpen(true)}
              onToggleGridLines={toggleBackgroundStyle}
              onDeleteNote={() => setIsDeleteConfirmOpen(true)}
            />
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-[17px] font-semibold text-[#D97706] hover:opacity-80 transition"
          >
            OK
          </button>
        </div>
      </div>

      {/* Tap-away to close the font-size picker */}
      {isFontSizeOpen && (
        <button
          type="button"
          aria-label="Fechar tamanhos de letra"
          onClick={() => setIsFontSizeOpen(false)}
          className="absolute inset-0 z-20 bg-transparent"
        />
      )}

      {/* In-note search bar (A10) */}
      {isSearchOpen && (
        <div className="px-4 py-2 bg-[#F2F2F7] border-b border-[#E5E5EA] flex items-center gap-2 z-30">
          <Search className="w-4 h-4 text-[#8E8E93] shrink-0" />
          <input
            type="text"
            autoFocus
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') jumpToMatch(searchIndex + 1);
              if (e.key === 'Escape') setIsSearchOpen(false);
            }}
            placeholder="Buscar nesta nota"
            aria-label="Buscar nesta nota"
            className="flex-1 bg-white rounded-[8px] px-2 py-1 text-[15px] text-black outline-hidden border border-[#E5E5EA]"
          />
          {searchText && (
            <span className="text-[12px] text-[#8E8E93] shrink-0">
              {matchCount > 0 ? `${searchIndex + 1}/${matchCount}` : '0'}
            </span>
          )}
          {searchText && matchCount > 0 && (
            <button
              type="button"
              onClick={() => jumpToMatch(searchIndex + 1)}
              className="text-[14px] text-[#D97706] font-medium shrink-0"
            >
              Próxima
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            aria-label="Fechar busca"
            className="text-[#8E8E93] shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Note Document Viewport */}
      <div
        className="flex-1 overflow-y-auto px-5 py-4"
        style={{ backgroundColor: pageLight ?? '#FFFFFF' }}
      >
        {/* Header band (title + date) in the strong tone */}
        <div
          className="-mx-5 -mt-4 px-5 pt-4 pb-1"
          style={{ backgroundColor: pageLight ?? 'transparent' }}
        >
          {/* Note Title */}
          <input
            type="text"
            value={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título"
            aria-label="Título da nota"
          className={`w-full ${titleHierarchySize} text-black outline-hidden bg-transparent tracking-tight mb-2 ${
            isBold ? 'font-black' : titleHierarchyWeight
          } ${isItalic ? 'italic' : ''} ${isUnderline ? 'underline' : ''} ${
            isStrikethrough ? 'line-through' : ''
          }`}
          />

          {/* Date / Time Subtitle */}
          <div className="text-[13px] text-[#8E8E93] mb-4">
            {new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} às {note.timeFormatted}
          </div>
        </div>

        {/* Interactive Checklist (Telas 07b, 14, 20) */}
        {note.checklist && note.checklist.length > 0 && (
          <div className="space-y-2 mb-4">
            {note.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 group">
                <button
                  type="button"
                  onClick={() => handleToggleChecklist(item.id)}
                  aria-label={item.checked ? 'Desmarcar item' : 'Marcar item'}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    item.checked
                      ? 'bg-[#E49F13] text-white shadow-xs'
                      : 'border border-[#C7C7CC] bg-white hover:border-[#8E8E93]'
                  }`}
                >
                  {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => {
                    const updated = note.checklist?.map((i) =>
                      i.id === item.id ? { ...i, text: e.target.value } : i
                    );
                    if (updated) checklistRef.current = updated;
                    onUpdateNote(note.id, { checklist: updated });
                  }}
                  onKeyDown={(e) => handleChecklistItemKeyDown(e, item.text)}
                  enterKeyHint="next"
                  className={`flex-1 text-[17px] outline-hidden bg-transparent transition-all ${
                    item.checked ? 'text-[#8E8E93] line-through' : 'text-black'
                  }`}
                  placeholder="Item"
                  aria-label="Texto do item"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveChecklistItem(item.id)}
                  aria-label="Remover item"
                  className="text-[#C7C7CC] hover:text-[#FF3B30] transition shrink-0 text-[18px] leading-none px-1"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Input to add next checklist item */}
            <div className="flex items-center gap-3 pt-1">
              <div className="w-5 h-5 rounded-full border border-[#D1D1D6] flex items-center justify-center opacity-50" />
              <input
                ref={newChecklistInputRef}
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem(newChecklistText);
                  }
                }}
                enterKeyHint="done"
                placeholder="Novo item... (Enter para adicionar)"
                aria-label="Novo item da lista"
                className="flex-1 text-[17px] text-black placeholder-[#C7C7CC] outline-hidden bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Interactive Table (Tela 20) */}
        {note.table && (
          <div className="relative">
            <TableEditor
              table={note.table}
              onChange={(updated) => onUpdateNote(note.id, { table: updated })}
              onRemove={() => onUpdateNote(note.id, { table: undefined })}
            />
          </div>
        )}

        {/* Subtitle if any (Tela 20: "Teste") */}
        {note.subtitle && (
          <div className="text-[20px] font-bold text-black mt-4 mb-2">
            {note.subtitle}
          </div>
        )}

        {/* Scanned Document Thumbnail / Card (Tela 15) */}
        {note.scanDataUrl && (
          <div className="my-3 relative">
            <div
              onClick={() => setIsScanViewerOpen(true)}
              className="p-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-[12px] flex items-center gap-3 cursor-pointer hover:bg-[#E5E5EA]/70 transition shadow-xs"
              role="button"
              aria-label="Visualizar documento escaneado"
            >
              <div className="w-12 h-16 bg-white rounded-[4px] shadow-sm border border-neutral-300 flex items-center justify-center overflow-hidden relative">
                <img src={note.scanDataUrl} alt="Documento" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-black">
                  Documento Escaneado (1 pág.)
                </div>
                <div className="text-[13px] text-[#8E8E93]">
                  Toque para visualizar
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateNote(note.id, { hasScan: false, scanDataUrl: undefined })}
              aria-label="Remover documento escaneado"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white text-[14px] leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Rich Body: letter color + marker per segment.
            In lines mode the ruling lives on the text field itself with an
            exact 28px line-height, so every line sits on its rule. */}
        <RichBodyEditor
          ref={richEditorRef}
          noteId={note.id}
          spans={note.bodySpans}
          body={note.body}
          rev={bodyRev}
          onChange={handleRichChange}
          onEnterPress={handleListEnter}
          fontSize={fontSize}
          className={`w-full min-h-[50vh] text-[17px] text-black outline-hidden bg-transparent placeholder-[#8E8E93] empty:before:content-[attr(data-placeholder)] empty:before:text-[#8E8E93] ${
            backgroundStyle === 'lines'
              ? 'leading-[28px] bg-[linear-gradient(transparent_27px,#e5e5ea_1px)] bg-[size:100%_28px]'
              : 'leading-relaxed'
          } ${
            isBold ? 'font-bold' : ''
          } ${isItalic ? 'italic' : ''} ${isUnderline ? 'underline' : ''} ${
            isStrikethrough ? 'line-through' : ''
          }`}
        />
      </div>

      {/* Floating Keyboard Accessory Toolbar above keyboard (Telas 13 e 20) */}
      <KeyboardAccessoryBar
        isExpanded={isToolbarExpanded}
        onToggleExpand={() => setIsToolbarExpanded(!isToolbarExpanded)}
        onInsertTable={handleInsertTable}
        onOpenFormatting={() => {
          captureCaret();
          setIsFormattingOpen(true);
        }}
        onInsertChecklist={handleInsertChecklist}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenDrawing={() => {
          captureCaret();
          setColorHint('');
          setIsColorSheetOpen(true);
        }}
      />

      {/* Bottom Default Toolbar when accessory is closed (Tela 08) */}
      {!isToolbarExpanded && (
        <div className="h-[49px] border-t border-[#E5E5EA] bg-[#F8F8F8]/90 backdrop-blur-md px-5 flex items-center justify-between z-30">
          <button
            type="button"
            onClick={handleInsertChecklist}
            className="text-[#D97706] hover:opacity-80 transition"
            title="Checklist"
            aria-label="Inserir checklist"
          >
            <CheckSquare className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="text-[#D97706] hover:opacity-80 transition"
            title="Câmera"
            aria-label="Abrir câmera"
          >
            <Camera className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => {
              captureCaret();
              setColorHint('');
              setIsColorSheetOpen(true);
            }}
            className="text-[#D97706] hover:opacity-80 transition"
            title="Cor do texto"
            aria-label="Cor do texto e marca-texto"
          >
            <ApplePencilMarkupIcon className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={onNewNote}
            className="text-[#D97706] hover:opacity-80 transition"
            title="Nova Nota"
            aria-label="Criar nova nota"
          >
            <AppleNewNoteIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Text Format Bottom Sheet (Tela 19) */}
      <TextFormatSheet
        isOpen={isFormattingOpen}
        onClose={() => setIsFormattingOpen(false)}
        currentHierarchy={hierarchy}
        onSelectHierarchy={(h) => {
          setHierarchy(h);
          persistFormat({ hierarchy: h });
        }}
        isBold={isBold}
        isItalic={isItalic}
        isUnderline={isUnderline}
        isStrikethrough={isStrikethrough}
        onToggleBold={() => {
          setIsBold(!isBold);
          persistFormat({ bold: !isBold });
        }}
        onToggleItalic={() => {
          setIsItalic(!isItalic);
          persistFormat({ italic: !isItalic });
        }}
        onToggleUnderline={() => {
          setIsUnderline(!isUnderline);
          persistFormat({ underline: !isUnderline });
        }}
        onToggleStrikethrough={() => {
          setIsStrikethrough(!isStrikethrough);
          persistFormat({ strikethrough: !isStrikethrough });
        }}
        onInsertBulletList={() => {
          insertAtCursor('• ');
          setIsFormattingOpen(false);
        }}
        onInsertDashList={() => {
          insertAtCursor('— ');
          setIsFormattingOpen(false);
        }}
        onInsertNumberedList={() => {
          insertAtCursor('1. ');
          setIsFormattingOpen(false);
        }}
        onIndent={() => {
          // Add 2 spaces at the beginning of the current line
          const editor = richEditorRef.current;
          const text = note.body || '';
          if (!editor) {
            handleBodyChange(text + '  ');
            setIsFormattingOpen(false);
            return;
          }
          const caret = currentCaret(true);
          const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
          suppressRecordRef.current = true;
          editor.selectPlainRange(lineStart, lineStart);
          editor.insertTextAtCaret('  ');
          commitDiscreteEdit();
          const after = editor.caretOffset();
          lastCaretRef.current = after >= 0 ? after : lineStart + 2;
          setIsFormattingOpen(false);
        }}
        onOutdent={() => {
          // Remove up to 2 leading spaces from the current line
          const editor = richEditorRef.current;
          const text = note.body || '';
          if (!editor) {
            setIsFormattingOpen(false);
            return;
          }
          const caret = currentCaret(true);
          const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
          let removed = 0;
          if (text[lineStart] === ' ') removed++;
          if (text[lineStart + 1] === ' ') removed++;
          if (removed > 0) {
            suppressRecordRef.current = true;
            editor.selectPlainRange(lineStart, lineStart + removed);
            editor.insertTextAtCaret('');
            commitDiscreteEdit();
            lastCaretRef.current = lineStart;
          }
          setIsFormattingOpen(false);
        }}
      />

      {/* Text Color / Marker Sheet (pencil) */}
      <TextColorSheet
        isOpen={isColorSheetOpen}
        scope={colorScope}
        onScopeChange={(s) => {
          setColorScope(s);
          setColorHint('');
        }}
        hint={colorHint}
        onPick={handlePickColor}
        onClear={handleClearColors}
        pageColor={note.pageColor}
        onPickPage={handlePickPageColor}
        onClose={() => {
          setIsColorSheetOpen(false);
          setColorHint('');
        }}
      />

      {/* Document Scanner Modal (Tela 15) */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onAttachScanToNote={(scanUrl) => onUpdateNote(note.id, { hasScan: true, scanDataUrl: scanUrl })}
      />

      {/* Set Password Modal (Tela 11) */}
      <SetPasswordModal
        isOpen={isSetPasswordOpen}
        onClose={() => setIsSetPasswordOpen(false)}
        onSavePassword={handleSavePassword}
      />

      {/* Unlock prompt to REMOVE the lock (A4) */}
      <PasscodePromptModal
        isOpen={isUnlockPromptOpen}
        noteTitle={note.title || 'Nota'}
        hint={note.passwordHint}
        hasError={unlockError}
        onClose={() => {
          setIsUnlockPromptOpen(false);
          setUnlockError(false);
        }}
        onUnlock={handleConfirmUnlock}
      />

      {/* Delete confirmation (C5) */}
      <AppleConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Apagar nota?"
        message="A nota ficará na lixeira por 30 dias e após esse prazo será apagada automaticamente deste aparelho."
        confirmText="Mover para Apagadas"
        cancelText="Cancelar"
        destructive
        onConfirm={() => {
          setIsDeleteConfirmOpen(false);
          onDeleteNote(note.id);
        }}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Auto-sort Alert (Tela 14) */}
      <AppleAlert
        isOpen={isAutoSortAlertOpen}
        title="Ativar Ordenação Automática?"
        message="Deseja mover os itens marcados automaticamente para o final das suas listas?"
        confirmText="Ativar Ordenação"
        cancelText="Agora Não"
        onConfirm={() => {
          setAutoSortChecklist(true);
          setIsAutoSortAlertOpen(false);
          if (note.checklist) {
            const sorted = [
              ...note.checklist.filter((i) => !i.checked),
              ...note.checklist.filter((i) => i.checked),
            ];
            checklistRef.current = sorted;
            onUpdateNote(note.id, { checklist: sorted });
          }
        }}
        onCancel={() => {
          setAutoSortChecklist(false);
          setIsAutoSortAlertOpen(false);
        }}
      />
      {/* Move Folder Modal */}
      {isMoveFolderOpen && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mover nota para pasta"
            className="bg-white/95 backdrop-blur-2xl w-full max-w-sm rounded-[14px] overflow-hidden"
          >
            <div className="p-4 text-center border-b border-gray-200">
              <h3 className="font-semibold text-lg">Mover para...</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onMoveNote(folder.id);
                    setIsMoveFolderOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-100 transition last:border-b-0"
                >
                  {folder.name}
                </button>
              ))}
            </div>
            <div className="p-2 bg-gray-50">
              <button
                onClick={() => setIsMoveFolderOpen(false)}
                className="w-full py-2 font-semibold text-[#D97706]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Scan Viewer Modal */}
      {isScanViewerOpen && note.scanDataUrl && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black select-none animate-in fade-in duration-200">
          <div className="h-[48px] px-4 flex items-center justify-between border-b border-neutral-800 bg-black/90">
            <button
              onClick={() => setIsScanViewerOpen(false)}
              className="text-[17px] text-[#E49F13] hover:opacity-80 active:opacity-60 transition"
            >
              Fechar
            </button>
            <span className="text-[14px] font-semibold text-white">
              Documento Escaneado
            </span>
            <div className="w-[60px]" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden p-4">
            <img
              src={note.scanDataUrl}
              alt="Documento escaneado"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Clipboard Success Toast */}
      {clipboardSuccess && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-[14px] font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in duration-200">
          Copiado para a área de transferência
        </div>
      )}
      {shareError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white text-[14px] font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in duration-200">
          Nada para compartilhar nesta nota
        </div>
      )}
    </div>
  );
};
