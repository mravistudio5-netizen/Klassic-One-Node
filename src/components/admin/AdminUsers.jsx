import React, { useEffect, useState } from "react";
import { apiFetch } from "@/api";
import {
  Loader2,
  UserPlus,
  Trash2,
  Pencil,
  X,
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

  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
    mobile: "",
    department: "",
    shift: "General",
    active: true,
  });

  const load = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/users");
      setUsers(res.items || []);
    } catch (e) {
      console.error("Failed to load users:", e);
      toast.error("Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id, role) => {
    try {
      await apiFetch(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role,
        }),
      });

      toast.success("Role updated");
      await load();
    } catch (e) {
      console.error("Role update failed:", e);

      toast.error(
        e.message || "Update failed"
      );
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);

    setEditForm({
      name:
        user.name ||
        user.full_name ||
        "",

      email:
        user.email ||
        "",

      password: "",

      role:
        user.role ||
        "manager",

      mobile:
        user.mobile ||
        "",

      department:
        user.department ||
        "",

      shift:
        user.shift ||
        "General",

      active:
        user.active !== false,
    });
  };

  const closeEdit = () => {
    if (saving) return;

    setEditingUser(null);

    setEditForm({
      name: "",
      email: "",
      password: "",
      role: "manager",
      mobile: "",
      department: "",
      shift: "General",
      active: true,
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;

    if (!editForm.name.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (
      editForm.password &&
      editForm.password.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters"
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
  name: editForm.name.trim(),
  email: editForm.email.trim().toLowerCase(),
  role: editForm.role,
  mobile: editForm.mobile.trim(),
  department: editForm.department.trim(),
  shift: editForm.shift,
  active: editForm.active,
};

      // Password फक्त नवीन password दिला असेल तरच पाठवायचा
      if (editForm.password.trim()) {
  await apiFetch(
    `/api/users/${editingUser.id}/password`,
    {
      method: "PATCH",
      body: JSON.stringify({
        password: editForm.password.trim(),
      }),
    }
  );

  toast.success("Password updated successfully");
  closeEdit();
  await load();
  return;
}

      toast.success(
        "User updated successfully"
      );

      closeEdit();
      await load();
    } catch (e) {
      console.error(
        "User update failed:",
        e
      );

      toast.error(
        e.message ||
          "Failed to update user"
      );
    } finally {
      setSaving(false);
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
    <>
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

                  <button
                    type="button"
                    onClick={() =>
                      openEdit(u)
                    }
                    title="Edit user"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

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

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">

          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100">

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">

              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Edit User
                </h3>

                <p className="text-xs text-slate-400 mt-0.5">
                  Update user details and password
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>

            </div>

            <div className="p-5 space-y-3">

              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Full Name
                </label>

                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      name: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Full name"
                />
              </div>

              {/* Username / Email */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Username / Email
                </label>

                <input
  type="email"
  value={editForm.email}
  onChange={(e) =>
    setEditForm({
      ...editForm,
      email: e.target.value,
    })
  }
  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
  placeholder="Username / email"
/>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  New Password
                </label>

                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      password:
                        e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Role
                </label>

                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {ROLE_OPTIONS.map(
                    (role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Mobile */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Mobile
                </label>

                <input
                  value={editForm.mobile}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      mobile: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Mobile number"
                />
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Department
                </label>

                <input
                  value={
                    editForm.department
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      department:
                        e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Department"
                />
              </div>

              {/* Shift */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Shift
                </label>

                <input
                  value={editForm.shift}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      shift: e.target.value,
                    })
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="General"
                />
              </div>

              {/* Active */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    editForm.active
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      active:
                        e.target.checked,
                    })
                  }
                />

                <span className="text-sm text-slate-600">
                  Active user
                </span>
              </label>

            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="px-5 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}