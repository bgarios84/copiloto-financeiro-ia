import * as React from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Sentiment = "positive" | "negative" | "neutral";

const sentimentDot: Record<Sentiment, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-400",
  neutral: "bg-gray-400",
};

export interface NewsCardProps {
  title: string;
  source: string;
  time: string;
  category?: string;
  sentiment?: Sentiment;
  href?: string;
  className?: string;
}

/**
 * NewsCard — compact news item card for financial news feeds.
 *
 * Usage:
 * ```tsx
 * <NewsCard
 *   title="Selic mantida em 10,5% ao ano, diz Copom"
 *   source="InfoMoney"
 *   time="2h atrás"
 *   category="Macroeconomia"
 *   sentiment="neutral"
 *   href="https://..."
 * />
 * ```
 */
export function NewsCard({
  title,
  source,
  time,
  category,
  sentiment = "neutral",
  href,
  className,
}: NewsCardProps) {
  const inner = (
    <>
      {/* Sentiment dot */}
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          sentimentDot[sentiment]
        )}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-[13px] font-medium text-foreground leading-snug line-clamp-2",
          href && "group-hover:text-primary transition-colors"
        )}>
          {title}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground">{source}</span>
          <span className="text-[11px] text-muted-foreground/40">·</span>
          <span className="text-[11px] text-muted-foreground/70">{time}</span>
          {category && (
            <>
              <span className="text-[11px] text-muted-foreground/40">·</span>
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {category}
              </span>
            </>
          )}
        </div>
      </div>

      {/* External link icon */}
      {href && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </>
  );

  const baseClass = cn(
    "group flex items-start gap-3 rounded-xl border border-border bg-card p-4",
    "shadow-[var(--shadow-card)] transition-all",
    href && "hover:shadow-[var(--shadow-card-hover)] cursor-pointer",
    className
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClass}>
        {inner}
      </a>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
