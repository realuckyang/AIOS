// Markdown 渲染:marked + DOMPurify(本地依赖,无 CDN)。
import { memo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function renderMarkdown(text: string): string {
  try {
    const html = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(html);
  } catch {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />;
});
