"use client";

import { Checkbox, RadioButton, RadioButtonGroup, Select, SelectItem, Slider, TextArea, TextInput } from "@carbon/react";
import type { Field } from "../../../lib/cpi-sections";

/** Renders one CPI question — dispatches on Field.kind. */
export function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const idBase = `cpi-${field.id}`;

  switch (field.kind) {
    case "text":
      return (
        <TextInput
          id={idBase}
          labelText={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "textarea":
      return (
        <TextArea
          id={idBase}
          labelText={field.label}
          rows={2}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "rating":
      return (
        <RadioButtonGroup
          name={idBase}
          legendText={field.label}
          orientation="horizontal"
          valueSelected={typeof value === "number" ? String(value) : undefined}
          onChange={(selection) => onChange(Number(selection))}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <RadioButton key={n} id={`${idBase}-${n}`} labelText={String(n)} value={String(n)} />
          ))}
        </RadioButtonGroup>
      );

    case "scale":
      return (
        <Slider
          id={idBase}
          labelText={field.label}
          min={field.min ?? 1}
          max={field.max ?? 10}
          step={1}
          value={typeof value === "number" ? value : Math.ceil(((field.min ?? 1) + (field.max ?? 10)) / 2)}
          onChange={({ value: v }) => onChange(v)}
        />
      );

    case "single":
      return (
        <RadioButtonGroup
          name={idBase}
          legendText={field.label}
          orientation={field.options.some((o) => o.length > 24) ? "vertical" : "horizontal"}
          valueSelected={typeof value === "string" ? value : undefined}
          onChange={(selection) => onChange(String(selection))}
        >
          {field.options.map((o) => (
            <RadioButton key={o} id={`${idBase}-${o}`} labelText={o} value={o} />
          ))}
        </RadioButtonGroup>
      );

    case "multi": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const limit = field.max;
      return (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="cds--label" style={{ marginBottom: "0.5rem" }}>
            {field.label}
            {limit ? ` (${selected.length}/${limit})` : ""}
          </legend>
          {field.options.map((o) => {
            const checked = selected.includes(o);
            return (
              <Checkbox
                key={o}
                id={`${idBase}-${o}`}
                labelText={o}
                checked={checked}
                disabled={!checked && !!limit && selected.length >= limit}
                onChange={(_e, { checked: isChecked }) =>
                  onChange(isChecked ? [...selected, o] : selected.filter((x) => x !== o))
                }
              />
            );
          })}
        </fieldset>
      );
    }

    case "rank": {
      const ranks = (value ?? {}) as Record<string, number>;
      return (
        <div>
          <p className="cds--label" style={{ marginBottom: "0.5rem" }}>
            {field.label}
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {field.items.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <span className="cds--type-body-01">{item}</span>
                <Select
                  id={`${idBase}-${item}`}
                  labelText=""
                  hideLabel
                  size="sm"
                  value={ranks[item] != null ? String(ranks[item]) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next = { ...ranks };
                    if (v === "") delete next[item];
                    else next[item] = Number(v);
                    onChange(next);
                  }}
                >
                  <SelectItem value="" text="—" />
                  {field.items.map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} text={String(i + 1)} />
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
}
