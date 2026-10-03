'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Robust, structured Markdown content renderer for admission & web search chats.
 * Accurately parses headings, bullet lists, numbered lists, markdown tables,
 * bold text, code tags, and links without awkward text wrapping or broken lines.
 */
export function MarkdownContent({ content, className = '', isUser = false }: MarkdownContentProps) {
  if (!content) return null;

  if (isUser) {
    return <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>{content}</div>;
  }

  // Pre-process: normalize custom table tags [TABLE START] ... [TABLE END]
  let normalized = content;
  if (normalized.includes('[TABLE START]')) {
    normalized = normalized.replace(/\[TABLE START\]([\s\S]*?)\[TABLE END\]/g, (_, tableBody) => {
      const lines = tableBody.trim().split('\n').filter((l: string) => l.trim().length > 0);
      if (lines.length === 0) return '';
      
      const formattedLines = lines.map((line: string) => {
        if (!line.includes('|')) return line;
        const parts = line.split('|').map((p: string) => p.trim());
        return '| ' + parts.join(' | ') + ' |';
      });

      if (formattedLines.length >= 1 && !formattedLines[1]?.includes('---')) {
        const colCount = formattedLines[0].split('|').length - 2;
        const sep = '| ' + Array(Math.max(colCount, 1)).fill('---').join(' | ') + ' |';
        formattedLines.splice(1, 0, sep);
      }
      return '\n\n' + formattedLines.join('\n') + '\n\n';
    });
  }

  // Split content by lines for stream parsing
  const lines = normalized.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // 1. Markdown Table Check (starts with | and contains |)
    if (line.startsWith('|') && line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 1) {
        const headerLine = tableLines[0];
        const hasSep = tableLines.length > 1 && tableLines[1].includes('---');
        const dataLines = hasSep ? tableLines.slice(2) : tableLines.slice(1);
        const headers = headerLine.split('|').map(c => c.trim()).filter(Boolean);

        elements.push(
          <div key={`tbl-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-[#0B2545] font-extrabold text-[11px] border-b border-slate-200">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2 px-3 tracking-normal font-bold">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dataLines.map((row, rIdx) => {
                  const cells = row.split('|').map(c => c.trim()).filter(Boolean);
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1.5 px-3 leading-relaxed">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Heading 1 (# ...)
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-base sm:text-lg font-extrabold text-[#0B2545] mt-3.5 mb-1.5 tracking-tight border-b border-slate-100 pb-1">
          {renderInline(line.replace(/^#\s+/, ''))}
        </h2>
      );
      i++;
      continue;
    }

    // 3. Heading 2 (## ...)
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm sm:text-base font-extrabold text-[#0B2545] mt-3 mb-1 tracking-tight">
          {renderInline(line.replace(/^##\s+/, ''))}
        </h3>
      );
      i++;
      continue;
    }

    // 4. Heading 3 (### ...)
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs sm:text-[13.5px] font-extrabold text-[#0B2545] mt-2.5 mb-1 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F2B54A]" />
          {renderInline(line.replace(/^###\s+/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    // 5. Bullet List Item (- ... or * ... or • ...)
    if (/^[-*•]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }

      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-0.5">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] text-slate-800 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0B2545] mt-2 shrink-0 opacity-80" />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Numbered List Item (1. ... 2. ...)
    if (/^\d+\.\s+/.test(line)) {
      const numItems: { num: string; text: string }[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemLine = lines[i].trim();
        const match = itemLine.match(/^(\d+)\.\s+(.*)$/);
        numItems.push({
          num: match ? match[1] : `${numItems.length + 1}`,
          text: match ? match[2] : itemLine
        });
        i++;
      }

      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-0.5">
          {numItems.map((item, nIdx) => (
            <li key={nIdx} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] text-slate-800 leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-[#F4F6F9] text-[#0B2545] border border-[#D5DCE6] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {item.num}
              </span>
              <span className="flex-1">{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Regular Paragraph Text
    elements.push(
      <p key={`p-${i}`} className="text-[14.5px] sm:text-[15px] text-slate-800 leading-[1.65] my-1.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-2 text-[14.5px] sm:text-[15px] ${className}`}>{elements}</div>;
}

/**
 * Parses inline formatting: [links](url), `code`, **bold**, *italic*
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return text;

  const regex = /(\[.*?\]\(https?:\/\/.*?\)|\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0B2545] font-bold hover:text-[#153866] underline decoration-[#F2B54A] underline-offset-2 transition-colors inline-flex items-center gap-0.5"
        >
          {label}
          <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 shrink-0 opacity-70" />
        </a>
      );
    }

    // Bold: **text**
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-extrabold text-[#1B2433]">
          {renderInline(inner)}
        </strong>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 text-[#0B2545] font-mono text-[11px] border border-slate-200">
          {inner}
        </code>
      );
    }

    // Italic: *text*
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1);
      return (
        <span key={index} className="text-slate-600 italic">
          {renderInline(inner)}
        </span>
      );
    }

    return part;
  });
}

export default MarkdownContent;
