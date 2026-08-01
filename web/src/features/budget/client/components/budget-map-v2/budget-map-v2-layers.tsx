"use client";

import type { CSSProperties } from "react";
import type { BudgetMapWorldDimensions } from "../../../shared/utils/budget-map-layout";
import type {
  BudgetMapV2Branches,
  BudgetMapV2CoreDot,
  BudgetMapV2FlowParticle,
  BudgetMapV2Star,
} from "../../../shared/utils/budget-map-v2-particles";
import type { BudgetMapV2Edge } from "../../../shared/utils/budget-map-v2-scene";
import type { BudgetMapV2WarpShell } from "../../../shared/utils/budget-map-v2-transition";

/**
 * 宇宙マップ v2 の装飾レイヤー。
 * 位置・大きさ・色相は CSS 変数で渡し、色そのものは globals.css が持つ。
 */

export type BudgetMapV2Style = CSSProperties & Record<`--${string}`, string>;

export function BudgetMapV2Stars({ stars }: { stars: BudgetMapV2Star[] }) {
  return (
    <div aria-hidden="true" className="budget-map-v2-stars">
      {stars.map((star) => (
        <span
          key={star.id}
          className="budget-map-v2-star"
          data-tone={star.tone}
          data-twinkle={star.twinkles}
          style={
            {
              "--budget-v2-star-x": `${star.leftPercent}%`,
              "--budget-v2-star-y": `${star.topPercent}%`,
              "--budget-v2-star-size": `${star.sizePx}px`,
              "--budget-v2-star-opacity": `${star.opacity}`,
              "--budget-v2-star-duration": `${star.durationSeconds}s`,
              "--budget-v2-star-delay": `${star.delaySeconds}s`,
            } as BudgetMapV2Style
          }
        />
      ))}
    </div>
  );
}

/**
 * 線・枝・中心の粒をまとめた1枚の SVG。
 * viewBox は world 寸法ちょうどで、枝のはみ出しは overflow で許容する。
 */
export function BudgetMapV2EdgeLayer({
  branches,
  coreDots,
  dimensions,
  edges,
}: {
  branches: BudgetMapV2Branches;
  coreDots: BudgetMapV2CoreDot[];
  dimensions: BudgetMapWorldDimensions;
  edges: BudgetMapV2Edge[];
}) {
  return (
    <svg
      aria-hidden="true"
      data-testid="budget-map-v2-edges"
      className="budget-map-v2-edges"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      width={dimensions.width}
      height={dimensions.height}
    >
      <g fill="none">
        {edges.map((edge) => (
          <path
            key={edge.id}
            className="budget-map-v2-edge"
            d={edge.d}
            data-hued={edge.hue !== null}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={
              {
                "--budget-v2-hue": `${edge.hue ?? 220}`,
                "--budget-v2-edge-opacity": `${edge.opacity}`,
              } as BudgetMapV2Style
            }
          />
        ))}
        {branches.lines.map((line) => (
          <path
            key={line.id}
            className="budget-map-v2-branch-line"
            d={line.d}
            data-depth={line.depth}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g>
        {branches.dots.map((dot) => (
          <circle
            key={dot.id}
            className="budget-map-v2-branch-dot"
            cx={dot.x}
            cy={dot.y}
            r={dot.radius}
            data-kind={dot.kind}
            data-hued={dot.hue !== null}
            style={
              { "--budget-v2-hue": `${dot.hue ?? 220}` } as BudgetMapV2Style
            }
          />
        ))}
      </g>
      <g>
        {coreDots.map((dot) => (
          <circle
            key={dot.id}
            className="budget-map-v2-core-dot"
            cx={dot.x}
            cy={dot.y}
            r={dot.radius}
            data-hued={dot.hue !== null}
            data-drift={dot.driftIndex}
            style={
              {
                "--budget-v2-hue": `${dot.hue ?? 220}`,
                "--budget-v2-dot-alpha": `${dot.alpha}`,
                "--budget-v2-dot-duration": `${dot.durationSeconds}s`,
                "--budget-v2-dot-delay": `-${dot.delaySeconds}s`,
              } as BudgetMapV2Style
            }
          />
        ))}
      </g>
    </svg>
  );
}

/** 放射線の上を流れる粒。reduced-motion では呼び出し側が空配列を渡す。 */
export function BudgetMapV2FlowLayer({
  particles,
}: {
  particles: BudgetMapV2FlowParticle[];
}) {
  if (particles.length === 0) {
    return null;
  }
  return (
    <div aria-hidden="true" className="budget-map-v2-flow-layer">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="budget-map-v2-flow"
          style={
            {
              "--budget-v2-flow-path": `path('${particle.path}')`,
              "--budget-v2-flow-size": `${particle.sizePx}px`,
              "--budget-v2-flow-duration": `${particle.durationSeconds}s`,
              "--budget-v2-flow-delay": `-${particle.delaySeconds}s`,
              "--budget-v2-hue": `${particle.hue}`,
            } as BudgetMapV2Style
          }
        />
      ))}
    </div>
  );
}

/** ワープトンネル。warp フェーズ中だけマウントし、idle 時は DOM に残さない。 */
export function BudgetMapV2WarpLayer({
  shells,
}: {
  shells: BudgetMapV2WarpShell[];
}) {
  return (
    <div aria-hidden="true" className="budget-map-v2-warp-layer">
      <span className="budget-map-v2-warp-core" />
      {shells.map((shell) => (
        <span
          key={shell.id}
          className="budget-map-v2-warp-shell"
          data-spin={shell.spin}
          data-tint={shell.tintIndex}
          style={
            {
              "--budget-v2-warp-size": `${shell.sizePx}px`,
              "--budget-v2-warp-from": `${shell.fromDegrees}deg`,
              "--budget-v2-warp-gap": `${shell.gapDegrees}deg`,
              "--budget-v2-warp-gap-end": `${shell.gapDegrees + shell.widthDegrees}deg`,
              "--budget-v2-warp-period": `${shell.gapDegrees * 2 + shell.widthDegrees}deg`,
              "--budget-v2-warp-duration": `${shell.durationMs}ms`,
              "--budget-v2-warp-delay": `${shell.delayMs}ms`,
            } as BudgetMapV2Style
          }
        />
      ))}
    </div>
  );
}
