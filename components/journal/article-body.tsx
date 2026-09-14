import * as React from 'react';
import Link from 'next/link';
import { JournalFigure } from '@/components/journal/figures';

/*
  The journal's article body: a deliberately small Markdown dialect, rendered to React on the
  server.

  Why not a Markdown library: the articles need exactly this set, every element has to wear the
  ebru type and rules rather than a library's defaults, and rendering to elements (never to an
  HTML string) means nothing an administrator types can become markup. Everything below becomes
  text or one of a fixed set of elements; there is no dangerouslySetInnerHTML anywhere.

  The dialect, which the admin screen's hint repeats:

    ## Heading            a section, listed in the table of contents
    ### Subheading
    - item / 1. item      lists
    > text                a callout; a first line of **Bold** becomes its label
    | a | b |             a table, with |---| under the header row
    [[figure:key]]        one of the drawn figures in components/journal/figures.tsx
    **bold** *italic* `code` [text](/path or https://…)
    [^3]                  citation: links to source 3 in the article's source list
*/

type Block =
  | { kind: 'h2' | 'h3'; text: string; id: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'figure'; key: string };

/** A URL fragment from heading text: stable, readable, and free of the Markdown around it. */
export function headingId(text: string): string {
  return plain(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Heading text with its inline Markdown and citation markers removed. */
function plain(text: string): string {
  return text
    .replace(/\[\^\d+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`]/g, '')
    .trim();
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function parseArticle(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const figure = trimmed.match(/^\[\[figure:([a-z0-9-]+)\]\]$/);
    if (figure) {
      blocks.push({ kind: 'figure', key: figure[1] });
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      const text = heading[2];
      blocks.push({ kind: heading[1].length === 2 ? 'h2' : 'h3', text, id: headingId(text) });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(pattern, ''));
        i++;
      }
      blocks.push({ kind: ordered ? 'ol' : 'ul', items });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ kind: 'quote', lines: quoted.filter(Boolean) });
      continue;
    }

    if (trimmed.startsWith('|') && /^\|?\s*:?-{3,}/.test((lines[i + 1] ?? '').trim())) {
      const head = cells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    /* A paragraph runs until a blank line or the start of another block. */
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,3}\s|[-*]\s|\d+\.\s|>|\||\[\[figure:)/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }

  return blocks;
}

/** The article's sections, for the table of contents. */
export function articleHeadings(markdown: string): { id: string; text: string }[] {
  return parseArticle(markdown).flatMap((b) =>
    b.kind === 'h2' ? [{ id: b.id, text: plain(b.text) }] : []
  );
}

const INLINE =
  /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[\^(\d+)\]|\[([^\]]+)\]\(([^)\s]+)\)/g;

function Inline({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of Array.from(text.matchAll(INLINE))) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const [, bold, italic, code, cite, label, href] = m;
    if (bold !== undefined) {
      out.push(
        <strong key={key++} className="font-semibold text-ink">
          <Inline text={bold} />
        </strong>
      );
    } else if (italic !== undefined) {
      out.push(
        <em key={key++}>
          <Inline text={italic} />
        </em>
      );
    } else if (code !== undefined) {
      out.push(
        <code key={key++} className="rounded-sm bg-paper-sunk px-1 py-0.5 font-mono text-[0.85em]">
          {code}
        </code>
      );
    } else if (cite !== undefined) {
      out.push(
        <sup key={key++} className="ml-0.5 font-mono text-[0.7em]">
          <a
            href={`#source-${cite}`}
            className="text-pigment-indigo no-underline hover:underline"
            aria-label={`Source ${cite}`}
          >
            [{cite}]
          </a>
        </sup>
      );
    } else if (label !== undefined && href !== undefined) {
      const className =
        'text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo';
      out.push(
        href.startsWith('/') ? (
          <Link key={key++} href={href} className={className}>
            {label}
          </Link>
        ) : (
          <a key={key++} href={href} className={className} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        )
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = parseArticle(markdown);

  return (
    <div className="text-base leading-[1.75] text-ink-soft">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2
                key={index}
                id={block.id}
                className="mb-4 mt-14 scroll-mt-40 font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-ink first:mt-0"
              >
                <Inline text={block.text} />
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={index}
                id={block.id}
                className="mb-3 mt-9 scroll-mt-40 font-display text-lg font-semibold tracking-[-0.02em] text-ink"
              >
                <Inline text={block.text} />
              </h3>
            );
          case 'p':
            return (
              <p key={index} className="mb-5">
                <Inline text={block.text} />
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = block.kind;
            return (
              <List
                key={index}
                className={`mb-6 space-y-2 pl-6 marker:text-ink-faint ${
                  block.kind === 'ol' ? 'list-decimal marker:font-mono marker:text-sm' : 'list-disc'
                }`}
              >
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <Inline text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case 'quote': {
            const [first, ...rest] = block.lines;
            const label = first?.match(/^\*\*([^*]+)\*\*$/)?.[1];
            const body = label ? rest : block.lines;
            return (
              <aside
                key={index}
                className="my-8 border-l-2 border-pigment-indigo bg-paper-sunk px-5 py-4"
              >
                {label && (
                  <p className="mb-2 font-mono text-2xs uppercase tracking-[0.16em] text-pigment-indigo">
                    {label}
                  </p>
                )}
                {body.map((line, j) =>
                  /^[-*]\s+/.test(line) ? (
                    <p key={j} className="mb-1.5 flex gap-2.5 last:mb-0">
                      <span aria-hidden="true" className="text-ink-faint">
                        –
                      </span>
                      <span>
                        <Inline text={line.replace(/^[-*]\s+/, '')} />
                      </span>
                    </p>
                  ) : (
                    <p key={j} className="mb-2 last:mb-0">
                      <Inline text={line} />
                    </p>
                  )
                )}
              </aside>
            );
          }
          case 'table':
            return (
              <div key={index} className="my-8 overflow-x-auto border border-rule">
                <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                  <thead className="bg-paper-sunk">
                    <tr>
                      {block.head.map((h, j) => (
                        <th
                          key={j}
                          scope="col"
                          className="border-b border-rule px-4 py-2.5 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint"
                        >
                          <Inline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-b border-rule last:border-0">
                        {row.map((c, j) => (
                          <td
                            key={j}
                            className={`px-4 py-2.5 align-top leading-relaxed ${
                              j === 0 ? 'font-medium text-ink' : ''
                            }`}
                          >
                            <Inline text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'figure':
            return <JournalFigure key={index} figureKey={block.key} />;
        }
      })}
    </div>
  );
}
