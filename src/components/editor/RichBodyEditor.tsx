import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { BodySpan } from '../../types/notes';

export interface SpanSnapshot {
  spans: BodySpan[];
  plain: string;
}

export interface RichBodyEditorHandle {
  /** Re-read the DOM into spans. Returns false when the editor is empty. */
  reconcile: () => { spans: BodySpan[]; plain: string } | null;
  /** Apply letter/marker color to the current selection. Returns before/after. */
  applyToSelection: (kind: 'color' | 'bg', value: string) => { before: SpanSnapshot; after: SpanSnapshot } | null;
  /** Remove all inline colors inside the current selection. Returns before/after. */
  clearSelectionFormat: () => { before: SpanSnapshot; after: SpanSnapshot } | null;
  /** Insert text at the caret (lists, indent). */
  insertTextAtCaret: (text: string) => void;
  /** Select a plain-text range (search results, indent). */
  selectPlainRange: (start: number, end: number) => void;
  /** Plain-text caret offset, or -1 when the caret is outside the editor. */
  caretOffset: () => number;
  /** Plain-text length of the current content. */
  plainLength: () => number;
  focus: () => void;
  element: () => HTMLDivElement | null;
}

interface RichBodyEditorProps {
  noteId: string;
  spans?: BodySpan[];
  body: string;
  /** Bump to force the DOM to refresh from spans (whole-text actions). */
  rev: number;
  className?: string;
  onChange: (spans: BodySpan[] | undefined, plain: string) => void;
  /** Return true to take over the Enter key (list continuation). */
  onEnterPress?: () => boolean;
  /** Body font size in px (default 17). */
  fontSize?: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function spansToHtml(spans: BodySpan[] | undefined, body: string): string {
  const list: BodySpan[] =
    spans && spans.length > 0 ? spans : body ? [{ text: body }] : [];
  return list
    .map((s) => {
      const style: string[] = [];
      if (s.color) style.push(`color:${s.color}`);
      if (s.bg) style.push(`background-color:${s.bg}`);
      const inner = escapeHtml(s.text).replace(/\n/g, '<br>');
      return style.length > 0
        ? `<span style="${style.join(';')}">${inner}</span>`
        : inner;
    })
    .join('');
}

function cssColorToHex(raw: string): string | undefined {
  const c = raw.trim();
  if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return undefined;
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (hex.test(c)) {
    if (c.length === 4) {
      return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toUpperCase();
    }
    return c.toUpperCase();
  }
  const m = c.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return undefined;
    const r = Math.min(255, parseInt(m[1], 10));
    const g = Math.min(255, parseInt(m[2], 10));
    const b = Math.min(255, parseInt(m[3], 10));
    return (
      '#' +
      [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    );
  }
  return undefined;
}

interface InlineStyle {
  color?: string;
  bg?: string;
}

const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'LI',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'PRE',
  'TR',
]);

function inlineStyleOf(el: Element): InlineStyle {
  const out: InlineStyle = {};
  const htmlEl = el as HTMLElement;
  if (htmlEl.style) {
    const c = cssColorToHex(htmlEl.style.color || '');
    if (c) out.color = c;
    const b = cssColorToHex(htmlEl.style.backgroundColor || '');
    if (b) out.bg = b;
  }
  if (el.tagName === 'FONT') {
    const attr = el.getAttribute('color');
    if (attr) {
      const c = cssColorToHex(attr);
      if (c) out.color = c;
    }
  }
  return out;
}

