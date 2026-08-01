"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  familyEmail: string;
  createdAt: string;
}

interface CallRecord {
  id: string;
  recipientId: string;
  status: string;
  level: "ok" | "mild_concern" | "escalate";
  reasons: string[];
  conditionSummary: string | null;
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
}

const LEVEL_LABEL: Record<CallRecord["level"], string> = {
  ok: "問題なし",
  mild_concern: "軽度の懸念",
  escalate: "要確認",
};

const LEVEL_BADGE_CLASS: Record<CallRecord["level"], string> = {
  ok: styles.badgeOk,
  mild_concern: styles.badgeMild,
  escalate: styles.badgeEscalate,
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function loadRecipients() {
    const res = await fetch("/api/recipients");
    const data = await res.json();
    setRecipients(data.recipients ?? []);
    if (!selectedId && data.recipients?.length > 0) {
      setSelectedId(data.recipients[0].id);
    }
  }

  async function loadCalls(recipientId: string) {
    const res = await fetch(`/api/calls?recipientId=${recipientId}`);
    const data = await res.json();
    setCalls(data.calls ?? []);
  }

  useEffect(() => {
    loadRecipients().catch(() => setError("見守り対象者の読み込みに失敗しました。"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadCalls(selectedId).catch(() => setError("通話履歴の読み込みに失敗しました。"));
    } else {
      setCalls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, phone: formPhone, familyEmail: formEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "登録に失敗しました。");
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormOpen(false);
      await loadRecipients();
      setSelectedId(data.recipient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(r: Recipient) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPhone(r.phone);
    setEditEmail(r.familyEmail);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setEditSaving(true);
    try {
      const res = await fetch(`/api/recipients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone, familyEmail: editEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました。");
      setEditingId(null);
      await loadRecipients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCallNow(recipientId: string) {
    setError(null);
    setCallingId(recipientId);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "発信に失敗しました。");
      await loadCalls(recipientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "発信に失敗しました。");
    } finally {
      setCallingId(null);
    }
  }

  const selectedRecipient = recipients.find((r) => r.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>見守りダッシュボード</h1>
          <p className={styles.subtitle}>電話での安否確認と、その結果をまとめて確認できます。</p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>見守り対象の方</h2>

          {recipients.length === 0 && !formOpen && (
            <p className={styles.empty}>まだ登録されていません。下のボタンから追加してください。</p>
          )}

          <div className={styles.recipientList}>
            {recipients.map((r) =>
              editingId === r.id ? (
                <form
                  key={r.id}
                  className={styles.form}
                  style={{ border: "1px solid #6b8f71", borderRadius: 10, padding: "0.9rem 1rem" }}
                  onSubmit={handleSaveEdit}
                >
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-name-${r.id}`}>お名前</label>
                    <input
                      id={`edit-name-${r.id}`}
                      className={styles.input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-phone-${r.id}`}>電話番号(E.164形式)</label>
                    <input
                      id={`edit-phone-${r.id}`}
                      className={styles.input}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-email-${r.id}`}>結果の通知先メールアドレス</label>
                    <input
                      id={`edit-email-${r.id}`}
                      type="email"
                      className={styles.input}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className={styles.button} type="submit" disabled={editSaving}>
                      {editSaving ? "保存中..." : "保存する"}
                    </button>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => setEditingId(null)}
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={r.id}
                  className={r.id === selectedId ? styles.recipientRowSelected : styles.recipientRow}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    <div className={styles.recipientName}>{r.name}</div>
                    <div className={styles.recipientMeta}>
                      {r.phone} ・ 通知先: {r.familyEmail}
                    </div>
                  </button>
                  <div className={styles.recipientActions}>
                    <button
                      className={styles.buttonSecondary}
                      onClick={() => startEditing(r)}
                    >
                      編集
                    </button>
                    <button
                      className={styles.buttonSecondary}
                      disabled={callingId === r.id}
                      onClick={() => handleCallNow(r.id)}
                    >
                      {callingId === r.id ? "通話中..." : "今すぐ電話する"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {formOpen ? (
            <form className={styles.form} style={{ marginTop: "1rem" }} onSubmit={handleAddRecipient}>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="name">お名前</label>
                <input
                  id="name"
                  className={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: 山田 花子"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="phone">電話番号(E.164形式)</label>
                <input
                  id="phone"
                  className={styles.input}
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="例: +819012345678"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="email">結果の通知先メールアドレス</label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="例: family@example.com"
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.3rem" }}>
                <button className={styles.button} type="submit" disabled={saving}>
                  {saving ? "保存中..." : "登録する"}
                </button>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setFormOpen(false)}
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className={styles.buttonSecondary}
              style={{ marginTop: "1rem" }}
              onClick={() => setFormOpen(true)}
            >
              + 見守り対象を追加
            </button>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            通話履歴{selectedRecipient ? `:${selectedRecipient.name}さん` : ""}
          </h2>

          {!selectedRecipient && <p className={styles.empty}>対象者を選択してください。</p>}

          {selectedRecipient && calls.length === 0 && (
            <p className={styles.empty}>まだ通話履歴がありません。「今すぐ電話する」で最初の見守りコールを試せます。</p>
          )}

          <div className={styles.callHistory}>
            {calls.map((c) => (
              <div key={c.id} className={styles.callRow}>
                <div className={styles.callHeader}>
                  <span className={LEVEL_BADGE_CLASS[c.level]}>{LEVEL_LABEL[c.level]}</span>
                  <span className={styles.callTime}>{formatDateTime(c.completedAt ?? c.createdAt)}</span>
                </div>
                {c.summary && <p className={styles.callSummary}>{c.summary}</p>}
                {c.reasons.length > 0 && (
                  <ul className={styles.callReasons}>
                    {c.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
