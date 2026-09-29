'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Renders structured markdown (clean headings, normal readable text, bullet lists, tables, links)
 * without harsh or heavy bolding, stripping raw markdown artifacts cleanly.
 */
export function MarkdownContent({ content, className = '', isUser = false }: MarkdownContentProps) {
  if (!content) return null;

  if (isUser) {
    return <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>{content}</div>;
  }

  // Pre-process: normalize custom table tags [TABLE START] ... [TABLE END] to markdown tables if present
  let normalized = content;
  if (normalized.includes('[TABLE START]')) {
    normalized = normalized.replace(/\[TABLE START\]([\s\S]*?)\[TABLE END\]/g, (match, tableBody) => {
      const lines = tableBody.trim().split('\n').filter((l: string) => l.trim().length > 0);
      if (lines.length === 0) return '';
      
      const formattedLines = lines.map((line: string) => {
        if (!line.includes('|')) return line;
        const parts = line.split('|').map((p: string) => p.trim());
        return '| ' + parts.join(' | ') + ' |';
      });

      // Insert separator after header if needed
      if (formattedLines.length >= 1 && !formattedLines[1]?.includes('---')) {
        const colCount = formattedLines[0].split('|').length - 2;
        const sep = '| ' + Array(Math.max(colCount, 1)).fill('---').join(' | ') + ' |';
        formattedLines.splice(1, 0, sep);
      }
      return '\n\n' + formattedLines.join('\n') + '\n\n';
    });
  }

  // Split content into blocks by double newlines, preserving table blocks
  const rawBlocks = normalized.split(/\n{2,}/);
  const elements: React.ReactNode[] = [];

  rawBlocks.forEach((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // 1. Table Detection (| col1 | col2 |)
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const isTable = lines.length >= 2 && lines.every(l => l.startsWith('|') && l.endsWith('|'));
    if (isTable) {
      const headerLine = lines[0];
      const hasSep = lines[1] && lines[1].includes('---');
      const dataLines = hasSep ? lines.slice(2) : lines.slice(1);

      const headers = headerLine.split('|').map(c => c.trim()).filter(Boolean);

      elements.push(
        <div key={`table-${blockIdx}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-800 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="py-2.5 px-3.5 tracking-wider">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dataLines.map((row, rIdx) => {
                const cells = row.split('|').map(c => c.trim()).filter(Boolean);
                return (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3.5 leading-relaxed">
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
      return;
    }

    // 2. Heading 1 (# Heading)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${blockIdx}`} className="text-base font-semibold text-slate-900 mt-3.5 mb-1 tracking-tight border-b border-slate-100 pb-1">
          {renderInline(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
      return;
    }

    // 3. Heading 2 (## Heading)
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${blockIdx}`} className="text-sm sm:text-base font-semibold text-slate-900 mt-3 mb-1 tracking-tight">
          {renderInline(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      return;
    }

    // 4. Heading 3 (### Heading)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${blockIdx}`} className="text-xs sm:text-sm font-semibold text-emerald-800 mt-2.5 mb-1 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-3 rounded-full bg-emerald-600 inline-block"></span>
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }

    // 5. Bullet Lists (- item, * item, • item)
    const isBulletList = lines.every(l => /^[-*•]\s+/.test(l));
    if (isBulletList) {
      elements.push(
        <ul key={`ul-${blockIdx}`} className="my-2 space-y-1.5 pl-1">
          {lines.map((item, iIdx) => {
            const cleanItem = item.replace(/^[-*•]\s+/, '');
            return (
              <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                <span className="flex-1">{renderInline(cleanItem)}</span>
              </li>
            );
          })}
        </ul>
      );
      return;
    }

    // 6. Numbered Lists (1. item, 2. item)
    const isNumberedList = lines.every(l => /^\d+\.\s+/.test(l));
    if (isNumberedList) {
      elements.push(
        <ol key={`ol-${blockIdx}`} className="my-2 space-y-1.5 pl-1">
          {lines.map((item, iIdx) => {
            const numMatch = item.match(/^(\d+)\.\s+(.*)$/);
            const num = numMatch ? numMatch[1] : `${iIdx + 1}`;
            const cleanItem = numMatch ? numMatch[2] : item;
            return (
              <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{renderInline(cleanItem)}</span>
              </li>
            );
          })}
        </ol>
      );
      return;
    }

    // 7. Standard Paragraph
    elements.push(
      <p key={`p-${blockIdx}`} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-1">
        {renderInline(trimmed)}
      </p>
    );
  });

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Parses inline formatting: [links](url), `code`, and strips harsh asterisks (**) to normal readable text
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return text;

  // Regex to match:
  // 1. Links: [label](url)
  // 2. Bold: **bold** or __bold__
  // 3. Italic: *italic* or _italic_
  // 4. Code: `code`
  // 5. Line break: \n
  const regex = /(\[.*?\]\(https?:\/\/.*?\)|\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_|\n)/g;
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
          className="text-emerald-700 hover:text-emerald-900 underline decoration-emerald-400 underline-offset-2 transition-colors inline-flex items-center gap-0.5"
        >
          {label}
          <ExternalLink className="w-3 h-3 inline ml-0.5 shrink-0 opacity-70" />
        </a>
      );
    }

    // Bold: **text** -> Render clean normal/medium text without harsh bolding
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2);
      return (
        <span key={index} className="font-medium text-slate-900">
          {renderInline(inner)}
        </span>
      );
    }

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200">
          {inner}
        </code>
      );
    }

    // Italic: *text* -> Render clean normal text
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1);
      return (
        <span key={index} className="text-slate-700">
          {renderInline(inner)}
        </span>
      );
    }

    // Line break: \n
    if (part === '\n') {
      return <br key={index} />;
    }

    return part;
  });
}

export default MarkdownContent;
