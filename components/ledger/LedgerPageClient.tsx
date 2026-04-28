"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LedgerView } from "@/components/ledger/LedgerView";
import { LogExpenseModal } from "@/components/ledger/LogExpenseModal";
import { LogInterestModal } from "@/components/ledger/LogInterestModal";
import type { LedgerRow, LedgerAccount } from "@/lib/queries/ledger";
import type { UserRole } from "@/types";

interface Props {
  account:     LedgerAccount;
  entries:     LedgerRow[];
  total:       number;
  balance:     number;
  page:        number;
  pageSize:    number;
  role:        UserRole;
  categories:  readonly string[];
  badge?:      React.ReactNode;
  dateFrom?:   string;
  dateTo?:     string;
  category?:   string;
  memberCode?: string;
  direction?:  "in" | "out" | "";
}

export function LedgerPageClient(props: Props) {
  const { account, role } = props;
  const router  = useRouter();
  const canWrite = role === "admin" || role === "editor";

  const [expenseOpen,  setExpenseOpen]  = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestType, setInterestType] = useState<"credit" | "debit">("credit");

  function openInterest(type: "credit" | "debit") {
    setInterestType(type);
    setInterestOpen(true);
  }

  const extraActions = canWrite ? (
    account === "interest" ? (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openInterest("credit")}>
          <Plus className="size-3.5" /> Log Interest
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 border-warning text-warning hover:bg-warning-container" onClick={() => openInterest("debit")}>
          Distribute to Poor
        </Button>
      </div>
    ) : (
      <Button size="sm" className="gap-1.5" onClick={() => setExpenseOpen(true)}>
        <Plus className="size-3.5" /> Log Expense
      </Button>
    )
  ) : undefined;

  return (
    <>
      <LedgerView {...props} extraActions={extraActions} />

      {account !== "interest" && (
        <LogExpenseModal
          open={expenseOpen}
          onOpenChange={setExpenseOpen}
          onSuccess={() => router.refresh()}
        />
      )}

      {account === "interest" && (
        <LogInterestModal
          open={interestOpen}
          onOpenChange={setInterestOpen}
          onSuccess={() => router.refresh()}
          defaultType={interestType}
        />
      )}
    </>
  );
}
