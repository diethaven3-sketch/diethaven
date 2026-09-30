"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { foodExchangeItemCreateSchema, exchangeGroupSchema, validateWithSchema, type ExchangeGroup } from "@repo/types";
import { Plus, Utensils, Edit2, Trash2, SearchX } from "lucide-react";
import { apiFetch, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { RequireRole } from "../../../components/require-role";
import { AdminShell } from "../../../components/admin-shell";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Banner } from "../../../components/ui/banner";
import { Card } from "../../../components/ui/card";
import { Field } from "../../../components/ui/input";
import { CustomSelect } from "../../../components/ui/custom-select";
import { SearchInput } from "../../../components/ui/search-input";
import { EmptyState } from "../../../components/ui/empty-state";
import { TableSkeleton } from "../../../components/ui/skeleton";
import { Modal } from "../../../components/ui/modal";
import { Table, Thead, Tbody, Th, Td } from "../../../components/ui/table";
import { Pagination } from "../../../components/ui/pagination";
import { usePagination } from "../../../lib/use-pagination";

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

const groupOptions = [
  { value: "ALL", label: "All Groups" },
  ...exchangeGroups.map((g) => ({
    value: g,
    label: g.charAt(0) + g.slice(1).toLowerCase(),
  })),
];

const modalGroupOptions = exchangeGroups.map((g) => ({
  value: g,
  label: g.charAt(0) + g.slice(1).toLowerCase(),
}));

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    clearFieldError(key);
  };

  const onGroupChange = (val: string) => {
    setForm((f) => ({ ...f, exchangeGroup: val as ExchangeGroup }));
    clearFieldError("exchangeGroup");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      foodName: form.foodName.trim(),
      exchangeGroup: form.exchangeGroup,
      portionSize: form.portionSize.trim(),
      calories: form.calories.trim() ? Number(form.calories) : undefined,
      carbsG: form.carbsG.trim() ? Number(form.carbsG) : undefined,
      proteinG: form.proteinG.trim() ? Number(form.proteinG) : undefined,
      fatG: form.fatG.trim() ? Number(form.fatG) : undefined,
    };

    const validation = validateWithSchema(foodExchangeItemCreateSchema, payload);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      if (initial) {
        await apiFetch(`/admin/food-exchange-items/${initial.id}`, { method: "PATCH", token, body: validation.data });
      } else {
        await apiFetch("/admin/food-exchange-items", { method: "POST", token, body: validation.data });
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (Object.keys(err.fieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else {
        setError("Failed to save item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initial ? "Edit Food Exchange Item" : "Add Food Exchange Item"}
      description="Add or update Nigerian food item with portion and macro benchmarks."
      onClose={onClose}
    >
      <form className="flex flex-col gap-4 mt-2" onSubmit={onSubmit} noValidate>
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field
          label="Food name"
          name="foodName"
          placeholder="e.g. Jollof Rice, Pounded Yam, Moin-moin"
          value={form.foodName}
          onChange={update("foodName")}
          error={fieldErrors.foodName}
          required
        />
        <CustomSelect
          label="Exchange group"
          value={form.exchangeGroup}
          onValueChange={onGroupChange}
          options={modalGroupOptions}
        />
        <Field
          label="Portion size"
          name="portionSize"
          placeholder="e.g. 1 medium wrap (150g), 1/2 cup cooked"
          value={form.portionSize}
          onChange={update("portionSize")}
          error={fieldErrors.portionSize}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Calories (kcal)"
            type="number"
            name="calories"
            placeholder="e.g. 120"
            value={form.calories}
            onChange={update("calories")}
            error={fieldErrors.calories}
          />
          <Field
            label="Carbs (g)"
            type="number"
            name="carbsG"
            placeholder="e.g. 25"
            value={form.carbsG}
            onChange={update("carbsG")}
            error={fieldErrors.carbsG}
          />
          <Field
            label="Protein (g)"
            type="number"
            name="proteinG"
            placeholder="e.g. 3"
            value={form.proteinG}
            onChange={update("proteinG")}
            error={fieldErrors.proteinG}
          />
          <Field
            label="Fat (g)"
            type="number"
            name="fatG"
            placeholder="e.g. 1"
            value={form.fatG}
            onChange={update("fatG")}
            error={fieldErrors.fatG}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            {initial ? "Save changes" : "Add item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FoodExchangePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[] | null>(null);
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = groupFilter !== "ALL" ? `?exchangeGroup=${groupFilter}` : "";
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
    if (!confirm("Are you sure you want to delete this food exchange item?")) return;
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

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.foodName.toLowerCase().includes(q) ||
        item.portionSize.toLowerCase().includes(q) ||
        item.exchangeGroup.toLowerCase().includes(q),
    );
  }, [items, search]);
  const pager = usePagination(filtered ?? [], 15, `${search}|${groupFilter}`);

  return (
    <AdminShell title="Nigerian Food Exchange List">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Food Exchange List
          </h2>
          <p className="mt-1 text-sm text-body/75">
            Reference database used by dietitians to compose culturally appropriate Nigerian meal plans.
          </p>
        </div>

        <Button onClick={() => setAdding(true)} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Plus size={16} />
          <span>Add food item</span>
        </Button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by food name or portion..."
          />
        </div>
        <div className="w-full sm:w-48">
          <CustomSelect
            value={groupFilter}
            onValueChange={setGroupFilter}
            options={groupOptions}
          />
        </div>
      </div>

      {error ? (
        <Banner tone="danger" className="mt-4">
          {error}
        </Banner>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-body/70">
        {filtered !== null && (
          <p>
            Showing <span className="font-semibold text-heading">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "food item" : "food items"}
            {(search || groupFilter !== "ALL") && " (filtered)"}
          </p>
        )}
      </div>

      <Card className="mt-2 p-0 overflow-hidden shadow-xs border-gray-200">
        {filtered === null ? (
          <TableSkeleton columns={8} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search || groupFilter !== "ALL" ? SearchX : Utensils}
            title={search || groupFilter !== "ALL" ? "No food items match" : "No food exchange items yet"}
            description={
              search || groupFilter !== "ALL"
                ? "Try searching for a different food keyword or adjusting your group filter."
                : "Create your first reference food item to get started."
            }
            action={
              search || groupFilter !== "ALL" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setGroupFilter("ALL");
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setAdding(true)} className="text-xs">
                  Add food item
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Food</Th>
                <Th>Group</Th>
                <Th>Portion Size</Th>
                <Th>Calories</Th>
                <Th>Carbs</Th>
                <Th>Protein</Th>
                <Th>Fat</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {pager.pageItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                  <Td className="font-semibold text-heading">{item.foodName}</Td>
                  <Td>
                    <Badge tone="info">{item.exchangeGroup}</Badge>
                  </Td>
                  <Td className="text-body/80">{item.portionSize}</Td>
                  <Td>{item.calories != null ? `${item.calories} kcal` : "—"}</Td>
                  <Td>{item.carbsG != null ? `${item.carbsG}g` : "—"}</Td>
                  <Td>{item.proteinG != null ? `${item.proteinG}g` : "—"}</Td>
                  <Td>{item.fatG != null ? `${item.fatG}g` : "—"}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-xs flex items-center gap-1"
                        onClick={() => setEditing(item)}
                      >
                        <Edit2 size={12} />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2.5 py-1 text-xs flex items-center gap-1"
                        disabled={deletingId === item.id}
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 size={12} />
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
        {filtered && filtered.length > 0 ? (
          <Pagination {...pager} onPageChange={pager.setPage} noun="foods" className="border-t border-gray-200 px-5 py-3" />
        ) : null}
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
