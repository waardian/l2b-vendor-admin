"use client";

import { useEffect, useState } from "react";
import { ApiError, campaignApi } from "@/lib/api";
import type {
  Campaign,
  CampaignSimulation,
  CampaignTierWrite,
  CampaignVersion,
  CampaignVocabulary,
  CampaignWrite,
} from "@/lib/types";
import { describeTier, humanise, isCommissionReward, isPercentReward } from "@/lib/labels";
import ConditionBuilder, {
  toConditionNode,
  toRows,
  type ConditionRow,
} from "@/components/ConditionBuilder";
import {
  Advanced,
  Banner,
  Choice,
  Field,
  FormSection,
  Preview,
  Row,
  StatusPill,
  TextInput,
} from "@/components/FormKit";

function blankTier(): CampaignTierWrite {
  return {
    threshold_from: "10",
    reward_type: "flat_bonus_once",
    reward_value: "100",
    applies_to: "threshold_order_only",
    label: "",
    per_order_cap: null,
    per_period_cap: null,
    max_awards: null,
    min_order_amount: null,
  };
}

function blankCampaign(): CampaignWrite {
  return {
    code: "",
    name: "",
    metric: "completed_orders",
    period_type: "monthly",
    starts_at: new Date().toISOString().slice(0, 16),
    tiers: [blankTier()],
    payout_mode: "with_settlement",
    priority: 100,
    stackable: false,
    total_budget: null,
    on_budget_exhausted: "stop",
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [vocab, setVocab] = useState<CampaignVocabulary | null>(null);
  const [draft, setDraft] = useState<CampaignWrite>(blankCampaign());
  const [audience, setAudience] = useState<ConditionRow[]>([]);
  const [metricFilter, setMetricFilter] = useState<ConditionRow[]>([]);
  const [editing, setEditing] = useState<{ campaignId: string; versionId: string } | null>(
    null
  );
  const [simulation, setSimulation] = useState<CampaignSimulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const [list, vocabulary] = await Promise.all([
        campaignApi.list(),
        campaignApi.vocabulary(),
      ]);
      setCampaigns(list);
      setVocab(vocabulary);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load campaigns");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setDraft(blankCampaign());
    setAudience([]);
    setMetricFilter([]);
    setEditing(null);
    setSimulation(null);
  };

  const payload = (): CampaignWrite => ({
    ...draft,
    starts_at: new Date(draft.starts_at).toISOString(),
    total_budget: draft.total_budget || null,
    audience: toConditionNode(audience),
    metric_filter: toConditionNode(metricFilter),
    tiers: draft.tiers.map((tier) => ({
      ...tier,
      label: tier.label || describeTier(tier, draft.metric),
      per_order_cap: tier.per_order_cap || null,
      per_period_cap: tier.per_period_cap || null,
      min_order_amount: tier.min_order_amount || null,
      max_awards: tier.max_awards ? Number(tier.max_awards) : null,
    })),
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

  const openVersion = async (campaign: Campaign) => {
    const versionId = campaign.latest_version_id ?? campaign.active_version_id;
    if (!versionId) return;
    setBusy(true);
    setError(null);
    try {
      const version: CampaignVersion = await campaignApi.getVersion(
        campaign.id,
        versionId
      );
      setDraft({
        code: campaign.code,
        name: campaign.name,
        metric: version.metric,
        period_type: version.period_type,
        period_length: version.period_length,
        starts_at: version.starts_at.slice(0, 16),
        ends_at: version.ends_at,
        payout_mode: version.payout_mode,
        total_budget: campaign.total_budget,
        on_budget_exhausted: campaign.on_budget_exhausted,
        priority: version.priority,
        stackable: version.stackable,
        stack_group: version.stack_group,
        max_awards_per_period: version.max_awards_per_period,
        max_awards_lifetime: version.max_awards_lifetime,
        per_payee_period_cap: version.per_payee_period_cap,
        per_payee_lifetime_cap: version.per_payee_lifetime_cap,
        tiers: version.tiers.map((tier) => ({
          threshold_from: tier.threshold_from,
          reward_type: tier.reward_type,
          reward_value: tier.reward_value,
          applies_to: tier.applies_to,
          label: tier.label,
          per_order_cap: tier.per_order_cap,
          per_period_cap: tier.per_period_cap,
          max_awards: tier.max_awards,
          min_order_amount: tier.min_order_amount,
        })),
      });
      setAudience(toRows(version.audience));
      setMetricFilter(toRows(version.metric_filter));
      setEditing({ campaignId: campaign.id, versionId: version.id });
      setSimulation(null);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open campaign version");
    } finally {
      setBusy(false);
    }
  };

  const patchTier = (index: number, patch: Partial<CampaignTierWrite>) =>
    setDraft({
      ...draft,
      tiers: draft.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    });

  const rewardTypes = (vocab?.reward_types ?? []).map((r) => r.value);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header Banner */}
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Incentive Campaigns</h1>
          <p className="text-xs font-medium text-slate-500">
            Configure partner target bonuses, milestone rewards & commission waivers.
          </p>
        </div>
      </header>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {/* Campaigns Table Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Configured Campaigns ({campaigns.length})
          </h2>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Campaign Name</th>
              <th className="text-left">Budget Consumed</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-medium text-slate-400">
                  No incentive campaigns configured yet. Build one using the form below.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="transition-colors hover:bg-slate-50/80">
                  <td>
                    <p className="font-bold text-slate-900">{campaign.name}</p>
                    <p className="font-mono text-xs font-semibold text-slate-500">
                      {campaign.code}
                      {campaign.latest_version ? ` · v${campaign.latest_version}` : ""}
                    </p>
                  </td>
                  <td className="font-mono text-xs font-bold text-slate-700">
                    {campaign.total_budget
                      ? `₹${campaign.budget_consumed} of ₹${campaign.total_budget}`
                      : "No budget cap"}
                  </td>
                  <td className="text-center">
                    <StatusPill status={campaign.status} />
                  </td>
                  <td className="space-x-3 text-right">
                    {campaign.latest_version_id && (
                      <button
                        disabled={busy}
                        onClick={() => openVersion(campaign)}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                      >
                        Edit
                      </button>
                    )}

                    {campaign.status === "active" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(() => campaignApi.pause(campaign.id), `${campaign.name} paused`)
                        }
                        className="text-xs font-bold text-amber-800 hover:underline"
                      >
                        Pause
                      </button>
                    )}

                    {campaign.status === "paused" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => campaignApi.resume(campaign.id),
                            `${campaign.name} resumed`
                          )
                        }
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Resume
                      </button>
                    )}

                    {campaign.status !== "active" &&
                      campaign.status !== "paused" &&
                      campaign.latest_version_id && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(
                              () => campaignApi.activate(campaign.id),
                              `${campaign.name} activated`
                            )
                          }
                          className="text-xs font-bold text-emerald-700 hover:underline"
                        >
                          Make Live
                        </button>
                      )}

                    <button
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`Delete "${campaign.name}"? This action cannot be undone.`))
                          return;
                        if (editing?.campaignId === campaign.id) reset();
                        run(() => campaignApi.remove(campaign.id), "Campaign removed");
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Campaign Form Section */}
      <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {editing ? "Edit Campaign Draft" : "Design New Incentive Campaign"}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {editing
                ? "Modifying live versions creates a new draft version for preview before activation."
                : "Configure target metrics, tier rewards, and audience eligibility rules."}
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Reset Form
          </button>
        </div>

        <FormSection step={1} title="Basic Details" blurb="Campaign name and tracking code">
          <Row>
            <Field label="Campaign Name">
              <TextInput
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                placeholder="Monsoon Fleet Boost"
              />
            </Field>
            <Field label="Internal Tracking Code" hint="Uppercase identifier">
              <TextInput
                value={draft.code}
                onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })}
                placeholder="MONSOON_2026"
                disabled={Boolean(editing)}
              />
            </Field>
            <Field label="Starts On">
              <TextInput
                type="datetime-local"
                value={draft.starts_at}
                onChange={(v) => setDraft({ ...draft, starts_at: v })}
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection
          step={2}
          title="Measurement & Eligibility"
          blurb="Select target metric, reset period, and audience conditions"
        >
          <Row>
            <Field label="Measure Metric">
              <Choice
                value={draft.metric}
                options={vocab?.metrics ?? []}
                onChange={(v) => setDraft({ ...draft, metric: v })}
              />
            </Field>
            <Field label="Period Reset Cycle">
              <Choice
                value={draft.period_type}
                options={vocab?.period_types ?? []}
                onChange={(v) => setDraft({ ...draft, period_type: v })}
              />
            </Field>
            {draft.period_type === "rolling_days" && (
              <Field label="Window Days">
                <TextInput
                  type="number"
                  value={String(draft.period_length ?? 30)}
                  onChange={(v) => setDraft({ ...draft, period_length: Number(v) })}
                />
              </Field>
            )}
          </Row>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Audience Eligibility Rules
              </span>
              <ConditionBuilder
                fields={vocab?.audience_fields ?? []}
                rows={audience}
                onChange={setAudience}
                emptyLabel="Applies to all active partners."
              />
            </div>
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Job Qualification Criteria
              </span>
              <ConditionBuilder
                fields={vocab?.metric_filter_fields ?? []}
                rows={metricFilter}
                onChange={setMetricFilter}
                emptyLabel="All completed bookings count."
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          step={3}
          title="Reward Tiers"
          blurb="Configure milestone thresholds and payout rewards"
        >
          <div className="space-y-4">
            {draft.tiers.map((tier, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Tier Level {index + 1}
                  </p>
                  {draft.tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tiers: draft.tiers.filter((_, i) => i !== index),
                        })
                      }
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove Tier
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label={`Threshold (${humanise(draft.metric)})`}>
                    <TextInput
                      value={tier.threshold_from}
                      onChange={(v) => patchTier(index, { threshold_from: v })}
                      placeholder="10"
                    />
                  </Field>
                  <Field label="Reward Type">
                    <Choice
                      value={tier.reward_type}
                      options={rewardTypes}
                      onChange={(v) => patchTier(index, { reward_type: v })}
                    />
                  </Field>
                  <Field
                    label={isPercentReward(tier.reward_type) ? "Reward Value (%)" : "Reward Amount (₹)"}
                  >
                    <TextInput
                      value={tier.reward_value}
                      onChange={(v) => patchTier(index, { reward_value: v })}
                      disabled={tier.reward_type === "commission_waiver"}
                    />
                  </Field>
                  <Field label="Application Target">
                    <Choice
                      value={tier.applies_to}
                      options={vocab?.applies_to ?? []}
                      onChange={(v) => patchTier(index, { applies_to: v })}
                    />
                  </Field>
                </div>

                <p className="rounded-xl border-l-4 border-amber-500 bg-white p-3 text-xs font-semibold text-slate-900 border border-slate-200/80">
                  {describeTier(tier, draft.metric)}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDraft({ ...draft, tiers: [...draft.tiers, blankTier()] })}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            + Add Another Reward Tier
          </button>
        </FormSection>

        <FormSection
          step={4}
          title="Review & Simulation"
          blurb="Simulate cost impact against recent historical settlement data"
        >
          <Preview>
            {draft.tiers.length === 1
              ? describeTier(draft.tiers[0], draft.metric)
              : `${draft.tiers.length} Tiers, ${humanise(
                  draft.period_type
                ).toLowerCase()}. Rewards paid ${humanise(
                  draft.payout_mode ?? "with_settlement"
                ).toLowerCase()}.`}
          </Preview>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  setSimulation(await campaignApi.simulate(payload()));
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
                    editing
                      ? campaignApi.updateVersion(
                          editing.campaignId,
                          editing.versionId,
                          payload()
                        )
                      : campaignApi.createDraft(payload()),
                  editing ? "Campaign updated successfully" : "Draft campaign saved"
                )
              }
              className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all"
            >
              {editing ? "Save Version Changes" : "Save as Draft Campaign"}
            </button>
          </div>

          {simulation && <CampaignSimulationPanel result={simulation} />}
        </FormSection>
      </section>
    </div>
  );
}

function CampaignSimulationPanel({ result }: { result: CampaignSimulation }) {
  if (result.sample_size === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs font-semibold text-amber-900">
        No completed bookings available to simulate historical impact.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
        Simulation Results across last {result.sample_size} bookings
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total Rewards Issued" value={String(result.awards_granted)} />
        <Stat label="Partners Rewarded" value={String(result.payees_reached)} />
        <Stat label="Total Cost Impact" value={`₹${result.total_bonus}`} tone="text-amber-600" />
        <Stat label="Avg Bonus / Award" value={`₹${result.average_per_award}`} />
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
