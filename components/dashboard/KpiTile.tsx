import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: number;
  /** Tailwind text color class for the amount. */
  amountColor?: string;
  /** Extra classes added to the outer wrapper (e.g. a left-border accent). */
  accent?: string;
  /** Small note shown below the amount. */
  note?: string;
  /** HTML title attr for native tooltip. */
  tooltip?: string;
}

export function KpiTile({
  label,
  value,
  amountColor = "text-on-surface",
  accent,
  note,
  tooltip,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "bg-white min-h-32 rounded-xl border border-outline-variant p-5 flex flex-col justify-between gap-3 overflow-hidden",
        accent
      )}
      title={tooltip}
    >
      <p className="max-w-full text-xs font-semibold uppercase tracking-[0.14em] leading-snug text-on-surface-variant">
        {label}
      </p>
      <div className="space-y-2">
        <p className={cn("font-headline text-3xl font-bold leading-none", amountColor)}>
          {formatINR(value)}
        </p>
        {note && (
          <p className="text-sm leading-snug text-on-surface-variant">{note}</p>
        )}
      </div>
    </div>
  );
}
