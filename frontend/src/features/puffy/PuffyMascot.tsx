import { useEffect, useRef } from "react";
import type { Mood } from "./types";

const MOUTH: Record<Mood, string> = {
  neutral: "M45 63 Q50 69 55 63",
  happy: "M42 62 Q50 72 58 62",
  love: "M42 62 Q50 72 58 62",
  excited: "M45 63 Q50 69 55 63",
  think: "M45 66 L55 66",
  confused: "M44 66 Q47 62 50 66 T56 66",
  sad: "M45 68 Q50 62 55 68",
};

interface Props {
  mood: Mood;
  /** Mulut membuka-menutup (saat jawaban diketik atau dibacakan). */
  talking: boolean;
  /** Mode balon chat (idle): tangan dan kaki memudar. */
  bubble: boolean;
}

export function PuffyMascot({ mood, talking, bubble }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  // Pupil mengikuti pointer tanpa re-render React.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes) return;
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(3.2, d / 60);
      eyes.setAttribute("transform", `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k * 0.7).toFixed(2)})`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <svg ref={svgRef} className="puffy-svg" viewBox="0 0 100 100" aria-hidden="true"
      data-mood={mood} data-talking={talking} data-bubble={bubble}>
      <g className="puffy-limbs">
        <ellipse className="puffy-foot" cx="30" cy="92" rx="15" ry="8" />
        <ellipse className="puffy-foot" cx="70" cy="92" rx="15" ry="8" />
        <ellipse className="puffy-arm" cx="14" cy="58" rx="9" ry="12" transform="rotate(25 14 58)" />
        <ellipse className="puffy-arm" cx="86" cy="58" rx="9" ry="12" transform="rotate(-25 86 58)" />
      </g>
      <circle className="puffy-body" cx="50" cy="52" r="40" />
      <ellipse className="puffy-shine" cx="34" cy="32" rx="12" ry="7" transform="rotate(-30 34 32)" />

      <g className="puffy-blink">
        <g ref={eyesRef} className="puffy-eyes">
          <ellipse className="puffy-ink" cx="38" cy="48" rx="5.5" ry="9" />
          <ellipse className="puffy-ink" cx="62" cy="48" rx="5.5" ry="9" />
          <ellipse className="puffy-white" cx="39" cy="44" rx="2.4" ry="3.6" />
          <ellipse className="puffy-white" cx="63" cy="44" rx="2.4" ry="3.6" />
        </g>
        <g className="puffy-eyes-happy">
          <path d="M31 50 Q38 41 45 50" />
          <path d="M55 50 Q62 41 69 50" />
        </g>
      </g>

      <ellipse className="puffy-cheek" cx="27" cy="62" rx="7" ry="4" />
      <ellipse className="puffy-cheek" cx="73" cy="62" rx="7" ry="4" />

      <path className="puffy-mouth" d={MOUTH[mood]} />
      <ellipse className="puffy-mouth-open" cx="50" cy="66" rx="5.5" ry="4.5" />
    </svg>
  );
}
