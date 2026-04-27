"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CirclePlus,
  HandHeart,
  ReceiptText,
  Save,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickActionsProps {
  /** Only admin and editor see this action. */
  canWrite: boolean;
}

type TransactionType = "subscription" | "donation" | "expense";

const TRANSACTION_TYPES: {
  value: TransactionType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "subscription", label: "Subscription", icon: CalendarDays },
  { value: "donation", label: "Donation", icon: HandHeart },
  { value: "expense", label: "Expense", icon: WalletCards },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

export function QuickActions({ canWrite }: QuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("subscription");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const submitLabel = `Log ${labelFor(type)}`;

  if (!canWrite) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.info(`${submitLabel} will connect to the ledger workflow in its phase.`);
    setOpen(false);
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        className="hidden sm:inline-flex h-11 gap-2 px-4 bg-primary text-white hover:bg-primary-container"
      >
        <CirclePlus className="size-5" />
        Log Transaction
      </Button>

      <Button
        size="icon-lg"
        onClick={() => setOpen(true)}
        aria-label="Log transaction"
        className="sm:hidden fixed bottom-24 right-4 z-40 size-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-container"
      >
        <CirclePlus className="size-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-xl" showCloseButton>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>Log Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-5 pb-5">
            <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-surface-container p-1">
              {TRANSACTION_TYPES.map((item) => {
                const Icon = item.icon;
                const active = item.value === type;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setType(item.value)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium text-on-surface-variant transition-colors",
                      active && "bg-white text-on-surface shadow-sm"
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="size-4" />
                    <span className="hidden min-[420px]:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {type === "subscription" && <SubscriptionFields today={today} />}
            {type === "donation" && <DonationFields today={today} />}
            {type === "expense" && <ExpenseFields today={today} />}

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" className="h-11 gap-2 px-4">
                {type === "expense" ? (
                  <ReceiptText className="size-4" />
                ) : type === "donation" ? (
                  <HandHeart className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                {submitLabel}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubscriptionFields({ today }: { today: string }) {
  return (
    <div className="space-y-4">
      <Field label="Member *">
        <select className={selectClass} defaultValue="">
          <option value="" disabled>
            Select member...
          </option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Month *">
          <select className={selectClass} defaultValue={MONTHS[new Date().getMonth()]}>
            {MONTHS.map((month) => (
              <option key={month}>{month}</option>
            ))}
          </select>
        </Field>
        <Field label="Year *">
          <select className={selectClass} defaultValue={String(new Date().getFullYear())}>
            {[2026, 2025, 2024, 2023].map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (INR) *">
          <Input className={fieldClass} type="number" min="0" defaultValue="300" />
        </Field>
        <Field label="Payment Date *">
          <Input className={fieldClass} type="date" defaultValue={today} />
        </Field>
      </div>

      <Field label="Payment Mode *">
        <select className={selectClass} defaultValue="upi">
          <option value="upi">UPI</option>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
        </select>
      </Field>

      <Field label="Reference">
        <Input className={fieldClass} placeholder="Transaction ID, cheque no..." />
      </Field>
    </div>
  );
}

function DonationFields({ today }: { today: string }) {
  const [external, setExternal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="donor">{external ? "Donor Name *" : "Donor"}</Label>
          <button
            type="button"
            onClick={() => setExternal((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {external ? "Select member" : "External donor?"}
          </button>
        </div>
        {external ? (
          <Input id="donor" className={fieldClass} placeholder="Enter donor name" />
        ) : (
          <select id="donor" className={selectClass} defaultValue="">
            <option value="" disabled>
              Select member...
            </option>
          </select>
        )}
      </div>

      <Field label="Donation Type *">
        <SegmentedOptions options={["Hadiya", "Zakat", "Other"]} defaultValue="Hadiya" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category *">
          <select className={selectClass} defaultValue="general">
            <option value="general">General</option>
            <option value="medical">Medical</option>
            <option value="scholarship">Scholarship</option>
            <option value="emergency">Emergency</option>
          </select>
        </Field>
        <Field label="Amount (INR) *">
          <Input className={fieldClass} type="number" min="0" defaultValue="0" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date *">
          <Input className={fieldClass} type="date" defaultValue={today} />
        </Field>
        <Field label="Mode *">
          <select className={selectClass} defaultValue="upi">
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>
        </Field>
      </div>

      <Field label="Reference">
        <Input className={fieldClass} placeholder="Transaction ID..." />
      </Field>
    </div>
  );
}

function ExpenseFields({ today }: { today: string }) {
  const [account, setAccount] = useState("general");

  const categories =
    account === "zakat"
      ? [{ value: "scholarship", label: "Scholarship" }]
      : account === "interest"
        ? [
            { value: "Bank Interest", label: "Bank Interest Received" },
            { value: "Distribution to Poor", label: "Distribution to Poor" },
          ]
        : [
            { value: "Medical", label: "Medical" },
            { value: "Scholarship", label: "Scholarship" },
            { value: "Admin", label: "Admin & Operations" },
            { value: "Other", label: "Other" },
          ];

  return (
    <div className="space-y-4">
      <Field label="Account *">
        <select
          className={selectClass}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="general">General</option>
          <option value="zakat">Zakat (Restricted)</option>
          <option value="interest">Interest Account</option>
        </select>
      </Field>

      {account === "interest" && (
        <p className="text-xs rounded-lg bg-warning-container px-3 py-2 text-[#4d3600]">
          Use <strong>Bank Interest Received</strong> for deposits from the bank (positive amount). Use <strong>Distribution to Poor</strong> when disbursing interest funds (positive amount — the system records it as a debit).
        </p>
      )}
      {account === "zakat" && (
        <p className="text-xs rounded-lg bg-error-container px-3 py-2 text-error">
          Zakat outflows are restricted to Scholarship only.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category *">
          <select className={selectClass} defaultValue={categories[0].value}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount (₹) *">
          <Input className={fieldClass} type="number" min="0" defaultValue="0" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date *">
          <Input className={fieldClass} type="date" defaultValue={today} />
        </Field>
        <Field label="Reference">
          <Input className={fieldClass} placeholder="Bank ref / receipt no..." />
        </Field>
      </div>

      <Field label="Description *">
        <Input className={fieldClass} placeholder="What was this for?" />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const optional = label.endsWith("Reference");
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {optional && (
          <span className="font-normal text-on-surface-variant">(optional)</span>
        )}
      </Label>
      {children}
    </div>
  );
}

function SegmentedOptions({
  options,
  defaultValue,
}: {
  options: string[];
  defaultValue: string;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const active = option === selected;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setSelected(option)}
            className={cn(
              "h-9 rounded-lg border border-outline-variant bg-surface-container text-sm font-medium text-on-surface-variant transition-colors",
              active && "border-primary bg-primary-fixed text-primary"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function labelFor(type: TransactionType): string {
  if (type === "subscription") return "Subscription";
  if (type === "donation") return "Donation";
  return "Expense";
}
