"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { LEVEL_LABEL } from "@/lib/calle/classify";
import { DEFAULT_LOCALE, isLocaleSupportedForPhone, type Locale } from "@/lib/locale";

interface Recipient {
  id: string;
  name: string;
  phone: string;
  familyEmail: string;
  locale: Locale;
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

const LEVEL_BADGE_CLASS: Record<CallRecord["level"], string> = {
  ok: styles.badgeOk,
  mild_concern: styles.badgeMild,
  escalate: styles.badgeEscalate,
};

const UI_LOCALE_STORAGE_KEY = "dashboard-ui-locale";

const T: Record<Locale, {
  title: string;
  subtitle: string;
  langToggle: string;
  recipientsTitle: string;
  callAll: string;
  callAllBusy: string;
  emptyRecipients: string;
  edit: string;
  callNow: string;
  callNowBusy: string;
  delete: string;
  deleteBusy: string;
  deleteConfirm: (name: string) => string;
  nameLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  localeLabel: string;
  localeOptionEn: string;
  localeOptionJa: string;
  localeHintJaOnly: string;
  save: string;
  saving: string;
  cancel: string;
  register: string;
  registering: string;
  addRecipient: string;
  callHistoryTitle: (name: string | null) => string;
  selectRecipientPrompt: string;
  emptyCallHistory: string;
  notifyLabel: string;
  errLoadRecipients: string;
  errLoadCalls: string;
  errRegister: string;
  errUpdate: string;
  errDelete: string;
  errCallAll: string;
  errCallNow: string;
  someCallsFailed: (n: number) => string;
  someNotifyFailed: (n: number) => string;
  notifyFailedSingle: string;
}> = {
  en: {
    title: "Wellness Dashboard",
    subtitle: "Check in on loved ones by phone and review the results in one place.",
    langToggle: "日本語",
    recipientsTitle: "People being checked on",
    callAll: "Call everyone now",
    callAllBusy: "Calling...",
    emptyRecipients: "No one is registered yet. Add someone with the button below.",
    edit: "Edit",
    callNow: "Call now",
    callNowBusy: "Calling...",
    delete: "Delete",
    deleteBusy: "Deleting...",
    deleteConfirm: (name) =>
      `Delete ${name}? Their call history will also be permanently deleted. Are you sure?`,
    nameLabel: "Name",
    phoneLabel: "Phone number (E.164 format)",
    phonePlaceholder: "e.g. +819012345678",
    emailLabel: "Notification email",
    emailPlaceholder: "e.g. family@example.com",
    localeLabel: "Call & notification language",
    localeOptionEn: "English",
    localeOptionJa: "日本語 (Japanese)",
    localeHintJaOnly: "This is a Japanese phone number — CALL-E only supports Japanese for calls to Japan.",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    register: "Register",
    registering: "Registering...",
    addRecipient: "+ Add someone",
    callHistoryTitle: (name) => `Call history${name ? `: ${name}` : ""}`,
    selectRecipientPrompt: "Select someone to see their call history.",
    emptyCallHistory: 'No calls yet. Use "Call now" to try the first wellness call.',
    notifyLabel: "Notify",
    errLoadRecipients: "Failed to load recipients.",
    errLoadCalls: "Failed to load call history.",
    errRegister: "Failed to register.",
    errUpdate: "Failed to update.",
    errDelete: "Failed to delete.",
    errCallAll: "Failed to call everyone.",
    errCallNow: "Failed to place the call.",
    someCallsFailed: (n) => `${n} call(s) failed. Check the logs for details.`,
    someNotifyFailed: (n) =>
      `${n} call(s) succeeded, but the notification email couldn't be sent (a demo environment limitation).`,
    notifyFailedSingle:
      "The call succeeded, but the notification email couldn't be sent (a demo environment limitation). The result is still reflected on the dashboard.",
  },
  ja: {
    title: "見守りダッシュボード",
    subtitle: "電話での安否確認と、その結果をまとめて確認できます。",
    langToggle: "English",
    recipientsTitle: "見守り対象の方",
    callAll: "登録済み全員に今すぐ電話する",
    callAllBusy: "発信中...",
    emptyRecipients: "まだ登録されていません。下のボタンから追加してください。",
    edit: "編集",
    callNow: "今すぐ電話する",
    callNowBusy: "通話中...",
    delete: "削除",
    deleteBusy: "削除中...",
    deleteConfirm: (name) =>
      `${name}さんを削除します。通話履歴もすべて削除され、元に戻せません。よろしいですか?`,
    nameLabel: "お名前",
    phoneLabel: "電話番号(E.164形式)",
    phonePlaceholder: "例: +819012345678",
    emailLabel: "結果の通知先メールアドレス",
    emailPlaceholder: "例: family@example.com",
    localeLabel: "通話・通知の言語",
    localeOptionEn: "English (英語)",
    localeOptionJa: "日本語",
    localeHintJaOnly: "日本の電話番号のため、CALL-Eでは日本語のみ利用できます。",
    save: "保存する",
    saving: "保存中...",
    cancel: "キャンセル",
    register: "登録する",
    registering: "登録中...",
    addRecipient: "+ 見守り対象を追加",
    callHistoryTitle: (name) => `通話履歴${name ? `:${name}さん` : ""}`,
    selectRecipientPrompt: "対象者を選択してください。",
    emptyCallHistory: "まだ通話履歴がありません。「今すぐ電話する」で最初の見守りコールを試せます。",
    notifyLabel: "通知先",
    errLoadRecipients: "見守り対象者の読み込みに失敗しました。",
    errLoadCalls: "通話履歴の読み込みに失敗しました。",
    errRegister: "登録に失敗しました。",
    errUpdate: "更新に失敗しました。",
    errDelete: "削除に失敗しました。",
    errCallAll: "一括発信に失敗しました。",
    errCallNow: "発信に失敗しました。",
    someCallsFailed: (n) => `${n}件の通話が失敗しました。詳細はお使いのログをご確認ください。`,
    someNotifyFailed: (n) =>
      `${n}件、通話は成功しましたがメール通知は送信できませんでした(デモ環境の制限によるものです)。`,
    notifyFailedSingle:
      "通話は成功しましたが、メール通知は送信できませんでした(デモ環境の制限によるものです。通話結果はダッシュボードに反映されています)。",
  },
};

function formatDateTime(iso: string | null, uiLocale: Locale): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(uiLocale === "ja" ? "ja-JP" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [uiLocale, setUiLocale] = useState<Locale>(DEFAULT_LOCALE);
  const t = T[uiLocale];

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [callingAll, setCallingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLocale, setFormLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocale, setEditLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "ja") setUiLocale(stored);
  }, []);

  function toggleUiLocale() {
    const next: Locale = uiLocale === "en" ? "ja" : "en";
    setUiLocale(next);
    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, next);
  }

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
    loadRecipients().catch(() => setError(t.errLoadRecipients));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadCalls(selectedId).catch(() => setError(t.errLoadCalls));
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
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          familyEmail: formEmail,
          locale: formLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errRegister);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormLocale(DEFAULT_LOCALE);
      setFormOpen(false);
      await loadRecipients();
      setSelectedId(data.recipient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errRegister);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(r: Recipient) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPhone(r.phone);
    setEditEmail(r.familyEmail);
    setEditLocale(r.locale);
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
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          familyEmail: editEmail,
          locale: editLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errUpdate);
      setEditingId(null);
      await loadRecipients();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errUpdate);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteRecipient(recipient: Recipient) {
    if (!window.confirm(t.deleteConfirm(recipient.name))) return;

    setError(null);
    setDeletingId(recipient.id);
    try {
      const res = await fetch(`/api/recipients/${recipient.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t.errDelete);

      if (selectedId === recipient.id) {
        setSelectedId(null);
        setCalls([]);
      }
      await loadRecipients();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errDelete);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCallAll() {
    setError(null);
    setCallingAll(true);
    try {
      const res = await fetch("/api/calls/call-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t.errCallAll);

      const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      const notifyFailed = (data.results ?? []).filter(
        (r: { ok: boolean; notified?: boolean }) => r.ok && r.notified === false
      );
      if (failed.length > 0) {
        setError(t.someCallsFailed(failed.length));
      } else if (notifyFailed.length > 0) {
        setError(t.someNotifyFailed(notifyFailed.length));
      }

      if (selectedId) await loadCalls(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errCallAll);
    } finally {
      setCallingAll(false);
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
      if (!res.ok) throw new Error(data.error ?? t.errCallNow);
      if (data.notified === false) {
        setError(t.notifyFailedSingle);
      }
      await loadCalls(recipientId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errCallNow);
    } finally {
      setCallingId(null);
    }
  }

  const selectedRecipient = recipients.find((r) => r.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 className={styles.title}>{t.title}</h1>
              <p className={styles.subtitle}>{t.subtitle}</p>
            </div>
            <button type="button" className={styles.buttonSecondary} onClick={toggleUiLocale}>
              {t.langToggle}
            </button>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>{t.recipientsTitle}</h2>
            {recipients.length > 0 && (
              <button
                type="button"
                className={styles.button}
                disabled={callingAll || callingId !== null}
                onClick={handleCallAll}
              >
                {callingAll ? t.callAllBusy : t.callAll}
              </button>
            )}
          </div>

          {recipients.length === 0 && !formOpen && (
            <p className={styles.empty}>{t.emptyRecipients}</p>
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
                    <label className={styles.label} htmlFor={`edit-name-${r.id}`}>{t.nameLabel}</label>
                    <input
                      id={`edit-name-${r.id}`}
                      className={styles.input}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-phone-${r.id}`}>{t.phoneLabel}</label>
                    <input
                      id={`edit-phone-${r.id}`}
                      className={styles.input}
                      value={editPhone}
                      onChange={(e) => {
                        const phone = e.target.value;
                        setEditPhone(phone);
                        if (!isLocaleSupportedForPhone(phone, editLocale)) setEditLocale("ja");
                      }}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-email-${r.id}`}>{t.emailLabel}</label>
                    <input
                      id={`edit-email-${r.id}`}
                      type="email"
                      className={styles.input}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label className={styles.label} htmlFor={`edit-locale-${r.id}`}>{t.localeLabel}</label>
                    <select
                      id={`edit-locale-${r.id}`}
                      className={styles.input}
                      value={editLocale}
                      onChange={(e) => setEditLocale(e.target.value as Locale)}
                    >
                      <option value="en" disabled={!isLocaleSupportedForPhone(editPhone, "en")}>
                        {t.localeOptionEn}
                      </option>
                      <option value="ja">{t.localeOptionJa}</option>
                    </select>
                    {!isLocaleSupportedForPhone(editPhone, "en") && (
                      <p className={styles.empty} style={{ margin: "0.3rem 0 0" }}>{t.localeHintJaOnly}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className={styles.button} type="submit" disabled={editSaving}>
                      {editSaving ? t.saving : t.save}
                    </button>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => setEditingId(null)}
                    >
                      {t.cancel}
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
                    <div className={styles.recipientName}>
                      {r.name} <span style={{ fontWeight: 400, opacity: 0.6 }}>({r.locale.toUpperCase()})</span>
                    </div>
                    <div className={styles.recipientMeta}>
                      {r.phone} ・ {t.notifyLabel}: {r.familyEmail}
                    </div>
                  </button>
                  <div className={styles.recipientActions}>
                    <button
                      className={styles.buttonSecondary}
                      onClick={() => startEditing(r)}
                    >
                      {t.edit}
                    </button>
                    <button
                      className={styles.buttonSecondary}
                      disabled={callingId === r.id}
                      onClick={() => handleCallNow(r.id)}
                    >
                      {callingId === r.id ? t.callNowBusy : t.callNow}
                    </button>
                    <button
                      className={styles.buttonSecondary}
                      disabled={deletingId === r.id}
                      onClick={() => handleDeleteRecipient(r)}
                    >
                      {deletingId === r.id ? t.deleteBusy : t.delete}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {formOpen ? (
            <form className={styles.form} style={{ marginTop: "1rem" }} onSubmit={handleAddRecipient}>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="name">{t.nameLabel}</label>
                <input
                  id="name"
                  className={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="phone">{t.phoneLabel}</label>
                <input
                  id="phone"
                  className={styles.input}
                  value={formPhone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setFormPhone(phone);
                    if (!isLocaleSupportedForPhone(phone, formLocale)) setFormLocale("ja");
                  }}
                  placeholder={t.phonePlaceholder}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="email">{t.emailLabel}</label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="locale">{t.localeLabel}</label>
                <select
                  id="locale"
                  className={styles.input}
                  value={formLocale}
                  onChange={(e) => setFormLocale(e.target.value as Locale)}
                >
                  <option value="en" disabled={!isLocaleSupportedForPhone(formPhone, "en")}>
                    {t.localeOptionEn}
                  </option>
                  <option value="ja">{t.localeOptionJa}</option>
                </select>
                {!isLocaleSupportedForPhone(formPhone, "en") && (
                  <p className={styles.empty} style={{ margin: "0.3rem 0 0" }}>{t.localeHintJaOnly}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.3rem" }}>
                <button className={styles.button} type="submit" disabled={saving}>
                  {saving ? t.registering : t.register}
                </button>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setFormOpen(false)}
                >
                  {t.cancel}
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
              {t.addRecipient}
            </button>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {t.callHistoryTitle(selectedRecipient?.name ?? null)}
          </h2>

          {!selectedRecipient && <p className={styles.empty}>{t.selectRecipientPrompt}</p>}

          {selectedRecipient && calls.length === 0 && (
            <p className={styles.empty}>{t.emptyCallHistory}</p>
          )}

          <div className={styles.callHistory}>
            {calls.map((c) => (
              <div key={c.id} className={styles.callRow}>
                <div className={styles.callHeader}>
                  <span className={LEVEL_BADGE_CLASS[c.level]}>{LEVEL_LABEL[uiLocale][c.level]}</span>
                  <span className={styles.callTime}>
                    {formatDateTime(c.completedAt ?? c.createdAt, uiLocale)}
                  </span>
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
