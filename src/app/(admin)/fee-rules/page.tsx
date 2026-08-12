"use client";

import { useEffect, useState } from "react";
import { ApiError, feeRuleApi } from "@/lib/api";
import type { FeeRule, FeeRuleSimulation, FeeRuleWrite, RuleField } from "@/lib/types";
import { describeFeeRule, humanise } from "@/lib/labels";
import ConditionBuilder, {
  toConditionNode,
  toRows,
  type ConditionRow,
} from "@/components/ConditionBuilder";
import {
  Advanced,
  Banner,
  ChipGroup,
  Choice,
  Field,
  FormSection,
  Preview,
  Row,
  StatusPill,
  TextInput,
} from "@/components/FormKit";

const KINDS = ["deduction", "tax", "bata", "adjustment"];
const CALC_METHODS = ["percent", "flat", "per_unit", "slab"];
const PERCENT_BASES = ["gross", "net_after_deductions", "component:COMMISSION"];
const UNIT_BASES = ["unit:hours_booked", "unit:actual_km", "unit:days"];
const STRATEGIES = ["first_match", "all_match"];
const ROUND_MODES = ["half_up", "half_even", "floor", "ceiling"];
const PAYEE_TYPES = [
  "rental_vendor_company",
  "rental_vendor_individual",
  "material_vendor",
  "operator_company",
  "operator_independent",
];
const SOURCE_TYPES = ["rental_booking", "material_order"];
const PAYMENT_MODES = ["online", "cod"];

function blank(): FeeRuleWrite {
  return {
    code: "",
    name: "",
    kind: "deduction",
    component_code: "",
    calc_method: "percent",
    base_expr: "gross",
    priority: 100,
    rule_group: "",
    selection_strategy: "first_match",
    rate_value: "",
    min_amount: null,
    max_amount: null,
    round_mode: "half_up",
    round_to: "0.01",
    discountable: false,
    payee_types: [],
    source_types: [],
    payment_modes: [],
  };
}

function basesFor(calcMethod: string): string[] {
  if (calcMethod === "per_unit") return UNIT_BASES;
  if (calcMethod === "flat") return ["flat"];
  return PERCENT_BASES;
}

