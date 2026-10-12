import type { Note } from '../types/notes';

// A1: share the whole note content, not just the body.
// WhatsApp/Telegram ignore EXTRA_SUBJECT, so the title must be
// part of the text itself.
export function buildShareText(n: Note): string {
  const parts: string[] = [];
  const title = (n.title || '').trim();
  if (title) parts.push(title);
  const body = (n.body || '').trim();
  if (body) parts.push(body);
  if (n.checklist && n.checklist.length > 0) {
    const lines = n.checklist
      .filter((i) => i.text.trim() !== '')
      .map((i) => `${i.checked ? '☑' : '☐'} ${i.text.trim()}`);
    if (lines.length > 0) parts.push(lines.join('\n'));
  }
  if (n.table) {
    const rows = [n.table.headers, ...n.table.rows]
      .map((r) => r.join(' | ').trim())
      .filter((r) => r.replace(/[\s|]/g, '') !== '');
    if (rows.length > 0) parts.push(rows.join('\n'));
  }
  return parts.join('\n\n').trim();
}
