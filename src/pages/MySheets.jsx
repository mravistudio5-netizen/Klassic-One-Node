import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  ExternalLink,
  Plus,
  Search,
  X,
  Trash2,
  Archive,
  Check,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { usePermissions } from "@/hooks/usePermissions";

const EMPTY_FORM = {
  name: "",
  link: "",
  purpose: "",
  category: "Other",
  sensitivity: "Low",
  notes: "",
  store_id: "",
  all_stores: true,
  department: "",
  user_ids: [],
  access_level: "View",
  expiry_date: "",
};

const categoryColors = {
  Stock: "bg-blue-50 text-blue-700 border-blue-200",
  Purchase: "bg-purple-50 text-purple-700 border-purple-200",
  Staff: "bg-amber-50 text-amber-700 border-amber-200",
  Accounts: "bg-green-50 text-green-700 border-green-200",
  Reports: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

const sensitivityColors = {
  Low: "bg-green-50 text-green-700",
  Medium: "bg-amber-50 text-amber-700",
  High: "bg-red-50 text-red-700",
};

function getId(item) {
  return item?.id || item?._id || "";
}

function getUserName(user) {
  return (
    user?.name ||
    user?.full_name ||
    user?.display_name ||
    user?.email ||
    "User"
  );
}

export default function MySheets() {
  const [me, setMe] = useState(null);
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const meResponse = await apiFetch("/api/auth/me");
      const user = meResponse?.user;

      setMe(user);

      const userId = getId(user);

      const response =
        user?.role === "owner" || user?.role === "admin"
          ? await apiFetch("/api/sheets/access?all=true")
          : await apiFetch(
              `/api/sheets/access?user_id=${encodeURIComponent(userId)}`
            );

      setAccess(response?.items || response?.access || []);
    } catch (error) {
      console.error("Sheets loading failed:", error);
      toast.error(error?.message || "Failed to load sheets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (
  me &&
  !["owner", "admin", "manager"].includes(me.role)
) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-10 text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" />

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            My Sheets
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You do not have permission to manage the Sheet Library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SheetLibrary
      access={access}
      refreshAccess={load}
    />
  );
}

