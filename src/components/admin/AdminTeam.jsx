import React, { useState, useEffect } from "react";
import { apiFetch } from "@/api";
import {
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  "owner",
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

export default function AdminTeam() {
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      setLoading(true);

      const [usersRes, deptRes] = await Promise.all([
        apiFetch("/api/users"),
        apiFetch("/api/departments"),
      ]);

      setUsers(usersRes.items || []);

      setDepts(
        (deptRes.items || []).filter(
          (d) => d.active !== false
        )
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id, data) => {
    setBusy(id);

    try {
      const res = await apiFetch(
        `/api/users/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );

      const updated =
        res.item ||
        res.user || {
          id,
          ...data,
        };

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                ...updated,
                ...data,
              }
            : u
        )
      );

      toast.success("Updated");
    } catch (e) {
      console.error(e);

      toast.error(
        "Update failed: " +
          (e.message || "error")
      );
    } finally {
      setBusy(null);
    }
  };

  const deleteUser = async (user) => {
    const name =
      user.full_name ||
      user.name ||
      user.email;

    const confirmed = window.confirm(
      `Delete "${name}" from Team?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setBusy(user.id);

    try {
      await apiFetch(
        `/api/users/${user.id}`,
        {
          method: "DELETE",
        }
      );

      toast.success(
        "User deleted successfully"
      );

      setUsers((prev) =>
        prev.filter(
          (u) => u.id !== user.id
        )
      );
    } catch (e) {
      console.error(
        "Delete user failed:",
        e
      );

      toast.error(
        e.message ||
          "Failed to delete user"
      );
    } finally {
      setBusy(null);
    }
  };

  const filtered =
    filter === "all"
      ? users
      : users.filter(
          (u) =>
            (u.department || "") ===
            filter
        );

  const grouped = {};

  filtered.forEach((u) => {
    const key =
      u.department ||
      "Unassigned";

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push(u);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() =>
            setFilter("all")
          }
          className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          All
        </button>

        {depts.map((d) => (
          <button
            key={d.id}
            onClick={() =>
              setFilter(d.name)
            }
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
              filter === d.name
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-8">
          No users
        </p>
      ) : (
        Object.entries(grouped).map(
          ([dept, list]) => (
            <div key={dept}>

              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-1">
                {dept} · {list.length}
              </p>

              <div className="space-y-2">

                {list.map((u) => (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-2"
                  >

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {u.full_name ||
                          u.name ||
                          u.email}
                      </p>

                      <p className="text-[11px] text-slate-500 truncate">
                        {u.email}
                      </p>

                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">

                      <select
                        value={
                          u.department ||
                          ""
                        }
                        onChange={(e) =>
                          update(
                            u.id,
                            {
                              department:
                                e.target.value,
                            }
                          )
                        }
                        disabled={
                          busy === u.id
                        }
                        className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white max-w-[110px]"
                      >

                        <option value="">
                          — Dept —
                        </option>

                        {depts.map(
                          (d) => (
                            <option
                              key={d.id}
                              value={d.name}
                            >
                              {d.name}
                            </option>
                          )
                        )}

                      </select>

                      <select
                        value={
                          u.role ||
                          "manager"
                        }
                        onChange={(e) =>
                          update(
                            u.id,
                            {
                              role:
                                e.target
                                  .value,
                            }
                          )
                        }
                        disabled={
                          busy === u.id
                        }
                        className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1.5 bg-white max-w-[120px]"
                      >

                        {ROLE_OPTIONS.map(
                          (r) => (
                            <option
                              key={r}
                              value={r}
                            >
                              {r}
                            </option>
                          )
                        )}

                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          deleteUser(u)
                        }
                        disabled={
                          busy === u.id
                        }
                        title="Delete user"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                      >
                        {busy === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>

                    </div>

                  </div>
                ))}

              </div>

            </div>
          )
        )
      )}

    </div>
  );
}