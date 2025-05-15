import CitationPopover from "./CitationPopover";

export default function AnswerRichText({
  answer,
  sources,
}: {
  answer: string;
  sources: { id: number; snippet: string }[];
}) {
  // 把 "[1]"、"[2]" … 拆成片段
  const parts = answer.split(/(\[\d+\])/g);

  return (
    <div className="leading-7">
      {parts.map((part, idx) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (!m) return part; // 普通文字
        const num = Number(m[1]);
        const src = sources.find((s) => s.id === num);
        if (!src) return part;
        return <CitationPopover key={idx} num={num} snippet={src.snippet} />;
      })}
    </div>
  );
}
