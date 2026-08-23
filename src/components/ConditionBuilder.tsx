"use client";

import type { ConditionLeaf, ConditionNode, RuleField } from "@/lib/types";

export interface ConditionRow {
  field: string;
  op: string;
  value: string;
}

const LIST_OPS = new Set(["in", "not_in"]);
const NO_VALUE_OPS = new Set(["is_null", "is_not_null"]);

export function toRows(node: ConditionNode | undefined): ConditionRow[] {
  if (!node || Object.keys(node).length === 0) return [];
  const leaves: ConditionLeaf[] = [];

  const walk = (current: unknown) => {
    if (!current || typeof current !== "object") return;
    const obj = current as Record<string, unknown>;
    if (Array.isArray(obj.all)) {
      (obj.all as unknown[]).forEach(walk);
      return;
    }
    if (Array.isArray(obj.any)) {
      (obj.any as unknown[]).forEach(walk);
      return;
    }
    if (typeof obj.field === "string") leaves.push(obj as unknown as ConditionLeaf);
  };
  walk(node);

  return leaves.map((leaf) => ({
    field: leaf.field,
    op: leaf.op ?? "eq",
    value: Array.isArray(leaf.value)
      ? (leaf.value as unknown[]).join(", ")
      : leaf.value === undefined || leaf.value === null
        ? ""
        : String(leaf.value),
  }));
}

export function toConditionNode(rows: ConditionRow[]): ConditionNode {
  const usable = rows.filter((row) => row.field);
  if (usable.length === 0) return {};

  const leaves: ConditionLeaf[] = usable.map((row) => {
    if (NO_VALUE_OPS.has(row.op)) return { field: row.field, op: row.op };
    if (LIST_OPS.has(row.op) || row.op === "between") {
      const parts = row.value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (part !== "" && !Number.isNaN(Number(part)) ? Number(part) : part));
      return { field: row.field, op: row.op, value: parts };
    }
    const numeric = row.value !== "" && !Number.isNaN(Number(row.value));
    return { field: row.field, op: row.op, value: numeric ? Number(row.value) : row.value };
  });

  return leaves.length === 1 ? leaves[0] : { all: leaves };
}

function valueHint(op: string): string {
  if (op === "between") return "min, max";
  if (LIST_OPS.has(op)) return "comma, separated, values";
  return "value";
}

export default function ConditionBuilder({
  fields,
  rows,
  onChange,
  emptyLabel = "Applies to every settlement.",
}: {
  fields: RuleField[];
  rows: ConditionRow[];
  onChange: (rows: ConditionRow[]) => void;
  emptyLabel?: string;
}) {
  const update = (index: number, patch: Partial<ConditionRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const fieldFor = (key: string) => fields.find((item) => item.field_key === key);

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-gray-500">{emptyLabel}</p>
      )}

      {rows.map((row, index) => {
        const meta = fieldFor(row.field);
        const operators = meta?.operators ?? ["eq"];
        return (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              value={row.field}
              onChange={(e) => {
                const next = fieldFor(e.target.value);
                update(index, {
                  field: e.target.value,
                  op: next?.operators?.[0] ?? "eq",
                });
              }}
              className="min-w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Choose a field…</option>
              {fields.map((item) => (
                <option key={item.field_key} value={item.field_key}>
                  {item.group_label ? `${item.group_label} · ` : ""}
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={row.op}
              onChange={(e) => update(index, { op: e.target.value })}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {!NO_VALUE_OPS.has(row.op) && (
              <input
                value={row.value}
                onChange={(e) => update(index, { value: e.target.value })}
                placeholder={valueHint(row.op)}
                className="min-w-52 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            )}

            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Remove
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...rows, { field: "", op: "eq", value: "" }])}
        className="rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        + Add condition
      </button>

      {rows.length > 1 && (
        <p className="text-xs text-gray-500">All conditions must match (AND).</p>
      )}
    </div>
  );
}
