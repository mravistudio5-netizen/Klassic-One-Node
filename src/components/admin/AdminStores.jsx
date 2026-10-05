import React, { useEffect, useState } from "react";
import { apiFetch } from "@/api";
import {
  Plus,
  Loader2,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_LOCATIONS = [
  "Basement",
  "Ground Floor",
  "Floor 1",
  "Floor 2",
  "Floor 3",
  "4th Floor Warehouse",
  "Washroom",
  "Terrace",
];

const EMPTY_FORM = {
  name: "",
  code: "",
  city: "",
  address: "",
  opening_time: "10:00",
};

const getId = (item) =>
  item?._id || item?.id;

export default function AdminStores({
  stores: initialStores,
}) {
  const [stores, setStores] = useState(
    initialStores || []
  );

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [busy, setBusy] =
    useState(null);

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // -----------------------------
  // LOAD STORES
  // -----------------------------
  const loadStores = async () => {
    setLoading(true);

    try {
      const response =
        await apiFetch("/api/stores");

      const list =
        response?.items ||
        response?.stores ||
        response?.data ||
        [];

      setStores(
        Array.isArray(list)
          ? list
          : []
      );
    } catch (error) {
      console.error(
        "Load stores failed:",
        error
      );

      toast.error(
        "Could not load stores: " +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  // -----------------------------
  // CREATE STORE
  // -----------------------------
  const create = async () => {
    if (!form.name.trim()) {
      toast.error(
        "Store name required"
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await apiFetch(
          "/api/stores",
          {
            method: "POST",
            body: JSON.stringify({
              name: form.name.trim(),
              code: form.code.trim(),
              city: form.city.trim(),
              address:
                form.address.trim(),
              opening_time:
                form.opening_time ||
                "10:00",
              locations:
                DEFAULT_LOCATIONS,
              active: true,
            }),
          }
        );

      const created =
        response?.item ||
        response?.store ||
        response?.data;

      toast.success(
        "Store created successfully"
      );

      await loadStores();

      setForm(EMPTY_FORM);
      setShowForm(false);

      console.log(
        "Created store:",
        created
      );
    } catch (error) {
      console.error(
        "Create store failed:",
        error
      );

      toast.error(
        "Create failed: " +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------
  // ACTIVE / INACTIVE
  // -----------------------------
  const toggleActive = async (
    store
  ) => {
    const storeId =
      getId(store);

    if (!storeId) {
      toast.error(
        "Store ID missing"
      );
      return;
    }

    setBusy(storeId);

    try {
      await apiFetch(
        `/api/stores/${storeId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active:
              !store.active,
          }),
        }
      );

      toast.success(
        store.active
          ? "Store deactivated"
          : "Store activated"
      );

      await loadStores();
    } catch (error) {
      console.error(
        "Update store failed:",
        error
      );

      toast.error(
        "Update failed: " +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setBusy(null);
    }
  };

  // -----------------------------
  // DELETE STORE
  // -----------------------------
  const removeStore = async (
    store
  ) => {
    const storeId =
      getId(store);

    if (!storeId) {
      toast.error(
        "Store ID missing"
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete store "${store.name}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setBusy(storeId);

    try {
      await apiFetch(
        `/api/stores/${storeId}`,
        {
          method: "DELETE",
        }
      );

      setStores((current) =>
        current.filter(
          (item) =>
            getId(item) !==
            storeId
        )
      );

      toast.success(
        "Store deleted successfully"
      );
    } catch (error) {
      console.error(
        "Delete store failed:",
        error
      );

      toast.error(
        "Delete failed: " +
          (error?.message ||
            "Unknown error")
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* ADD STORE BUTTON */}
      <button
        onClick={() =>
          setShowForm(
            (value) => !value
          )
        }
        className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl"
      >
        <Plus className="w-4 h-4" />

        Add Store
      </button>

      {/* STORE FORM */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">

          <input
            value={form.name}
            onChange={(e) =>
              set(
                "name",
                e.target.value
              )
            }
            placeholder="Store name"
            className="input"
          />

          <div className="grid grid-cols-2 gap-2">

            <input
              value={form.code}
              onChange={(e) =>
                set(
                  "code",
                  e.target.value
                )
              }
              placeholder="Code"
              className="input"
            />

            <input
              value={form.city}
              onChange={(e) =>
                set(
                  "city",
                  e.target.value
                )
              }
              placeholder="City"
              className="input"
            />

          </div>

          <input
            value={form.address}
            onChange={(e) =>
              set(
                "address",
                e.target.value
              )
            }
            placeholder="Address"
            className="input"
          />

          <div className="flex items-center gap-2">

            <label className="text-xs text-slate-500">
              Opening
            </label>

            <input
              type="time"
              value={
                form.opening_time
              }
              onChange={(e) =>
                set(
                  "opening_time",
                  e.target.value
                )
              }
              className="input flex-1"
            />

          </div>

          {/* SAVE */}
          <button
            onClick={create}
            disabled={saving}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}

            {saving
              ? "Saving..."
              : "Save Store"}
          </button>

        </div>
      )}

      {/* STORE LIST */}
      <div className="space-y-2">

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : stores.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">
            No stores yet.
          </p>
        ) : (
          stores.map((store) => {
            const storeId =
              getId(store);

            return (
              <div
                key={storeId}
                className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-3"
              >

                <div className="min-w-0 flex-1">

                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {store.name}
                  </p>

                  <p className="text-xs text-slate-500 truncate">
                    {store.code
                      ? `${store.code} · `
                      : ""}
                    {store.city ||
                      "No city"}{" "}
                    ·{" "}
                    {store.opening_time ||
                      "10:00"}
                  </p>

                </div>

                <div className="flex items-center gap-2 shrink-0">

                  {/* ACTIVE / INACTIVE */}
                  <button
                    onClick={() =>
                      toggleActive(
                        store
                      )
                    }
                    disabled={
                      busy ===
                      storeId
                    }
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
                      store.active
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >

                    {busy ===
                    storeId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}

                    {store.active
                      ? "Active"
                      : "Inactive"}

                  </button>

                  {/* DELETE */}
                  <button
                    type="button"
                    onClick={() =>
                      removeStore(
                        store
                      )
                    }
                    disabled={
                      busy ===
                      storeId
                    }
                    title="Delete store"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                  >
                    {busy ===
                    storeId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                </div>

              </div>
            );
          })
        )}

      </div>

    </div>
  );
}