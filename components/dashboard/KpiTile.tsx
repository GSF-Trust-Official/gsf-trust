import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface KpiTileProps {
  label: string;
  value: number;
  amountColor?: string;
  note?: string;
  tooltip?: string;
}

export function KpiTile({
  label,
  value,
  amountColor = "text-on-surface",
  note,
  tooltip,
}: KpiTileProps) {
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
        {note && (
          <p className="text-sm text-on-surface-variant mt-2">{note}</p>
        )}
      </div>
    </div>
  );
}
