"use client";

import { LAB_REFERENCES, type AssessmentDomain, type LabFlag, type LabMarker } from "@repo/types";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, Thead, Tbody, Th, Td } from "../ui/table";
import { fieldLabel as label, formatFieldValue as formatValue } from "./field-labels";

export interface AssessmentRow {
  id: string;
  date: string;
  domain: AssessmentDomain;
  domainData: Record<string, unknown>;
}

interface LabValue {
  marker: LabMarker;
  value: number;
  unit: string;
  referenceLow: number;
  referenceHigh: number;
  flag: LabFlag;
}

const flagTone = { LOW: "warning", NORMAL: "success", HIGH: "danger" } as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function NarrativeEntry({ entry }: { entry: AssessmentRow }) {
  const fields = Object.entries(entry.domainData);
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-body">Recorded {formatDate(entry.date)}</p>
      <dl className="mt-3 flex flex-col gap-3">
        {fields.map(([key, value]) =>
          key === "vitalSigns" && value && typeof value === "object" ? (
            <div key={key}>
              <dt className="text-sm font-medium text-heading">{label(key)}</dt>
              <dd className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-body">
                {Object.entries(value as Record<string, unknown>).map(([vKey, vValue]) => (
                  <span key={vKey}>
                    {label(vKey)}: {formatValue(vValue)}
                  </span>
                ))}
              </dd>
            </div>
          ) : (
            <div key={key}>
              <dt className="text-sm font-medium text-heading">{label(key)}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-body">{formatValue(value)}</dd>
            </div>
          ),
        )}
      </dl>
    </Card>
  );
}

function BiochemicalEntry({ entry }: { entry: AssessmentRow }) {
  const values = (entry.domainData.values as LabValue[] | undefined) ?? [];
  const testDate = entry.domainData.testDate as string | undefined;
  const notes = entry.domainData.notes as string | undefined;
  const abnormal = values.filter((v) => v.flag !== "NORMAL").length;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 p-5">
        <div>
          <p className="text-sm font-medium text-heading">
            Lab panel{testDate ? ` · tested ${formatDate(testDate)}` : ""}
          </p>
          <p className="text-xs text-body">Recorded {formatDate(entry.date)}</p>
        </div>
        {abnormal > 0 ? (
          <Badge tone="warning">
            {abnormal} outside reference {abnormal === 1 ? "range" : "ranges"}
          </Badge>
        ) : (
          <Badge tone="success">All within range</Badge>
        )}
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>Marker</Th>
            <Th>Result</Th>
            <Th>Reference</Th>
            <Th>Flag</Th>
          </tr>
        </Thead>
        <Tbody>
          {values.map((value) => (
            <tr key={value.marker}>
              <Td>{LAB_REFERENCES[value.marker]?.label ?? value.marker}</Td>
              <Td>
                {value.value} {value.unit}
              </Td>
              <Td>
                {value.referenceLow}–{value.referenceHigh} {value.unit}
              </Td>
              <Td>
                <Badge tone={flagTone[value.flag]}>{value.flag}</Badge>
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>

      {notes ? <p className="whitespace-pre-wrap border-t border-gray-200 p-5 text-sm text-body">{notes}</p> : null}
    </Card>
  );
}

function AnthropometricHistory({ entries }: { entries: AssessmentRow[] }) {
  return (
    <Card className="p-0">
      <Table>
        <Thead>
          <tr>
            <Th>Date</Th>
            <Th>Height (cm)</Th>
            <Th>Weight (kg)</Th>
            <Th>BMI</Th>
          </tr>
        </Thead>
        <Tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <Td>{formatDate(entry.date)}</Td>
              <Td>{formatValue(entry.domainData.height)}</Td>
              <Td>{formatValue(entry.domainData.weight)}</Td>
              <Td>{formatValue(entry.domainData.bmi)}</Td>
            </tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  );
}

export function DomainHistory({ domain, entries }: { domain: AssessmentDomain; entries: AssessmentRow[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-body">No entries recorded for this domain yet.</p>
      </Card>
    );
  }

  if (domain === "ANTHROPOMETRIC") {
    return <AnthropometricHistory entries={entries} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry) =>
        domain === "BIOCHEMICAL" ? (
          <BiochemicalEntry key={entry.id} entry={entry} />
        ) : (
          <NarrativeEntry key={entry.id} entry={entry} />
        ),
      )}
    </div>
  );
}