export default function FeeRulesPage() {
  const [rules, setRules] = useState<FeeRule[]>([]);
  const [fields, setFields] = useState<RuleField[]>([]);
  const [draft, setDraft] = useState<FeeRuleWrite>(blank());
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<FeeRuleSimulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const [list, catalogue] = await Promise.all([
        feeRuleApi.list(),
        feeRuleApi.catalogue("fee_rule"),
      ]);
      setRules(list);
      setFields(catalogue.fields);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load charges");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setDraft(blank());
    setConditions([]);
    setEditingId(null);
    setSimulation(null);
  };

  const payload = (): FeeRuleWrite => ({
    ...draft,
    rule_group: draft.rule_group || null,
    rate_value: draft.calc_method === "slab" ? null : draft.rate_value || "0",
    min_amount: draft.min_amount || null,
    max_amount: draft.max_amount || null,
    conditions: toConditionNode(conditions),
  });

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const edit = (rule: FeeRule) => {
    setEditingId(rule.status === "draft" ? rule.id : null);
    setDraft({
      code: rule.code,
      name: rule.name,
      kind: rule.kind,
      component_code: rule.component_code,
      calc_method: rule.calc_method,
      base_expr: rule.base_expr,
      priority: rule.priority,
      rule_group: rule.rule_group ?? "",
      selection_strategy: rule.selection_strategy,
      rate_value: rule.rate_value ?? "",
      min_amount: rule.min_amount,
      max_amount: rule.max_amount,
      round_mode: rule.round_mode,
      round_to: rule.round_to,
      discountable: rule.discountable,
      payee_types: rule.payee_types,
      source_types: rule.source_types,
      payment_modes: rule.payment_modes,
    });
    setConditions(toRows(rule.conditions));
    setSimulation(null);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const amountLabel =
    draft.calc_method === "percent"
      ? "Percentage Rate (%)"
      : draft.calc_method === "per_unit"
        ? "Amount per unit (₹)"
        : "Flat Amount (₹)";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Deduction Rules Engine</h1>
          <p className="text-xs font-medium text-slate-500">
            Configure platform commission, tax rates, and settlement deduction rules.
          </p>
        </div>
      </header>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {/* Rules Table Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Configured Settlement Deduction Rules ({rules.length})
          </h2>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Rule Name & Code</th>
              <th className="text-left">Deduction Formula</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-medium text-slate-400">
                  No deduction rules configured. Build one below.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="transition-colors hover:bg-slate-50/80">
                  <td>
                    <p className="font-bold text-slate-900">{rule.name}</p>
                    <p className="font-mono text-xs font-semibold text-slate-500">
                      {rule.code} · v{rule.version}
                    </p>
                  </td>
                  <td className="font-mono text-xs font-semibold text-slate-700">
                    {rule.calc_method === "percent"
                      ? `${rule.rate_value}% of ${humanise(rule.base_expr)}`
                      : rule.calc_method === "flat"
                        ? `₹${rule.rate_value} flat`
                        : `${humanise(rule.calc_method)} on ${humanise(rule.base_expr)}`}
                  </td>
                  <td className="text-center">
                    <StatusPill status={rule.status} />
                  </td>
                  <td className="space-x-3 text-right">
                    <button
                      onClick={() => edit(rule)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      {rule.status === "draft" ? "Edit Draft" : "New Version"}
                    </button>
                    {rule.status === "draft" && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(() => feeRuleApi.activate(rule.id), `${rule.name} activated`)
                          }
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Make Live
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (!confirm(`Delete draft rule "${rule.name}"?`)) return;
                            if (editingId === rule.id) reset();
                            run(() => feeRuleApi.remove(rule.id), "Draft deleted");
                          }}
                          className="text-xs font-bold text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {rule.status === "active" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(() => feeRuleApi.pause(rule.id), `${rule.name} paused`)
                        }
                        className="text-xs font-bold text-amber-800 hover:underline"
                      >
                        Pause
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Rule Form Section */}
      <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {editingId ? "Edit Fee Rule Draft" : "Add New Settlement Charge Rule"}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Draft rules do not affect active settlements until activated.
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Reset Form
          </button>
        </div>

        <FormSection step={1} title="Rule Identification" blurb="Set name and tracking component code">
          <Row>
            <Field label="Rule Name (Shown on Settlement)">
              <TextInput
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                placeholder="Platform Commission Rate"
              />
            </Field>
            <Field label="Internal Rule Code" hint="Uppercase identifier">
              <TextInput
                value={draft.code}
                onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })}
                placeholder="COMMISSION_DEFAULT"
                disabled={Boolean(editingId)}
              />
            </Field>
            <Field label="Charge Kind">
              <Choice
                value={draft.kind}
                options={KINDS}
                onChange={(v) => setDraft({ ...draft, kind: v })}
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection step={2} title="Calculation Formula" blurb="Specify rate calculation method and bounds">
          <Row>
            <Field label="Calculation Method">
              <Choice
                value={draft.calc_method}
                options={CALC_METHODS}
                onChange={(v) =>
                  setDraft({ ...draft, calc_method: v, base_expr: basesFor(v)[0] })
                }
              />
            </Field>
            <Field label={amountLabel}>
              <TextInput
                value={draft.rate_value ?? ""}
                onChange={(v) => setDraft({ ...draft, rate_value: v })}
                placeholder={draft.calc_method === "percent" ? "18" : "49"}
                disabled={draft.calc_method === "slab"}
              />
            </Field>
            {draft.calc_method !== "flat" && (
              <Field label="Calculation Base">
                <Choice
                  value={draft.base_expr}
                  options={basesFor(draft.calc_method)}
                  onChange={(v) => setDraft({ ...draft, base_expr: v })}
                />
              </Field>
            )}
          </Row>

          <Row>
            <Field label="Floor Minimum Amount (₹)">
              <TextInput
                value={draft.min_amount ?? ""}
                onChange={(v) => setDraft({ ...draft, min_amount: v })}
                placeholder="No min floor"
              />
            </Field>
            <Field label="Cap Maximum Amount (₹)">
              <TextInput
                value={draft.max_amount ?? ""}
                onChange={(v) => setDraft({ ...draft, max_amount: v })}
                placeholder="No max cap"
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection step={3} title="Target Scope & Conditions" blurb="Select payee categories and order filters">
          <ChipGroup
            label="Target Payee Categories"
            options={PAYEE_TYPES}
            selected={draft.payee_types ?? []}
            onChange={(v) => setDraft({ ...draft, payee_types: v })}
            allLabel="All Payees"
          />
          <ChipGroup
            label="Target Order Sources"
            options={SOURCE_TYPES}
            selected={draft.source_types ?? []}
            onChange={(v) => setDraft({ ...draft, source_types: v })}
            allLabel="All Order Types"
          />
          <ChipGroup
            label="Payment Modes"
            options={PAYMENT_MODES}
            selected={draft.payment_modes ?? []}
            onChange={(v) => setDraft({ ...draft, payment_modes: v })}
            allLabel="All Modes"
          />
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Condition Criteria Rules
            </span>
            <ConditionBuilder
              fields={fields}
              rows={conditions}
              onChange={setConditions}
              emptyLabel="Applies to all matching orders."
            />
          </div>
        </FormSection>

        <FormSection step={4} title="Review Rule Definition" blurb="Verify plain-English formula description">
          <Preview>{describeFeeRule(payload())}</Preview>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  setSimulation(await feeRuleApi.simulate(payload()));
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : "Simulation run failed");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Simulate Historical Impact
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    editingId
                      ? feeRuleApi.updateDraft(editingId, payload())
                      : feeRuleApi.createDraft(payload()),
                  editingId ? "Draft rule updated" : "Draft rule saved"
                )
              }
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all"
            >
              {editingId ? "Save Version Changes" : "Save as Draft Rule"}
            </button>
          </div>

          {simulation && <SimulationPanel result={simulation} />}
        </FormSection>
      </section>
    </div>
  );
}

function SimulationPanel({ result }: { result: FeeRuleSimulation }) {
  const delta = Number(result.total_net_delta);
  if (result.sample_size === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs font-semibold text-amber-900">
        No completed settlements available to simulate rule impact.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
        Simulation impact across last {result.sample_size} settlements
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Settlements Impacted" value={String(result.settlements_changed)} />
        <Stat
          label="Vendor Take-Home Change"
          value={`${delta >= 0 ? "+" : "−"}₹${Math.abs(delta).toFixed(2)}`}
          tone={delta >= 0 ? "text-emerald-700" : "text-rose-700"}
        />
        <Stat
          label="Max Single Shift"
          value={result.largest_increase ? `₹${result.largest_increase.net_delta}` : "—"}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-slate-900",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-extrabold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
