"use client";

import { Fragment, useState } from "react";

const TOKEN =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(import|from|export|default|const|let|var|function|async|await|return|if|else|for|while|throw|new|try|catch|class|extends|typeof|of|in|def|lambda|None|True|False|null|undefined|true|false)\b|\b(\d+(?:\.\d+)?)\b/g;
const CLASS = ["text-white/35 italic", "text-[#b5f5c8]", "text-[#c4b5ff]", "text-[#ffc387]"];

function highlight(src: string) {
  const out: { text: string; cls?: string }[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    const group = m.slice(1).findIndex((g) => g !== undefined);
    out.push({ text: m[0], cls: CLASS[group] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export function CodeView({ files }: { files: { name: string; content: string }[] }) {
  const [active, setActive] = useState(0);
  const file = files[Math.min(active, files.length - 1)];
  if (!file) return null;
  const lines = file.content.replace(/\n$/, "").split("\n").length;
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#07080d]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
        <span aria-hidden className="flex gap-1.5 pr-2">
          <span className="h-3 w-3 rounded-full bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-white/10" />
          <span className="h-3 w-3 rounded-full bg-white/10" />
        </span>
        <div role="tablist" aria-label="Sample files" className="flex min-w-0 overflow-x-auto">
          {files.map((f, i) => (
            <button
              key={f.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`shrink-0 border-b-2 px-3 py-2.5 font-mono text-base transition ${
                i === active ? "border-mint text-white" : "border-transparent text-white/45 hover:text-white/80"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex max-h-[26rem] overflow-auto font-mono text-base leading-7">
        <pre aria-hidden className="sticky left-0 shrink-0 select-none bg-[#07080d] py-4 pl-4 pr-3 text-right text-white/20">
          {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
        </pre>
        <pre className="min-w-0 flex-1 py-4 pr-4 text-white/85">
          <code>
            {highlight(file.content).map((t, i) =>
              t.cls ? (
                <span key={i} className={t.cls}>
                  {t.text}
                </span>
              ) : (
                <Fragment key={i}>{t.text}</Fragment>
              ),
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
