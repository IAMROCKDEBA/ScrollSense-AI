import type { ReactNode } from "react";

/** Tiny, safe markdown subset for chat: paragraphs, - / 1. lists, **bold**, `code`. Never uses dangerouslySetInnerHTML. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    nodes.push(
      token.startsWith("**") ? (
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      ) : (
        <code key={key++} className="rounded bg-foreground/10 px-1 py-0.5 text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      )
    );
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const bullet = lines.every((line) => /^\s*[-*•]\s+/.test(line));
        const numbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));
        if (bullet || numbered) {
          const Tag = numbered ? "ol" : "ul";
          return (
            <Tag key={blockIndex} className={numbered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={blockIndex}>
            {lines.map((line, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
