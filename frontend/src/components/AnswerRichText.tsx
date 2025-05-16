import CitationPopover from "./CitationPopover";

export default function AnswerRichText({
    answer,
    sources,
    onHighlight,
  }: {
    answer: string;
    sources: { id: number; snippet: string }[];
    onHighlight: (snippet: string | null) => void;
  }) {
    const parts = answer.split(/(\[\d+\])/g);

    return (
      <div className="leading-7">
        {parts.map((part, idx) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (!m) return part;

          const num = Number(m[1]);
          const src = sources.find((s) => s.id === num);
          if (!src) return part;

          return (
            <CitationPopover
              key={idx}
              num={num}
              snippet={src.snippet}
              onMouseEnter={() => onHighlight(src.snippet)}
              onMouseLeave={() => onHighlight(null)}
            />
          );
        })}
      </div>
    );
  }
