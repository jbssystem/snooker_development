import type { ReactNode } from 'react';

export type ReportSection = {
  /** Heading text without the leading `##`; null for the intro block before the first heading. */
  heading: string | null;
  body: string;
};

/**
 * Splits an AI report markdown into sections by level-2 (`##`) headings.
 * Text before the first heading becomes an intro section with `heading: null`.
 * Level-1 (`#`) headings are treated as plain heading lines too.
 */
export function splitReportSections(markdown: string): ReportSection[] {
  const lines = (markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const sections: ReportSection[] = [];
  let current: ReportSection | null = null;
  const headingRe = /^#{1,3}\s+(.*)$/;

  for (const line of lines) {
    const match = headingRe.exec(line.trim());
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1]!.trim(), body: '' };
    } else {
      if (!current) current = { heading: null, body: '' };
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);

  return sections
    .map((section) => ({ ...section, body: section.body.trim() }))
    .filter((section) => section.heading !== null || section.body.length > 0);
}

/** Renders bold (`**x**`) and inline code (`` `x` ``) inside a single line. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {match[2]}
        </strong>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-background-elevated px-1 py-0.5 font-mono text-xs text-text-primary">
          {match[3]}
        </code>,
      );
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** Lightweight markdown renderer: paragraphs, bullet lists and pipe tables. */
export function MarkdownLite({ text }: { text: string }): ReactNode {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      i += 1;
      continue;
    }

    // Table
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1]!)) {
      const header = splitTableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]!)) {
        rows.push(splitTableCells(lines[i]!));
        i += 1;
      }
      blocks.push(
        <div key={key++} className="sunken overflow-x-auto rounded-md border border-border-subtle">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th key={c} className="border-b border-border-subtle px-3 py-2 text-left font-semibold text-text-primary">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="odd:bg-white/[0.02]">
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-border-subtle/60 px-3 py-2 text-text-secondary">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="ml-1 grid gap-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm leading-6 text-text-secondary">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={key++} className="ml-1 grid list-inside list-decimal gap-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-6 text-text-secondary marker:text-brand-accent">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-special lines)
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim().length > 0 &&
      !/^\s*[-*]\s+/.test(lines[i]!) &&
      !/^\s*\d+\.\s+/.test(lines[i]!) &&
      !isTableRow(lines[i]!)
    ) {
      paragraph.push(lines[i]!.trim());
      i += 1;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-6 text-text-secondary">
        {renderInline(paragraph.join(' '))}
      </p>,
    );
  }

  return <div className="grid gap-3">{blocks}</div>;
}
