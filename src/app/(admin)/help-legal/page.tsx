"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, helpLegalApi } from "@/lib/api";
import Section from "@/components/Section";
import {
  Banner,
  ChipGroup,
  Choice,
  Field,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/FormKit";
import type {
  FaqAdmin,
  FaqWrite,
  HelpLegalLocale,
  HelpLegalVocabulary,
  LegalDocumentAdmin,
  LegalDocumentWrite,
  LegalSectionAdmin,
  LegalSubsectionAdmin,
  ReferralProgramAdmin,
  ReferralProgramWrite,
  ReferralStepAdmin,
} from "@/lib/types";

type Tab = "faqs" | "documents" | "referrals";

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: "faqs", label: "FAQs", blurb: "Questions in the app's Help screen" },
  { id: "documents", label: "Legal documents", blurb: "Terms and privacy policy" },
  { id: "referrals", label: "Referral programme", blurb: "Reward, steps and share text" },
];

const FALLBACK_LOCALES: HelpLegalLocale[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
];

function linesToText(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

function textToLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function toDateInput(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.slice(0, 10);
}

function fromDateInput(raw: string): string | null {
  return raw ? new Date(`${raw}T00:00:00Z`).toISOString() : null;
}

export default function HelpLegalPage() {
  const [tab, setTab] = useState<Tab>("faqs");
  const [vocabulary, setVocabulary] = useState<HelpLegalVocabulary | null>(null);

  useEffect(() => {
    helpLegalApi.vocabulary().then(setVocabulary).catch(() => setVocabulary(null));
  }, []);

  const locales = vocabulary?.locales ?? FALLBACK_LOCALES;
  const roles = vocabulary?.roles ?? [];
  const docTypes = vocabulary?.document_types ?? ["policies", "terms"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`rounded-xl border px-4 py-2.5 text-left transition-all ${
              tab === entry.id
                ? "border-amber-300 bg-amber-500/10 shadow-xs"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span
              className={`block text-xs font-bold ${
                tab === entry.id ? "text-amber-900" : "text-slate-800"
              }`}
            >
              {entry.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{entry.blurb}</span>
          </button>
        ))}
      </div>

      {tab === "faqs" && <FaqManager locales={locales} roles={roles} />}
      {tab === "documents" && <DocumentManager locales={locales} docTypes={docTypes} />}
      {tab === "referrals" && <ReferralManager locales={locales} />}
    </div>
  );
}

function LocaleTabs({
  locales,
  active,
  onChange,
  filled,
}: {
  locales: HelpLegalLocale[];
  active: string;
  onChange: (code: string) => void;
  filled: (code: string) => boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {locales.map((locale) => {
        const on = locale.code === active;
        const complete = filled(locale.code);
        return (
          <button
            key={locale.code}
            type="button"
            onClick={() => onChange(locale.code)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              on
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {locale.label}
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                complete ? "bg-emerald-400" : on ? "bg-slate-500" : "bg-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function EnglishNote() {
  return (
    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600">
      Every other language falls back to English, so English must be filled in. A language
      you leave blank is not broken — the app shows the English text instead.
    </p>
  );
}

function RowActions({
  onSave,
  onCancel,
  onDelete,
  saving,
  saveLabel = "Save",
}: {
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50"
      >
        Cancel
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100"
        >
          Delete
        </button>
      )}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-xs font-semibold text-slate-500">
      {children}
    </p>
  );
}

function blankFaq(): FaqWrite {
  return {
    key: "",
    display_order: 0,
    roles: [],
    is_active: true,
    translations: { en: { question: "", answer: "" } },
  };
}

function FaqManager({
  locales,
  roles,
}: {
  locales: HelpLegalLocale[];
  roles: string[];
}) {
  const [items, setItems] = useState<FaqAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FaqWrite | null>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    let cancelled = false;
    helpLegalApi
      .listFaqs()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e, "Could not load the FAQs."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = () => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  };

  const startNew = () => {
    setEditingId("new");
    setDraft({ ...blankFaq(), display_order: items.length });
    setLocale("en");
    setNotice(null);
  };

  const startEdit = (faq: FaqAdmin) => {
    setEditingId(faq.id);
    setDraft({
      key: faq.key,
      display_order: faq.display_order,
      roles: faq.roles,
      is_active: faq.is_active,
      translations: JSON.parse(JSON.stringify(faq.translations)),
    });
    setLocale("en");
    setNotice(null);
  };

  const close = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const patchTranslation = (field: "question" | "answer", value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const bucket = current.translations[locale] ?? { question: "", answer: "" };
      return {
        ...current,
        translations: { ...current.translations, [locale]: { ...bucket, [field]: value } },
      };
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const body: FaqWrite = { ...draft, key: draft.key || slugify(draft.translations.en?.question ?? "") };
      if (editingId && editingId !== "new") {
        await helpLegalApi.updateFaq(editingId, body);
      } else {
        await helpLegalApi.createFaq(body);
      }
      setNotice("Saved. The app picks it up on the next Help screen open.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not save that FAQ."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (faqId: string) => {
    if (!window.confirm("Delete this FAQ? Vendors will stop seeing it immediately.")) return;
    setError(null);
    try {
      await helpLegalApi.deleteFaq(faqId);
      setNotice("FAQ deleted.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not delete that FAQ."));
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      const ordered = await helpLegalApi.reorderFaqs(next.map((item) => item.id));
      setItems(ordered);
    } catch (e) {
      setError(errorText(e, "Could not reorder the FAQs."));
      reload();
    }
  };

  const localeFilled = (code: string) => {
    const bucket = draft?.translations[code];
    return Boolean(bucket?.question?.trim() && bucket?.answer?.trim());
  };

  return (
    <div className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}
      {notice && !error && <Banner tone="success">{notice}</Banner>}

      <Section
        title={`FAQs (${items.length})`}
        action={
          <button
            type="button"
            onClick={startNew}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
          >
            + Add FAQ
          </button>
        }
      >
        {loading ? (
          <EmptyHint>Loading…</EmptyHint>
        ) : items.length === 0 ? (
          <EmptyHint>
            No FAQs yet — this is why the Help screen in the app is empty. Add the first one.
          </EmptyHint>
        ) : (
          <ul className="space-y-2">
            {items.map((faq, index) => (
              <li
                key={faq.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="flex flex-col gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-slate-200 px-1.5 text-[10px] font-bold text-slate-500 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-lg border border-slate-200 px-1.5 text-[10px] font-bold text-slate-500 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {faq.translations.en?.question || faq.key}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                    {faq.translations.en?.answer}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {faq.key}
                    </span>
                    {!faq.is_active && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        Hidden
                      </span>
                    )}
                    {faq.roles.length > 0 && (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                        {faq.roles.join(", ")}
                      </span>
                    )}
                    {locales
                      .filter((l) => l.code !== "en" && faq.translations[l.code]?.question)
                      .map((l) => (
                        <span
                          key={l.code}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                        >
                          {l.label}
                        </span>
                      ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(faq)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {draft && (
        <Section title={editingId === "new" ? "New FAQ" : "Edit FAQ"}>
          <div className="space-y-4">
            <EnglishNote />
            <LocaleTabs
              locales={locales}
              active={locale}
              onChange={setLocale}
              filled={localeFilled}
            />

            <Field label="Question">
              <TextInput
                value={draft.translations[locale]?.question ?? ""}
                onChange={(value) => patchTranslation("question", value)}
                placeholder="How do I get paid?"
              />
            </Field>

            <Field label="Answer">
              <TextArea
                value={draft.translations[locale]?.answer ?? ""}
                onChange={(value) => patchTranslation("answer", value)}
                placeholder="Payouts are settled every Monday for the previous week."
                rows={5}
              />
            </Field>

            <Field
              label="Key"
              hint="A stable identifier. Leave blank to derive it from the English question."
            >
              <TextInput
                value={draft.key}
                onChange={(value) => setDraft({ ...draft, key: value })}
                placeholder="how-do-i-get-paid"
              />
            </Field>

            {roles.length > 0 && (
              <ChipGroup
                label="Show to"
                options={roles}
                selected={draft.roles}
                onChange={(next) => setDraft({ ...draft, roles: next })}
                allLabel="Everyone"
              />
            )}

            <Toggle
              label="Visible in the app"
              hint="Turn this off to retire an answer without deleting it."
              checked={draft.is_active}
              onChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />

            <RowActions
              onSave={save}
              onCancel={close}
              onDelete={
                editingId && editingId !== "new" ? () => remove(editingId) : undefined
              }
              saving={saving}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function blankDocument(docType: string): LegalDocumentWrite {
  return {
    doc_type: docType,
    version: "1.0",
    is_active: true,
    effective_from: null,
    translations: { en: { title: "" } },
    sections: [],
  };
}

function DocumentManager({
  locales,
  docTypes,
}: {
  locales: HelpLegalLocale[];
  docTypes: string[];
}) {
  const [items, setItems] = useState<LegalDocumentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LegalDocumentWrite | null>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    let cancelled = false;
    helpLegalApi
      .listDocuments()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e, "Could not load the documents."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = () => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  };

  const startNew = (docType: string) => {
    setEditingId("new");
    setDraft(blankDocument(docType));
    setLocale("en");
    setNotice(null);
  };

  const startEdit = (document: LegalDocumentAdmin) => {
    setEditingId(document.id);
    setDraft({
      doc_type: document.doc_type,
      version: document.version,
      is_active: document.is_active,
      effective_from: document.effective_from ?? null,
      translations: JSON.parse(JSON.stringify(document.translations)),
      sections: JSON.parse(JSON.stringify(document.sections)),
    });
    setLocale("en");
    setNotice(null);
  };

  const close = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const patchSection = (index: number, next: LegalSectionAdmin) => {
    if (!draft) return;
    const sections = [...draft.sections];
    sections[index] = next;
    setDraft({ ...draft, sections });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const body: LegalDocumentWrite = {
        ...draft,
        sections: draft.sections.map((section, index) => ({
          ...section,
          key: section.key || slugify(section.translations.en?.title ?? `section-${index + 1}`),
          display_order: index,
          subsections: section.subsections.map((sub, subIndex) => ({
            ...sub,
            key: sub.key || slugify(sub.translations.en?.title ?? `part-${subIndex + 1}`),
            display_order: subIndex,
          })),
        })),
      };
      if (editingId && editingId !== "new") {
        await helpLegalApi.updateDocument(editingId, body);
      } else {
        await helpLegalApi.createDocument(body);
      }
      setNotice("Saved. Publishing a version deactivates the other versions of that document.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not save that document."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (documentId: string) => {
    if (!window.confirm("Delete this document version, with all its sections?")) return;
    setError(null);
    try {
      await helpLegalApi.deleteDocument(documentId);
      setNotice("Document deleted.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not delete that document."));
    }
  };

  const localeFilled = (code: string) => Boolean(draft?.translations[code]?.title?.trim());

  const grouped = useMemo(() => {
    return docTypes.map((docType) => ({
      docType,
      documents: items.filter((item) => item.doc_type === docType),
    }));
  }, [docTypes, items]);

  return (
    <div className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}
      {notice && !error && <Banner tone="success">{notice}</Banner>}

      {grouped.map(({ docType, documents }) => (
        <Section
          key={docType}
          title={docType === "terms" ? "Terms & conditions" : "Privacy policy"}
          action={
            <button
              type="button"
              onClick={() => startNew(docType)}
              className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
            >
              + New version
            </button>
          }
        >
          {loading ? (
            <EmptyHint>Loading…</EmptyHint>
          ) : documents.length === 0 ? (
            <EmptyHint>
              Nothing published — the app gets a 404 for /help-legal/documents/{docType}.
            </EmptyHint>
          ) : (
            <ul className="space-y-2">
              {documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {document.translations.en?.title || document.doc_type}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        v{document.version}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          document.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {document.is_active ? "Live" : "Archived"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {document.sections.length} sections
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(document)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}

      {draft && (
        <Section title={editingId === "new" ? "New document version" : "Edit document"}>
          <div className="space-y-4">
            <EnglishNote />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Document">
                <Choice
                  value={draft.doc_type}
                  options={docTypes}
                  onChange={(value) => setDraft({ ...draft, doc_type: value })}
                  labels={docTypes.map((t) => (t === "terms" ? "Terms" : "Privacy policy"))}
                />
              </Field>
              <Field label="Version" hint="Unique per document.">
                <TextInput
                  value={draft.version}
                  onChange={(value) => setDraft({ ...draft, version: value })}
                  placeholder="1.0"
                />
              </Field>
              <Field label="Effective from" hint="Blank means today.">
                <TextInput
                  type="date"
                  value={toDateInput(draft.effective_from)}
                  onChange={(value) =>
                    setDraft({ ...draft, effective_from: fromDateInput(value) })
                  }
                />
              </Field>
            </div>

            <LocaleTabs
              locales={locales}
              active={locale}
              onChange={setLocale}
              filled={localeFilled}
            />

            <Field label="Document title">
              <TextInput
                value={draft.translations[locale]?.title ?? ""}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    translations: { ...draft.translations, [locale]: { title: value } },
                  })
                }
                placeholder="Terms of Service"
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Sections
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      sections: [
                        ...draft.sections,
                        {
                          key: "",
                          display_order: draft.sections.length,
                          translations: { en: { title: "", paragraphs: [] } },
                          subsections: [],
                        },
                      ],
                    })
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  + Add section
                </button>
              </div>

              {draft.sections.length === 0 && (
                <EmptyHint>A document with no sections shows an empty screen in the app.</EmptyHint>
              )}

              {draft.sections.map((section, index) => (
                <SectionEditor
                  key={section.id ?? `section-${index}`}
                  section={section}
                  locale={locale}
                  index={index}
                  onChange={(next) => patchSection(index, next)}
                  onRemove={() =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.filter((_, i) => i !== index),
                    })
                  }
                />
              ))}
            </div>

            <Toggle
              label="Publish this version"
              hint="The app always serves the newest published version. Publishing archives the others."
              checked={draft.is_active}
              onChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />

            <RowActions
              onSave={save}
              onCancel={close}
              onDelete={
                editingId && editingId !== "new" ? () => remove(editingId) : undefined
              }
              saving={saving}
              saveLabel="Save document"
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function SectionEditor({
  section,
  locale,
  index,
  onChange,
  onRemove,
}: {
  section: LegalSectionAdmin;
  locale: string;
  index: number;
  onChange: (next: LegalSectionAdmin) => void;
  onRemove: () => void;
}) {
  const bucket = section.translations[locale] ?? { title: "", paragraphs: [] };

  const patch = (field: "title" | "paragraphs", value: string) => {
    onChange({
      ...section,
      translations: {
        ...section.translations,
        [locale]:
          field === "title"
            ? { ...bucket, title: value }
            : { ...bucket, paragraphs: textToLines(value) },
      },
    });
  };

  const patchSubsection = (subIndex: number, next: LegalSubsectionAdmin) => {
    const subsections = [...section.subsections];
    subsections[subIndex] = next;
    onChange({ ...section, subsections });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Section {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
        >
          Remove
        </button>
      </div>

      <Field label="Heading">
        <TextInput
          value={bucket.title ?? ""}
          onChange={(value) => patch("title", value)}
          placeholder="Use of the service"
        />
      </Field>

      <Field label="Paragraphs" hint="One paragraph per line.">
        <TextArea
          value={linesToText(bucket.paragraphs)}
          onChange={(value) => patch("paragraphs", value)}
          rows={4}
        />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Sub-sections
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...section,
                subsections: [
                  ...section.subsections,
                  {
                    key: "",
                    display_order: section.subsections.length,
                    translations: { en: { title: "", bullets: [] } },
                  },
                ],
              })
            }
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
          >
            + Add sub-section
          </button>
        </div>

        {section.subsections.map((subsection, subIndex) => {
          const subBucket = subsection.translations[locale] ?? { title: "", bullets: [] };
          return (
            <div
              key={subsection.id ?? `sub-${subIndex}`}
              className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-section {subIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...section,
                      subsections: section.subsections.filter((_, i) => i !== subIndex),
                    })
                  }
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                >
                  Remove
                </button>
              </div>
              <Field label="Heading">
                <TextInput
                  value={subBucket.title ?? ""}
                  onChange={(value) =>
                    patchSubsection(subIndex, {
                      ...subsection,
                      translations: {
                        ...subsection.translations,
                        [locale]: { ...subBucket, title: value },
                      },
                    })
                  }
                />
              </Field>
              <Field label="Bullets" hint="One bullet per line.">
                <TextArea
                  value={linesToText(subBucket.bullets)}
                  onChange={(value) =>
                    patchSubsection(subIndex, {
                      ...subsection,
                      translations: {
                        ...subsection.translations,
                        [locale]: { ...subBucket, bullets: textToLines(value) },
                      },
                    })
                  }
                  rows={3}
                />
              </Field>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function blankProgram(): ReferralProgramWrite {
  return {
    key: "",
    reward_amount: 0,
    currency: "INR",
    terms_url: null,
    is_active: true,
    valid_from: null,
    valid_to: null,
    translations: { en: { headline: "", share_message: "" } },
    steps: [],
  };
}

function ReferralManager({ locales }: { locales: HelpLegalLocale[] }) {
  const [items, setItems] = useState<ReferralProgramAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReferralProgramWrite | null>(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    let cancelled = false;
    helpLegalApi
      .listPrograms()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e, "Could not load the referral programmes."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = () => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  };

  const startNew = () => {
    setEditingId("new");
    setDraft(blankProgram());
    setLocale("en");
    setNotice(null);
  };

  const startEdit = (program: ReferralProgramAdmin) => {
    setEditingId(program.id);
    setDraft({
      key: program.key,
      reward_amount: program.reward_amount,
      currency: program.currency,
      terms_url: program.terms_url ?? null,
      is_active: program.is_active,
      valid_from: program.valid_from ?? null,
      valid_to: program.valid_to ?? null,
      translations: JSON.parse(JSON.stringify(program.translations)),
      steps: JSON.parse(JSON.stringify(program.steps)),
    });
    setLocale("en");
    setNotice(null);
  };

  const close = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const patchTranslation = (field: "headline" | "share_message", value: string) => {
    setDraft((current) => {
      if (!current) return current;
      const bucket = current.translations[locale] ?? { headline: "", share_message: "" };
      return {
        ...current,
        translations: { ...current.translations, [locale]: { ...bucket, [field]: value } },
      };
    });
  };

  const patchStep = (index: number, next: ReferralStepAdmin) => {
    if (!draft) return;
    const steps = [...draft.steps];
    steps[index] = next;
    setDraft({ ...draft, steps });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const body: ReferralProgramWrite = {
        ...draft,
        key: draft.key || slugify(draft.translations.en?.headline ?? "referral"),
        steps: draft.steps.map((step, index) => ({ ...step, step_number: index + 1 })),
      };
      if (editingId && editingId !== "new") {
        await helpLegalApi.updateProgram(editingId, body);
      } else {
        await helpLegalApi.createProgram(body);
      }
      setNotice("Saved. Activating a programme deactivates the others.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not save that programme."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (programId: string) => {
    if (!window.confirm("Delete this referral programme?")) return;
    setError(null);
    try {
      await helpLegalApi.deleteProgram(programId);
      setNotice("Programme deleted.");
      close();
      reload();
    } catch (e) {
      setError(errorText(e, "Could not delete that programme."));
    }
  };

  const localeFilled = (code: string) => {
    const bucket = draft?.translations[code];
    return Boolean(bucket?.headline?.trim() && bucket?.share_message?.trim());
  };

  return (
    <div className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}
      {notice && !error && <Banner tone="success">{notice}</Banner>}

      <Section
        title={`Referral programmes (${items.length})`}
        action={
          <button
            type="button"
            onClick={startNew}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-800"
          >
            + Add programme
          </button>
        }
      >
        {loading ? (
          <EmptyHint>Loading…</EmptyHint>
        ) : items.length === 0 ? (
          <EmptyHint>
            No programme is running, so /help-legal/referrals/me answers 404 and the app hides
            the Refer &amp; Earn screen.
          </EmptyHint>
        ) : (
          <ul className="space-y-2">
            {items.map((program) => (
              <li
                key={program.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {program.translations.en?.headline || program.key}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {program.currency} {program.reward_amount}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        program.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {program.is_active ? "Running" : "Stopped"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {program.steps.length} steps
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(program)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {draft && (
        <Section title={editingId === "new" ? "New programme" : "Edit programme"}>
          <div className="space-y-4">
            <EnglishNote />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Reward amount">
                <TextInput
                  type="number"
                  value={String(draft.reward_amount)}
                  onChange={(value) =>
                    setDraft({ ...draft, reward_amount: Number(value) || 0 })
                  }
                />
              </Field>
              <Field label="Currency">
                <TextInput
                  value={draft.currency}
                  onChange={(value) => setDraft({ ...draft, currency: value.toUpperCase() })}
                />
              </Field>
              <Field label="Key" hint="Leave blank to derive it from the headline.">
                <TextInput
                  value={draft.key}
                  onChange={(value) => setDraft({ ...draft, key: value })}
                  placeholder="launch-2026"
                />
              </Field>
              <Field label="Runs from" hint="Blank means immediately.">
                <TextInput
                  type="date"
                  value={toDateInput(draft.valid_from)}
                  onChange={(value) =>
                    setDraft({ ...draft, valid_from: fromDateInput(value) })
                  }
                />
              </Field>
              <Field label="Runs until" hint="Blank means no end date.">
                <TextInput
                  type="date"
                  value={toDateInput(draft.valid_to)}
                  onChange={(value) => setDraft({ ...draft, valid_to: fromDateInput(value) })}
                />
              </Field>
              <Field label="Terms URL">
                <TextInput
                  value={draft.terms_url ?? ""}
                  onChange={(value) => setDraft({ ...draft, terms_url: value || null })}
                  placeholder="https://link2build.in/referral-terms"
                />
              </Field>
            </div>

            <LocaleTabs
              locales={locales}
              active={locale}
              onChange={setLocale}
              filled={localeFilled}
            />

            <Field
              label="Headline"
              hint="{amount} and {currency} are replaced with the reward above."
            >
              <TextInput
                value={draft.translations[locale]?.headline ?? ""}
                onChange={(value) => patchTranslation("headline", value)}
                placeholder="Refer a vendor, earn {currency} {amount}"
              />
            </Field>

            <Field
              label="Share message"
              hint="{code} is replaced with the sender's own referral code."
            >
              <TextArea
                value={draft.translations[locale]?.share_message ?? ""}
                onChange={(value) => patchTranslation("share_message", value)}
                placeholder="Join Link2Build with my code {code} and we both earn {currency} {amount}."
                rows={3}
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  How it works
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      steps: [
                        ...draft.steps,
                        {
                          step_number: draft.steps.length + 1,
                          translations: { en: { title: "", description: "" } },
                        },
                      ],
                    })
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  + Add step
                </button>
              </div>

              {draft.steps.map((step, index) => {
                const bucket = step.translations[locale] ?? { title: "", description: "" };
                return (
                  <div
                    key={step.id ?? `step-${index}`}
                    className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Step {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            steps: draft.steps.filter((_, i) => i !== index),
                          })
                        }
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                      >
                        Remove
                      </button>
                    </div>
                    <Field label="Title">
                      <TextInput
                        value={bucket.title ?? ""}
                        onChange={(value) =>
                          patchStep(index, {
                            ...step,
                            translations: {
                              ...step.translations,
                              [locale]: { ...bucket, title: value },
                            },
                          })
                        }
                        placeholder="Share your code"
                      />
                    </Field>
                    <Field label="Description">
                      <TextArea
                        value={bucket.description ?? ""}
                        onChange={(value) =>
                          patchStep(index, {
                            ...step,
                            translations: {
                              ...step.translations,
                              [locale]: { ...bucket, description: value },
                            },
                          })
                        }
                        rows={2}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>

            <Toggle
              label="Run this programme"
              hint="Only one programme runs at a time — turning this on stops the others."
              checked={draft.is_active}
              onChange={(checked) => setDraft({ ...draft, is_active: checked })}
            />

            <RowActions
              onSave={save}
              onCancel={close}
              onDelete={
                editingId && editingId !== "new" ? () => remove(editingId) : undefined
              }
              saving={saving}
              saveLabel="Save programme"
            />
          </div>
        </Section>
      )}
    </div>
  );
}