function SheetLibrary({ access, refreshAccess }) {
  const { can } = usePermissions();

  const [sheets, setSheets] = useState([]);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [form, setForm] = useState(EMPTY_FORM);

  const canManage =
    can?.("sheets", "create") ??
    can?.("sheet_library", "create") ??
    true;

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [sheetResponse, userResponse, storeResponse] =
        await Promise.all([
          apiFetch("/api/sheets?archived=false"),
          apiFetch("/api/users?limit=200"),
          apiFetch("/api/stores?active=true&limit=100"),
        ]);

      setSheets(
        sheetResponse?.items ||
          sheetResponse?.sheets ||
          []
      );

      setUsers(
        userResponse?.items ||
          userResponse?.users ||
          []
      );

      setStores(
        storeResponse?.items ||
          storeResponse?.stores ||
          []
      );
    } catch (error) {
      console.error("Sheet Library loading failed:", error);

      toast.error(
        error?.message || "Failed to load Sheet Library"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleUser = (userId) => {
    setForm((prev) => {
      const selected = prev.user_ids.includes(userId);

      return {
        ...prev,
        user_ids: selected
          ? prev.user_ids.filter((id) => id !== userId)
          : [...prev.user_ids, userId],
      };
    });
  };

  const filteredSheets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sheets.filter((sheet) => {
      if (query) {
        const text = [
          sheet.name,
          sheet.purpose,
          sheet.category,
          sheet.sensitivity,
          sheet.store_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!text.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [sheets, search]);

  const filteredAccess = useMemo(() => {
    const query = search.trim().toLowerCase();

    return access.filter((item) => {
      if (
        filter === "favourite" &&
        !item.favourite
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const text = [
        item.sheet_name,
        item.name,
        item.purpose,
        item.category,
        item.user_name,
        item.user_email,
        item.store_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [access, filter, search]);

  // ============================
  // ADD SHEET
  // ============================

  const addSheet = async () => {
    const name = form.name.trim();
    const link = form.link.trim();

    if (!name) {
      toast.error("Sheet name required");
      return;
    }

    if (!link) {
      toast.error("Google Sheet URL required");
      return;
    }

    if (!link.includes("docs.google.com/spreadsheets")) {
      toast.error("Enter a valid Google Sheet URL");
      return;
    }

    if (!form.store_id && !form.all_stores) {
      toast.error("Select store");
      return;
    }

    if (
      !Array.isArray(form.user_ids) ||
      form.user_ids.length === 0
    ) {
      toast.error("Select at least one user");
      return;
    }

    try {
      setSaving(true);

      const departmentName = form.department || "";

      const response = await apiFetch("/api/sheets", {
        method: "POST",

        body: JSON.stringify({
          name,
          link,
          purpose: form.purpose.trim(),

          category: form.category,

          sensitivity: form.sensitivity,

          notes: form.notes.trim(),

          store_id: form.all_stores
            ? ""
            : form.store_id,

          all_stores: !!form.all_stores,

          department_id: "",

          department_name: departmentName,

          user_ids: form.user_ids,

          assigned_user_ids: form.user_ids,

          access_level: form.access_level,

          expiry_date:
            form.expiry_date || null,
        }),
      });

      if (
        !response ||
        response.success !== true
      ) {
        throw new Error(
          response?.message ||
            "Sheet was not created"
        );
      }

      const sheetId =
        response?.item?.id ||
        response?.item?._id ||
        response?.sheet?.id ||
        response?.sheet?._id;

      if (!sheetId) {
        throw new Error(
          "Sheet created but ID was not returned"
        );
      }

      toast.success(
        `Sheet added and assigned to ${
          form.user_ids.length
        } user${
          form.user_ids.length > 1
            ? "s"
            : ""
        }`
      );

      setForm({
        ...EMPTY_FORM,
      });

      setShowForm(false);

      await load();

      await refreshAccess();
    } catch (error) {
      console.error(
        "Add sheet failed:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to add sheet"
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveSheet = async (sheet) => {
    const id = getId(sheet);

    if (!id) {
      return;
    }

    try {
      await apiFetch(
        `/api/sheets/${id}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            archived: true,
          }),
        }
      );

      toast.success("Sheet archived");

      await load();

      await refreshAccess();
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to archive sheet"
      );
    }
  };

  const deleteSheet = async (sheet) => {
    const id = getId(sheet);

    if (!id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${sheet.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiFetch(
        `/api/sheets/${id}`,
        {
          method: "DELETE",
        }
      );

      toast.success("Sheet deleted");

      await load();

      await refreshAccess();
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to delete sheet"
      );
    }
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);

    setForm({
      ...EMPTY_FORM,
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />

            <h1 className="text-2xl font-bold text-slate-900">
              Sheet Library
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Manage Google Sheets and assign access to users.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              setShowForm(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />

            Add Sheet
          </button>
        )}
      </div>

      {/* SEARCH */}

      <div className="flex flex-col gap-3 md:flex-row">

        <div className="relative flex-1">

          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search sheets..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-white p-1">

          <button
            type="button"
            onClick={() =>
              setFilter("all")
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("favourite")
            }
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === "favourite"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Favourite
          </button>

        </div>
      </div>

      {/* ASSIGNED SHEETS */}

      {filteredAccess.length > 0 && (
        <section>

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-sm font-semibold text-slate-700">
              Assigned Sheets
            </h2>

            <span className="text-xs text-slate-400">
              {filteredAccess.length} sheet
              {filteredAccess.length !== 1
                ? "s"
                : ""}
            </span>

          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredAccess.map((item) => (
              <AssignedSheetCard
                key={getId(item)}
                item={item}
                onRefresh={refreshAccess}
              />
            ))}

          </div>

        </section>
      )}

      {/* SHEET LIBRARY */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <h2 className="text-sm font-semibold text-slate-700">
            Sheet Library
          </h2>

          <span className="text-xs text-slate-400">
            {filteredSheets.length} sheet
            {filteredSheets.length !== 1
              ? "s"
              : ""}
          </span>

        </div>

        {filteredSheets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 font-medium text-slate-700">
              No sheets added yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add your first Google Sheet using the button above.
            </p>

          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredSheets.map((sheet) => (
              <SheetCard
                key={getId(sheet)}
                sheet={sheet}
                onArchive={
                  archiveSheet
                }
                onDelete={
                  deleteSheet
                }
              />
            ))}

          </div>
        )}
      </section>

      {/* ADD SHEET MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add Google Sheet
                </h2>

                <p className="text-xs text-slate-500">
                  Add the sheet and assign users.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* NAME + URL */}

              <div className="grid gap-4 md:grid-cols-2">

                <Field label="Sheet Name *">

                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateForm(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Daily Sales Report"
                    className="input"
                  />

                </Field>

                <Field label="Google Sheet URL *">

                  <input
                    value={form.link}
                    onChange={(e) =>
                      updateForm(
                        "link",
                        e.target.value
                      )
                    }
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className="input"
                  />

                </Field>

              </div>

              {/* PURPOSE */}

              <Field label="Purpose">

                <input
                  value={form.purpose}
                  onChange={(e) =>
                    updateForm(
                      "purpose",
                      e.target.value
                    )
                  }
                  placeholder="What is this sheet used for?"
                  className="input"
                />

              </Field>

              {/* CATEGORY / SENSITIVITY / ACCESS */}

              <div className="grid gap-4 md:grid-cols-3">

                <Field label="Category">

                  <select
                    value={form.category}
                    onChange={(e) =>
                      updateForm(
                        "category",
                        e.target.value
                      )
                    }
                    className="input"
                  >

                    <option value="Stock">
                      Stock
                    </option>

                    <option value="Purchase">
                      Purchase
                    </option>

                    <option value="Staff">
                      Staff
                    </option>

                    <option value="Accounts">
                      Accounts
                    </option>

                    <option value="Reports">
                      Reports
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </Field>

                <Field label="Sensitivity">

                  <select
                    value={
                      form.sensitivity
                    }
                    onChange={(e) =>
                      updateForm(
                        "sensitivity",
                        e.target.value
                      )
                    }
                    className="input"
                  >

                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>

                  </select>

                </Field>

                <Field label="Access Level">

                  <select
                    value={
                      form.access_level
                    }
                    onChange={(e) =>
                      updateForm(
                        "access_level",
                        e.target.value
                      )
                    }
                    className="input"
                  >

                    <option value="View">
                      View
                    </option>

                    <option value="Comment">
                      Comment
                    </option>

                    <option value="Edit">
                      Edit
                    </option>

                  </select>

                </Field>

              </div>

              {/* NOTES */}

              <Field label="Notes">

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateForm(
                      "notes",
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Optional notes"
                  className="input resize-none"
                />

              </Field>

              {/* STORE */}

              <div className="rounded-xl border border-slate-200 p-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-medium text-slate-800">
                      Store Access
                    </p>

                    <p className="text-xs text-slate-500">
                      Select whether this sheet applies to all stores.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">

                    <input
                      type="checkbox"
                      checked={
                        form.all_stores
                      }
                      onChange={(e) =>
                        updateForm(
                          "all_stores",
                          e.target.checked
                        )
                      }
                    />

                    All Stores

                  </label>

                </div>

                {!form.all_stores && (
                  <select
                    value={form.store_id}
                    onChange={(e) =>
                      updateForm(
                        "store_id",
                        e.target.value
                      )
                    }
                    className="input mt-3"
                  >

                    <option value="">
                      Select store
                    </option>

                    {stores.map((store) => (
                      <option
                        key={getId(store)}
                        value={getId(store)}
                      >
                        {store.name}
                      </option>
                    ))}

                  </select>
                )}

              </div>

              {/* DEPARTMENT */}

              <Field label="Department">

                <input
                  value={form.department}
                  onChange={(e) =>
                    updateForm(
                      "department",
                      e.target.value
                    )
                  }
                  placeholder="Optional department"
                  className="input"
                />

              </Field>

              {/* USERS */}

              <div>

                <div className="mb-2">

                  <p className="font-medium text-slate-800">
                    Assign Users *
                  </p>

                  <p className="text-xs text-slate-500">
                    Select at least one user.
                  </p>

                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">

                  {users.length === 0 ? (
                    <div className="p-5 text-center text-sm text-slate-500">
                      No users found.
                    </div>
                  ) : (
                    users.map((user) => {

                      const id = getId(user);

                      const selected =
                        form.user_ids.includes(
                          id
                        );

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            toggleUser(id)
                          }
                          className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 ${
                            selected
                              ? "bg-emerald-50"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">

                            <span className="block truncate text-sm font-medium text-slate-800">
                              {getUserName(
                                user
                              )}
                            </span>

                            {user.email && (
                              <span className="block truncate text-xs text-slate-500">
                                {user.email}
                              </span>
                            )}

                          </span>

                        </button>
                      );
                    })
                  )}

                </div>

                {form.user_ids.length > 0 && (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    {form.user_ids.length} user
                    {form.user_ids.length > 1
                      ? "s"
                      : ""}{" "}
                    selected
                  </p>
                )}

              </div>

              {/* EXPIRY */}

              <Field label="Expiry Date">

                <input
                  type="date"
                  value={
                    form.expiry_date
                  }
                  onChange={(e) =>
                    updateForm(
                      "expiry_date",
                      e.target.value
                    )
                  }
                  className="input"
                />

              </Field>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 border-t pt-4">

                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={addSheet}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save Sheet"}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(148 163 184);
          box-shadow: 0 0 0 2px rgb(226 232 240);
        }
      `}</style>

    </div>
  );
}

function AssignedSheetCard({
  item,
  onRefresh,
}) {
  const [busy, setBusy] = useState(false);

  const id = getId(item);

  const toggleFavourite = async () => {
    if (!id) return;

    try {
      setBusy(true);

      await apiFetch(
        `/api/sheets/access/${id}`,
        {
          method: "PATCH",

          body: JSON.stringify({
            favourite:
              !item.favourite,
          }),
        }
      );

      await onRefresh();
    } catch (error) {
      toast.error(
        error?.message ||
          "Failed to update favourite"
      );
    } finally {
      setBusy(false);
    }
  };

  const openSheet = () => {
    if (!item.link) {
      toast.error(
        "Sheet link not available"
      );
      return;
    }

    window.open(
      item.link,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-start gap-3">

          <div className="rounded-xl bg-emerald-50 p-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="min-w-0">

            <h3 className="truncate font-semibold text-slate-900">
              {item.sheet_name ||
                item.name ||
                "Google Sheet"}
            </h3>

            {item.user_name && (
              <p className="mt-1 truncate text-xs text-slate-500">
                {item.user_name}
              </p>
            )}

          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={toggleFavourite}
          className="rounded-lg p-1.5 hover:bg-slate-50 disabled:opacity-50"
        >
          <Star
            className={`h-5 w-5 ${
              item.favourite
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>

      </div>

      <div className="mt-4 flex flex-wrap gap-2">

        {item.category && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              categoryColors[
                item.category
              ] ||
              categoryColors.Other
            }`}
          >
            {item.category}
          </span>
        )}

        {item.access_level && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {item.access_level}
          </span>
        )}

      </div>

      <button
        type="button"
        onClick={openSheet}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <ExternalLink className="h-4 w-4" />
        Open Sheet
      </button>

    </div>
  );
}

function SheetCard({
  sheet,
  onArchive,
  onDelete,
}) {
  const [busy, setBusy] = useState(false);

  const openSheet = () => {
    if (!sheet.link) {
      toast.error(
        "Sheet link not available"
      );
      return;
    }

    window.open(
      sheet.link,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const archive = async () => {
    try {
      setBusy(true);
      await onArchive(sheet);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await onDelete(sheet);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start gap-3">

        <div className="rounded-xl bg-emerald-50 p-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="min-w-0 flex-1">

          <h3 className="truncate font-semibold text-slate-900">
            {sheet.name}
          </h3>

          {sheet.purpose && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {sheet.purpose}
            </p>
          )}

        </div>

      </div>

      <div className="mt-4 flex flex-wrap gap-2">

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            categoryColors[
              sheet.category
            ] ||
            categoryColors.Other
          }`}
        >
          {sheet.category ||
            "Other"}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            sensitivityColors[
              sheet.sensitivity
            ] ||
            sensitivityColors.Low
          }`}
        >
          {sheet.sensitivity ||
            "Low"}{" "}
          sensitivity
        </span>

        {sheet.all_stores ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            All Stores
          </span>
        ) : sheet.store_name ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            {sheet.store_name}
          </span>
        ) : null}

      </div>

      {sheet.notes && (
        <p className="mt-3 text-xs text-slate-500">
          {sheet.notes}
        </p>
      )}

      <div className="mt-4 flex gap-2">

        <button
          type="button"
          onClick={openSheet}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={archive}
          className="rounded-xl border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          title="Archive"
        >
          <Archive className="h-4 w-4" />
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>

      </div>

    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <label className="block">

      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}

    </label>
  );
}