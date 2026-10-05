import React, { useEffect, useState } from "react";
import { apiFetch } from "@/api";
import {
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import UserInviteForm from "@/components/admin/UserInviteForm";

const ROLE_OPTIONS = [
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/users");

      setUsers(res.items || []);
    } catch (e) {
      console.error(
        "Failed to load users:",
        e
      );

      toast.error(
        "Failed to load users"
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (
    id,
    role
  ) => {
    try {
      await apiFetch(
        `/api/users/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role,
          }),
        }
      );

      toast.success(
        "Role updated"
      );

      await load();
    } catch (e) {
      console.error(
        "Role update failed:",
        e
      );

      toast.error(
        e.message ||
          "Update failed"
      );
    }
  };

  const deleteUser = async (user) => {
    const name =
      user.name ||
      user.full_name ||
      user.email;

    const confirmed = window.confirm(
      `Delete user "${name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

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

      await load();
    } catch (e) {
      console.error(
        "Delete user failed:",
        e
      );

      toast.error(
        e.message ||
          "Failed to delete user"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <UserInviteForm
        onInvited={load}
      />

      <div className="space-y-2">

        {users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">

            <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />

            <p className="text-sm text-slate-400">
              No users found
            </p>

          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-3 border border-slate-100 flex items-center justify-between gap-3"
            >

              <div className="min-w-0 flex-1">

                <p className="text-sm font-semibold text-slate-900 truncate">
                  {u.name ||
                    u.full_name ||
                    u.email}
                </p>

                <p className="text-xs text-slate-500 truncate">
                  {u.email}
                </p>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  {u.department ||
                    "No department"}
                  {" · "}
                  {u.active
                    ? "Active"
                    : "Inactive"}
                </p>

              </div>

              <div className="flex items-center gap-2 shrink-0">

                <select
                  value={
                    u.role ||
                    "manager"
                  }
                  onChange={(e) =>
                    changeRole(
                      u.id,
                      e.target.value
                    )
                  }
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
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
                  title="Delete user"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>

            </div>
          ))
        )}

      </div>

    </div>
  );
}