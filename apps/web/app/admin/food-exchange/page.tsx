"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { foodExchangeItemCreateSchema, exchangeGroupSchema, type ExchangeGroup } from "@repo/types";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { Field } from "../../../components/ui/input";
import { SelectField } from "../../../components/ui/select";
import { Modal } from "../../../components/ui/modal";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";

interface FoodItem {
  id: string;
  foodName: string;
  exchangeGroup: ExchangeGroup;
  portionSize: string;
  calories: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
}

const exchangeGroups = exchangeGroupSchema.options;

const emptyForm = {
  foodName: "",
  exchangeGroup: "STARCHES" as ExchangeGroup,
  portionSize: "",
  calories: "",
  carbsG: "",
  proteinG: "",
  fatG: "",
};

function ItemFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: FoodItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState(
    initial
      ? {
          foodName: initial.foodName,
          exchangeGroup: initial.exchangeGroup,
          portionSize: initial.portionSize,
          calories: initial.calories?.toString() ?? "",
          carbsG: initial.carbsG?.toString() ?? "",
          proteinG: initial.proteinG?.toString() ?? "",
          fatG: initial.fatG?.toString() ?? "",
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      foodName: form.foodName,
      exchangeGroup: form.exchangeGroup,
      portionSize: form.portionSize,
      calories: form.calories ? Number(form.calories) : undefined,
      carbsG: form.carbsG ? Number(form.carbsG) : undefined,
      proteinG: form.proteinG ? Number(form.proteinG) : undefined,
      fatG: form.fatG ? Number(form.fatG) : undefined,
    };

    const parsed = foodExchangeItemCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      if (initial) {
        await apiFetch(`/admin/food-exchange-items/${initial.id}`, { method: "PATCH", token, body: parsed.data });
      } else {
        await apiFetch("/admin/food-exchange-items", { method: "POST", token, body: parsed.data });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={initial ? "Edit food item" : "Add food item"} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field label="Food name" name="foodName" value={form.foodName} onChange={update("foodName")} required />
        <SelectField label="Exchange group" name="exchangeGroup" value={form.exchangeGroup} onChange={update("exchangeGroup")}>
          {exchangeGroups.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </option>
          ))}
        </SelectField>
        <Field
          label="Portion size"
          name="portionSize"
          placeholder="e.g. 1/2 cup cooked"
          value={form.portionSize}
          onChange={update("portionSize")}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Calories" type="number" name="calories" value={form.calories} onChange={update("calories")} />
          <Field label="Carbs (g)" type="number" name="carbsG" value={form.carbsG} onChange={update("carbsG")} />
          <Field label="Protein (g)" type="number" name="proteinG" value={form.proteinG} onChange={update("proteinG")} />
          <Field label="Fat (g)" type="number" name="fatG" value={form.fatG} onChange={update("fatG")} />
        </div>
        <Button type="submit" loading={submitting}>
          {initial ? "Save changes" : "Add item"}
        </Button>
      </form>
    </Modal>
  );
}

function FoodExchangePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[] | null>(null);
  const [groupFilter, setGroupFilter] = useState<ExchangeGroup | "">("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = groupFilter ? `?exchangeGroup=${groupFilter}` : "";
      const data = await apiFetch<FoodItem[]>(`/admin/food-exchange-items${query}`, { token });
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load food exchange items.");
    }
  }, [token, groupFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this food exchange item?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/admin/food-exchange-items/${id}`, { method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminShell title="Nigerian Food Exchange List">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Food Exchange List</h2>
          <p className="mt-1 text-sm text-body">Reference data used to build culturally appropriate meal plans.</p>
        </div>
        <div className="flex gap-3">
          <SelectField
            label="Filter by group"
            name="groupFilter"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value as ExchangeGroup | "")}
          >
            <option value="">All groups</option>
            {exchangeGroups.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
          <Button onClick={() => setAdding(true)} className="self-end">
            Add item
          </Button>
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      <Card className="mt-6 p-0">
        {items === null ? (
          <p className="p-6 text-sm text-body">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-body">No food exchange items yet.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Food</Th>
                <Th>Group</Th>
                <Th>Portion</Th>
                <Th>Calories</Th>
                <Th>Carbs (g)</Th>
                <Th>Protein (g)</Th>
                <Th>Fat (g)</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>{item.foodName}</Td>
                  <Td>
                    <Badge tone="info">{item.exchangeGroup}</Badge>
                  </Td>
                  <Td>{item.portionSize}</Td>
                  <Td>{item.calories ?? "—"}</Td>
                  <Td>{item.carbsG ?? "—"}</Td>
                  <Td>{item.proteinG ?? "—"}</Td>
                  <Td>{item.fatG ?? "—"}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setEditing(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-1.5 text-xs"
                        disabled={deletingId === item.id}
                        onClick={() => onDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      {adding ? <ItemFormModal initial={null} onClose={() => setAdding(false)} onSaved={load} /> : null}
      {editing ? <ItemFormModal initial={editing} onClose={() => setEditing(null)} onSaved={load} /> : null}
    </AdminShell>
  );
}

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <FoodExchangePage />
    </RequireRole>
  );
}
