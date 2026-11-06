"use client";

import { Fragment, useState } from "react";

const TOKEN =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(import|from|export|default|const|let|var|function|async|await|return|if|else|for|while|throw|new|try|catch|class|extends|typeof|of|in|def|lambda|None|True|False|null|undefined|true|false)\b|\b(\d+(?:\.\d+)?)\b/g;
const CLASS = ["text-[#8f8577] italic", "text-[#f4c48a]", "text-[#ff8a75]", "text-[#9db8ff]"];

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
    <div className="flex h-full max-h-[30rem] min-w-0 flex-col overflow-hidden rounded-2xl bg-ink lg:max-h-none">
      <div role="tablist" aria-label="Sample files" className="flex min-w-0 gap-1 overflow-x-auto border-b border-white/10 px-3 pt-2">
        {files.map((f, i) => (
          <button
            key={f.name}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`shrink-0 rounded-t-lg px-3.5 py-2 font-mono text-base transition ${i === active ? "bg-white/[0.08] text-[#f3eee6]" : "text-[#a79e90] hover:text-[#f3eee6]"}`}
          >
            {f.name}
          </button>
        ))}
      </div>
      <div className="code-scroll flex min-h-[18rem] flex-1 overflow-auto font-mono text-base leading-7 lg:min-h-0">
        <pre aria-hidden className="sticky left-0 shrink-0 select-none bg-ink py-4 pl-4 pr-3 text-right text-[#5d564c]">
          {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
        </pre>
        <pre className="min-w-0 flex-1 py-4 pr-5 text-[#e9e1d4]">
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