function walk(node: Node, inherited: InlineStyle, out: BodySpan[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = node.nodeValue || '';
    if (v !== '') out.push({ text: v, ...inherited });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName;
  if (tag === 'BR') {
    out.push({ text: '\n' });
    return;
  }
  if (tag === 'SCRIPT' || tag === 'STYLE') return;
  // A block starts a new line (unless already at one) — without this,
  // "line1<div>line2</div>" collapses into a single line on reload.
  if (BLOCK_TAGS.has(tag)) {
    const prev = out[out.length - 1];
    if (prev && !prev.text.endsWith('\n')) out.push({ text: '\n' });
  }
  const merged = { ...inherited, ...inlineStyleOf(el) };
  el.childNodes.forEach((child) => walk(child, merged, out));
  if (BLOCK_TAGS.has(tag)) {
    const last = out[out.length - 1];
    if (!last || !last.text.endsWith('\n')) out.push({ text: '\n' });
  }
}

function mergeSpans(list: BodySpan[]): BodySpan[] {
  const out: BodySpan[] = [];
  for (const s of list) {
    if (s.text === '') continue;
    const last = out[out.length - 1];
    if (last && last.color === s.color && last.bg === s.bg) {
      last.text += s.text;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

// Deterministic styling: split spans at the selection edges and set/clear
// one attribute inside. No execCommand — identical on every WebView.
function styleRange(
  spans: BodySpan[] | undefined,
  plain: string,
  start: number,
  end: number,
  kind: 'color' | 'bg',
  value: string | null
): BodySpan[] {
  const src: BodySpan[] =
    spans && spans.length > 0 ? spans : plain ? [{ text: plain }] : [];
  const out: BodySpan[] = [];
  let pos = 0;
  for (const sp of src) {
    const len = sp.text.length;
    const a = pos;
    const b = pos + len;
    pos = b;
    const cuts = [a, b];
    if (start > a && start < b) cuts.push(start);
    if (end > a && end < b) cuts.push(end);
    cuts.sort((x, y) => x - y);
    for (let i = 0; i < cuts.length - 1; i++) {
      const cs = cuts[i];
      const ce = cuts[i + 1];
      if (ce <= cs) continue;
      const cell: BodySpan = { text: sp.text.slice(cs - a, ce - a) };
      if (sp.color) cell.color = sp.color;
      if (sp.bg) cell.bg = sp.bg;
      if (cs >= start && ce <= end) {
        if (value === null) {
          if (kind === 'color') delete cell.color;
          else delete cell.bg;
        } else if (kind === 'color') {
          cell.color = value;
        } else {
          cell.bg = value;
        }
      }
      out.push(cell);
    }
  }
  return mergeSpans(out);
}

export function domToSpans(root: HTMLElement): { spans: BodySpan[]; plain: string } {
  const raw: BodySpan[] = [];
  root.childNodes.forEach((child) => walk(child, {}, raw));
  const spans = mergeSpans(raw);
  return { spans, plain: spans.map((s) => s.text).join('') };
}

function selectionInside(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const anchor = sel.anchorNode;
  if (!anchor) return false;
  const el = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element);
  return !!el && (root === el || root.contains(el));
}

// Flat-DOM segments: with defaultParagraphSeparator='br' the editor stays
// as top-level text nodes + <br>, so plain-text offsets map exactly.
// (Nested pasted content falls back to an approximation.)
interface FlatSeg {
  node: Node;
  start: number;
  len: number;
  brIndex: number; // child index when node is <br>, else -1
}

function flatSegments(root: HTMLElement): { segs: FlatSeg[]; length: number } {
  const segs: FlatSeg[] = [];
  let pos = 0;
  const kids = root.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.nodeType === Node.TEXT_NODE) {
      const len = child.nodeValue?.length || 0;
      segs.push({ node: child, start: pos, len, brIndex: -1 });
      pos += len;
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName === 'BR'
    ) {
      segs.push({ node: child, start: pos, len: 1, brIndex: i });
      pos += 1;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const t = (child as HTMLElement).innerText ?? '';
      segs.push({ node: child, start: pos, len: t.length, brIndex: -1 });
      pos += t.length;
    }
  }
  return { segs, length: pos };
}

function locateOffset(
  root: HTMLElement,
  target: number
): { node: Node; offset: number } {
  const { segs, length } = flatSegments(root);
  const t = Math.max(0, Math.min(target, length));
  if (t >= length) return { node: root, offset: root.childNodes.length };
  for (const s of segs) {
    if (t >= s.start && t < s.start + s.len) {
      if (s.brIndex >= 0) return { node: root, offset: s.brIndex };
      if (s.node.nodeType === Node.TEXT_NODE) {
        return { node: s.node, offset: t - s.start };
      }
      return { node: s.node, offset: 0 };
    }
  }
  return { node: root, offset: root.childNodes.length };
}

function offsetOfPosition(root: HTMLElement, node: Node, off: number): number {
  const { segs } = flatSegments(root);
  for (const s of segs) {
    if (s.node === node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return s.start + Math.min(off, s.len);
      }
      return s.start;
    }
    if (node === root) {
      // Caret directly under root between children: sum flat lens before index
      let acc = 0;
      const kids = root.childNodes;
      for (let i = 0; i < Math.min(off, kids.length); i++) {
        const k = kids[i];
        if (k.nodeType === Node.TEXT_NODE) acc += k.nodeValue?.length || 0;
        else if (k.nodeType === Node.ELEMENT_NODE && (k as Element).tagName === 'BR') acc += 1;
        else if (k.nodeType === Node.ELEMENT_NODE) acc += ((k as HTMLElement).innerText ?? '').length;
      }
      return acc;
    }
  }
  // Inside nested content: approximate to the segment start
  for (const s of segs) {
    if (s.node.nodeType === Node.ELEMENT_NODE && (s.node as Element).contains(node)) {
      return s.start;
    }
  }
  return -1;
}

