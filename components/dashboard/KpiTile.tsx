import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: number;
  amountColor?: string;
  note?: string;
  tooltip?: string;
  /** Net change in this account during the current calendar month. */
  delta?: number;
}

export function KpiTile({
  label,
  value,
  amountColor = "text-on-surface",
  note,
  tooltip,
  delta,
}: KpiTileProps) {
  const showDelta = delta !== undefined && delta !== 0;

  return (
    <div
      className="bg-white rounded-2xl border border-outline-variant p-6 flex flex-col gap-4"
      title={tooltip}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant leading-none">
        {label}
      </p>
      <div>
        <p className={cn("font-headline text-4xl font-bold leading-none", amountColor)}>
          {formatINR(value)}
        </p>
        {showDelta && (
          <p
            className={cn(
              "text-xs font-medium mt-2",
              (delta ?? 0) > 0 ? "text-success" : "text-error"
            )}
          >
            {(delta ?? 0) > 0 ? "+" : "−"}
            {formatINR(Math.abs(delta ?? 0))} this month
          </p>
        )}
        {note && !showDelta && (
          <p className="text-sm text-on-surface-variant mt-2">{note}</p>
        )}
        {note && showDelta && (
          <p className="text-xs text-on-surface-variant mt-1 opacity-70">{note}</p>
        )}
      </div>
    </div>
  );
}
