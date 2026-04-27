import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: number;
  /** Tailwind text color class for the amount. Defaults to text-on-surface. */
  amountColor?: string;
  /** Tailwind background class for the tile. */
  bg?: string;
  /** Small note shown below the amount. */
  note?: string;
  /** HTML title attr for native tooltip. */
  tooltip?: string;
}

export function KpiTile({
  label,
  value,
  amountColor = "text-on-surface",
  bg = "bg-white",
  note,
  tooltip,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant p-4 md:p-6 flex flex-col gap-1",
        bg
      )}
      title={tooltip}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className={cn("font-headline text-2xl md:text-3xl font-bold", amountColor)}>
        {formatINR(value)}
      </p>
      {note && (
        <p className="text-xs text-on-surface-variant mt-0.5">{note}</p>
      )}
    </div>
  );
}
