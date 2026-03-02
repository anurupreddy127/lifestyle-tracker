"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomSheet from "@/components/BottomSheet";
import Toast from "@/components/Toast";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import SwipeableCard from "@/components/SwipeableCard";

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
  const { supabase, user } = useAuth();
  const [people, setPeople] = useState([]);
  const [personTxs, setPersonTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // Add/Edit person
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  // Person detail
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(null);

  async function fetchData() {
    try {
      const [peopleRes, txRes] = await Promise.all([
        supabase
          .from("people")
          .select("*")
          .order("name"),
        supabase
          .from("transactions")
          .select("*, accounts!transactions_account_id_fkey(name), people(name)")
          .not("person_id", "is", null)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);
      setPeople(peopleRes.data || []);
      setPersonTxs(txRes.data || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate net amounts per person
  function getNetAmounts() {
    const netMap = {};
    const txCountMap = {};

    people.forEach((p) => {
      netMap[p.id] = 0;
      txCountMap[p.id] = 0;
    });

    personTxs.forEach((tx) => {
      if (!tx.person_id) return;
      txCountMap[tx.person_id] = (txCountMap[tx.person_id] || 0) + 1;
      if (tx.transaction_type === "transfer") {
        // Lent money to person
        netMap[tx.person_id] = (netMap[tx.person_id] || 0) + Number(tx.amount);
      } else if (tx.transaction_type === "received") {
        // Received money back from person
        netMap[tx.person_id] = (netMap[tx.person_id] || 0) - Number(tx.amount);
      }
    });

    return { netMap, txCountMap };
  }

  const { netMap, txCountMap } = getNetAmounts();
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

  function openAdd() {
    setEditingPerson(null);
    setFormName("");
    setShowModal(true);
  }

  function openEdit(person) {
    setEditingPerson(person);
    setFormName(person.name);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingPerson) {
        await supabase
          .from("people")
          .update({ name: formName.trim() })
          .eq("id", editingPerson.id);
        setToast("Person updated!");
      } else {
        await supabase
          .from("people")
          .insert({ name: formName.trim(), user_id: user.id });
        setToast("Person added!");
      }
      setShowModal(false);
      fetchData();
    } catch {
      setToast("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(person) {
    setDeletingPerson(person);
    setShowDeleteConfirm(true);
  }

  async function handleDelete() {
    if (!deletingPerson) return;
    try {
      await supabase.from("people").delete().eq("id", deletingPerson.id);
      setShowDeleteConfirm(false);
      setDeletingPerson(null);
      setToast("Person deleted");
      fetchData();
    } catch {
      setToast("Failed to delete");
    }
  }

  function openPersonDetail(person) {
    setSelectedPerson(person);
    setShowDetail(true);
  }

  // Get transactions for a specific person
  function getPersonTransactions(personId) {
    return personTxs.filter((tx) => tx.person_id === personId);
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {loading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : (
        <>
          {/* Total Outstanding */}
          {people.length > 0 && totalOutstanding > 0 && (
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
          {people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl">people</span>
              <p className="text-sm">No people yet.</p>
              <p className="text-xs text-slate-300">
                Add a person to start tracking loans
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {people
                .sort((a, b) => {
                  // Sort by outstanding amount desc, then alphabetically
                  const netA = netMap[a.id] || 0;
                  const netB = netMap[b.id] || 0;
                  if (netB !== netA) return netB - netA;
                  return a.name.localeCompare(b.name);
                })
                .map((person) => {
                  const net = netMap[person.id] || 0;
                  const txCount = txCountMap[person.id] || 0;
                  return (
                    <SwipeableCard
                      key={person.id}
                      id={`person-${person.id}`}
                      onEdit={() => openEdit(person)}
                      onDelete={() => confirmDelete(person)}
                    >
                      <div
                        onClick={() => openPersonDetail(person)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-slate-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-slate-500 text-[20px]">
                            person
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {person.name}
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
                    </SwipeableCard>
                  );
                })}
            </div>
          )}

          {/* Add Person Button */}
          <button
            onClick={openAdd}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-6 flex items-center justify-center gap-2 active:bg-finance/90 shadow-lg shadow-finance/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Person
          </button>
        </>
      )}

      {/* Add/Edit Person Modal */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPerson ? "Edit Person" : "Add Person"}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., John Smith"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-finance/20 w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-finance text-white font-bold rounded-xl py-4 w-full text-base mt-1 active:bg-finance/90 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingPerson
                ? "Save Changes"
                : "Add Person"}
          </button>
        </div>
      </BottomSheet>

      {/* Person Detail Modal */}
      <BottomSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={selectedPerson?.name || "Person"}
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
                    (netMap[selectedPerson.id] || 0) > 0
                      ? "text-finance"
                      : (netMap[selectedPerson.id] || 0) < 0
                        ? "text-rose-500"
                        : "text-slate-400"
                  }`}
                >
                  {(netMap[selectedPerson.id] || 0) !== 0
                    ? formatCurrency(Math.abs(netMap[selectedPerson.id] || 0))
                    : "Settled"}
                </p>
                <p className="text-xs text-slate-500">
                  {(netMap[selectedPerson.id] || 0) > 0
                    ? "owes you"
                    : (netMap[selectedPerson.id] || 0) < 0
                      ? "you owe them"
                      : "all settled up"}
                </p>
              </div>
            </div>

            {/* Transaction History */}
            {(() => {
              const txs = getPersonTransactions(selectedPerson.id);
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

      {/* Delete Confirmation Modal */}
      <BottomSheet
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingPerson(null);
        }}
        title="Delete Person"
      >
        {deletingPerson && (
          <div className="flex flex-col gap-4">
            {(netMap[deletingPerson.id] || 0) !== 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">
                  <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                    warning
                  </span>
                  Outstanding balance
                </p>
                <p className="text-[11px] text-amber-600">
                  {deletingPerson.name} still{" "}
                  {(netMap[deletingPerson.id] || 0) > 0
                    ? `owes you ${formatCurrency(Math.abs(netMap[deletingPerson.id] || 0))}`
                    : `is owed ${formatCurrency(Math.abs(netMap[deletingPerson.id] || 0))}`}
                  . Transactions will remain but won&apos;t be linked to a person.
                </p>
              </div>
            )}
            <p className="text-sm text-slate-600 text-center">
              Are you sure you want to delete {deletingPerson.name}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingPerson(null);
                }}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 active:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold bg-rose-500 text-white active:bg-rose-600"
              >
                Delete
              </button>
            </div>
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
