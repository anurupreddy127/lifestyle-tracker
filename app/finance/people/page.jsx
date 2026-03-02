"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";

function groupByDate(transactions) {
  const groups = {};
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  transactions.forEach((tx) => {
    let label = tx.date;
    if (tx.date === today) label = "Today";
    else if (tx.date === yesterday) label = "Yesterday";
    else {
      const d = new Date(tx.date + "T00:00:00");
      label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  });
  return Object.entries(groups);
}

export default function PeoplePage() {
  const { supabase } = useAuth();
  const [personTxs, setPersonTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Person detail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  async function fetchData() {
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*, accounts!transactions_account_id_fkey(name)")
        .not("person_name", "is", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      setPersonTxs(data || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive unique people and calculate net amounts from transactions
  function getPeopleData() {
    const netMap = {};
    const txCountMap = {};

    personTxs.forEach((tx) => {
      const name = tx.person_name;
      if (!name) return;
      if (!netMap[name]) {
        netMap[name] = 0;
        txCountMap[name] = 0;
      }
      txCountMap[name] += 1;
      if (tx.transaction_type === "transfer") {
        // Lent money to person
        netMap[name] += Number(tx.amount);
      } else if (tx.transaction_type === "received") {
        // Received money back from person
        netMap[name] -= Number(tx.amount);
      }
    });

    return { netMap, txCountMap };
  }

  const { netMap, txCountMap } = getPeopleData();
  const peopleNames = Object.keys(netMap).sort((a, b) => {
    // Sort by outstanding amount desc, then alphabetically
    const netA = netMap[a] || 0;
    const netB = netMap[b] || 0;
    if (netB !== netA) return netB - netA;
    return a.localeCompare(b);
  });
  const totalOutstanding = Object.values(netMap).reduce(
    (sum, v) => sum + Math.max(0, v),
    0,
  );

  function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function openPersonDetail(name) {
    setSelectedPerson(name);
    setShowDetail(true);
  }

  // Get transactions for a specific person
  function getPersonTransactions(name) {
    return personTxs.filter((tx) => tx.person_name === name);
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : (
        <>
          {/* Total Outstanding */}
          {peopleNames.length > 0 && totalOutstanding > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-finance text-[18px]">
                  account_balance
                </span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Total Outstanding
                </p>
              </div>
              <p className="text-xl font-bold text-finance">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          )}

          {/* People List */}
          {peopleNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl">people</span>
              <p className="text-sm">No lending activity yet.</p>
              <p className="text-xs text-slate-300">
                Transfer money to a person to start tracking
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {peopleNames.map((name) => {
                const net = netMap[name] || 0;
                const txCount = txCountMap[name] || 0;
                return (
                  <div
                    key={name}
                    onClick={() => openPersonDetail(name)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-slate-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">
                        person
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {net > 0
                          ? "owes you"
                          : net < 0
                            ? "you owe"
                            : "settled"}
                        {txCount > 0 && (
                          <span className="ml-2">{txCount} txn{txCount !== 1 ? "s" : ""}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          net > 0
                            ? "text-finance"
                            : net < 0
                              ? "text-rose-500"
                              : "text-slate-400"
                        }`}
                      >
                        {net !== 0
                          ? formatCurrency(Math.abs(net))
                          : "$0.00"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Person Detail Modal */}
      <BottomSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={selectedPerson || "Person"}
      >
        {selectedPerson && (
          <div className="flex flex-col gap-4">
            {/* Net Summary */}
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-500 text-2xl">
                  person
                </span>
              </div>
              <div>
                <p
                  className={`text-lg font-bold ${
                    (netMap[selectedPerson] || 0) > 0
                      ? "text-finance"
                      : (netMap[selectedPerson] || 0) < 0
                        ? "text-rose-500"
                        : "text-slate-400"
                  }`}
                >
                  {(netMap[selectedPerson] || 0) !== 0
                    ? formatCurrency(Math.abs(netMap[selectedPerson] || 0))
                    : "Settled"}
                </p>
                <p className="text-xs text-slate-500">
                  {(netMap[selectedPerson] || 0) > 0
                    ? "owes you"
                    : (netMap[selectedPerson] || 0) < 0
                      ? "you owe them"
                      : "all settled up"}
                </p>
              </div>
            </div>

            {/* Transaction History */}
            {(() => {
              const txs = getPersonTransactions(selectedPerson);
              if (txs.length === 0) {
                return (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No transactions yet
                  </p>
                );
              }
              const grouped = groupByDate(txs);
              return (
                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                  {grouped.map(([dateLabel, items]) => (
                    <div key={dateLabel}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 pt-3 pb-1.5">
                        {dateLabel}
                      </p>
                      <div className="flex flex-col gap-2">
                        {items.map((tx) => (
                          <div
                            key={tx.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[16px] text-slate-500">
                                {tx.transaction_type === "transfer"
                                  ? "arrow_upward"
                                  : "arrow_downward"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {tx.transaction_type === "transfer"
                                  ? "Lent"
                                  : "Received back"}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {tx.accounts?.name}
                                {tx.description ? ` · ${tx.description}` : ""}
                              </p>
                            </div>
                            <p
                              className={`text-sm font-bold ${
                                tx.transaction_type === "transfer"
                                  ? "text-rose-500"
                                  : "text-finance"
                              }`}
                            >
                              {tx.transaction_type === "transfer" ? "-" : "+"}
                              {formatCurrency(tx.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </BottomSheet>

      {toast && (
        <Toast
          message={toast}
          isVisible={!!toast}
          onDismiss={() => setToast("")}
        />
      )}
    </div>
  );
}