export const RichBodyEditor = forwardRef<RichBodyEditorHandle, RichBodyEditorProps>(
  function RichBodyEditor({ noteId, spans, body, rev, className, onChange, onEnterPress, fontSize = 17 }, ref) {
    const divRef = useRef<HTMLDivElement>(null);

    // Mount / note switch / external whole-text update
    useEffect(() => {
      const el = divRef.current;
      if (el) el.innerHTML = spansToHtml(spans, body);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId, rev]);

    // Keep the DOM flat (text + <br>) so offsets stay exact; Enter then
    // inserts <br> instead of nested <div>s.
    useEffect(() => {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'br');
      } catch {
        // ignore
      }
    }, []);

    const flattenNestedBlocks = () => {
      const el = divRef.current;
      if (!el) return;
      if (!el.querySelector('div,p,li,ul,ol,h1,h2,h3,h4,blockquote,pre')) return;
      const { spans: next, plain } = domToSpans(el);
      el.innerHTML = spansToHtml(next.length > 0 ? next : undefined, plain);
      onChange(next.length > 0 ? next : undefined, plain);
    };

    const reconcile = () => {
      const el = divRef.current;
      if (!el) return null;
      const { spans: next, plain } = domToSpans(el);
      if (plain === '') {
        el.innerHTML = '';
        onChange(undefined, '');
        return { spans: [], plain: '' };
      }
      onChange(next, plain);
      return { spans: next, plain };
    };

    const doSelect = (start: number, end: number) => {
      const el = divRef.current;
      if (!el) return;
      const range = document.createRange();
      const sel = window.getSelection();
      if (!sel) return;
      try {
        const s = locateOffset(el, start);
        const e = locateOffset(el, end);
        range.setStart(s.node, s.offset);
        range.setEnd(e.node, e.offset);
        sel.removeAllRanges();
        sel.addRange(range);
        el.focus();
        const rect = range.getBoundingClientRect();
        if (rect) {
          const y = rect.top + window.scrollY - window.innerHeight / 2;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      } catch {
        // ignore out-of-range selections
      }
    };

    const orderedSelection = (): { start: number; end: number } | null => {
      const el = divRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
      if (!selectionInside(el)) return null;
      const range = sel.getRangeAt(0);
      const a = offsetOfPosition(el, range.startContainer, range.startOffset);
      const b = offsetOfPosition(el, range.endContainer, range.endOffset);
      if (a < 0 || b < 0) return null;
      return { start: Math.min(a, b), end: Math.max(a, b) };
    };

    useImperativeHandle(ref, () => ({
      reconcile,
      applyToSelection: (kind, value) => {
        const el = divRef.current;
        if (!el) return null;
        const range = orderedSelection();
        if (!range || range.end <= range.start) return null;
        const before = domToSpans(el);
        const styled = styleRange(before.spans, before.plain, range.start, range.end, kind, value);
        el.innerHTML = spansToHtml(styled.length > 0 ? styled : undefined, before.plain);
        onChange(styled.length > 0 ? styled : undefined, before.plain);
        doSelect(range.start, range.end);
        return { before, after: { spans: styled, plain: before.plain } };
      },
      clearSelectionFormat: () => {
        const el = divRef.current;
        if (!el) return null;
        const sel = window.getSelection();
        const hadSelection = sel && !sel.isCollapsed && selectionInside(el);
        const before = domToSpans(el);
        if (!hadSelection) return null;
        const range = orderedSelection();
        if (!range || range.end <= range.start) return null;
        const noColor = styleRange(before.spans, before.plain, range.start, range.end, 'color', null);
        const cleared = styleRange(noColor, before.plain, range.start, range.end, 'bg', null);
        el.innerHTML = spansToHtml(cleared.length > 0 ? cleared : undefined, before.plain);
        onChange(cleared.length > 0 ? cleared : undefined, before.plain);
        doSelect(range.start, range.end);
        return { before, after: { spans: cleared, plain: before.plain } };
      },
      insertTextAtCaret: (text) => {
        const el = divRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (!sel || !selectionInside(el)) {
          // Append at the end
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        const active = window.getSelection();
        if (!active || active.rangeCount === 0) return;
        const range = active.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        active.removeAllRanges();
        active.addRange(range);
        reconcile();
      },
      selectPlainRange: (start, end) => {
        doSelect(start, end);
      },
      plainLength: () => {
        const el = divRef.current;
        if (!el) return 0;
        return (el.innerText || '').length;
      },
      caretOffset: () => {
        const el = divRef.current;
        const sel = window.getSelection();
        if (!el || !sel || sel.rangeCount === 0) return -1;
        const range = sel.getRangeAt(0);
        const anchor = range.startContainer;
        const holder =
          anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element);
        if (!holder || (holder !== el && !el.contains(holder))) return -1;
        return offsetOfPosition(el, anchor, range.startOffset);
      },
      focus: () => divRef.current?.focus(),
      element: () => divRef.current,
    }));

    return (
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder="Comece a digitar..."
        aria-label="Texto da nota"
        onInput={reconcile}
        style={{ fontSize }}
        onFocus={() => {
          try {
            document.execCommand('defaultParagraphSeparator', false, 'br');
          } catch {
            // ignore
          }
        }}
        onBlur={flattenNestedBlocks}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnterPress && onEnterPress()) {
            e.preventDefault();
          }
        }}
        className={className}
      />
    );
  }
);
