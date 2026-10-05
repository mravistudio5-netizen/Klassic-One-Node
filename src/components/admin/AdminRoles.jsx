import React, { useState, useEffect } from "react";
import { apiFetch } from "@/api";
import { Loader2, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  MODULES,
  ACTIONS,
  defaultMatrixForRole,
  modulesFromMatrix,
} from "@/lib/permissions";
import { clearPermissionsCache } from "@/hooks/usePermissions";

const ROLES = [
  "owner",
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

const ACTION_LABELS = {
  create: "CREATE",
  read: "READ",
  update: "UPDATE",
  delete: "DELETE",
  export: "EXPORT",
};

const REPORT_PERMISSIONS = [
  {
    key: "task_report",
    label: "Task Report",
  },
  {
    key: "not_done",
    label: "Not Done",
  },
  {
    key: "tailor_report",
    label: "Tailor Report",
  },
  {
    key: "checklist_report",
    label: "Checklist Report",
  },
];

const DEFAULT_REPORT_PERMISSIONS = {
  task_report: false,
  not_done: false,
  tailor_report: false,
  checklist_report: false,
};

export default function AdminRoles() {
  const [perms, setPerms] = useState({});
  const [selected, setSelected] = useState("manager");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/permissions/roles");

      const map = {};

      (res.items || []).forEach((permission) => {
        map[permission.role] = permission;
      });

      setPerms(map);
    } catch (error) {
      console.error("Failed to load permissions:", error);

      toast.error(
        "Failed to load permissions: " +
          (error.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const matrixFor = (role) => {
    const permission = perms[role];

    if (
      permission?.matrix &&
      Object.keys(permission.matrix).length
    ) {
      return permission.matrix;
    }

    return defaultMatrixForRole(role);
  };

  const reportPermissionsFor = (role) => {
    const saved = perms[role]?.report_permissions;

    return {
      ...DEFAULT_REPORT_PERMISSIONS,
      ...(saved || {}),
    };
  };

  const save = async (
    role,
    matrix,
    crossDepartment,
    reportPermissions
  ) => {
    setBusy(role);

    const modules = modulesFromMatrix(matrix) || [];

    try {
      const res = await apiFetch(
        `/api/permissions/roles/${role}`,
        {
          method: "PUT",
          body: JSON.stringify({
            matrix,
            modules,
            report_permissions:
              reportPermissions ||
              reportPermissionsFor(role),
            can_assign_cross_department:
              crossDepartment ??
              !!perms[role]?.can_assign_cross_department,
          }),
        }
      );

      const updated = res.item;

      setPerms((current) => ({
        ...current,
        [role]: updated,
      }));

      clearPermissionsCache();

      toast.success("Permission updated");
    } catch (error) {
      console.error("Permission update failed:", error);

      toast.error(
        "Failed to update: " +
          (error.message || "Unknown error")
      );
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (
    role,
    modKey,
    action
  ) => {
    const matrix = JSON.parse(
      JSON.stringify(matrixFor(role))
    );

    if (!matrix[modKey]) {
      matrix[modKey] = {};
    }

    matrix[modKey][action] =
      !matrix[modKey][action];

    await save(
      role,
      matrix,
      undefined,
      reportPermissionsFor(role)
    );
  };

  const toggleReportPermission = async (
    role,
    reportKey
  ) => {
    const matrix = matrixFor(role);

    const reportPermissions =
      reportPermissionsFor(role);

    reportPermissions[reportKey] =
      !reportPermissions[reportKey];

    await save(
      role,
      matrix,
      undefined,
      reportPermissions
    );
  };

  const toggleCross = async (role) => {
    const current =
      !!perms[role]?.can_assign_cross_department;

    const next = !current;

    setBusy(role + "cross");

    try {
      const matrix = matrixFor(role);
      const modules = modulesFromMatrix(matrix) || [];

      const res = await apiFetch(
        `/api/permissions/roles/${role}`,
        {
          method: "PUT",
          body: JSON.stringify({
            matrix,
            modules,
            report_permissions:
              reportPermissionsFor(role),
            can_assign_cross_department: next,
          }),
        }
      );

      setPerms((currentPerms) => ({
        ...currentPerms,
        [role]: res.item,
      }));

      clearPermissionsCache();

      toast.success("Updated");
    } catch (error) {
      console.error(
        "Cross-department update failed:",
        error
      );

      toast.error(
        "Failed to update: " +
          (error.message || "Unknown error")
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    );
  }

  const matrix = selected
    ? matrixFor(selected)
    : null;

  const reportPermissions = selected
    ? reportPermissionsFor(selected)
    : DEFAULT_REPORT_PERMISSIONS;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelected(role)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium capitalize ${
              selected === role
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {!selected ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          Select a role to edit its permissions.
        </div>
      ) : (
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            backgroundColor: "#0B4C33",
          }}
        >
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              System Role: {selected}
            </h3>

            <button
              onClick={() => setSelected(null)}
              className="w-8 h-8 rounded-full border border-white/40 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pt-1 pb-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70">
              PERMISSION MATRIX
            </p>

            <p className="text-xs text-white/60">
              Tap to toggle. Empty modules grant no access.
            </p>
          </div>

          <div className="px-3 pb-3 space-y-2.5">
            {MODULES.map((mod) => {
              const row =
                matrix[mod.key] || {};

              return (
                <div
                  key={mod.key}
                  className="rounded-2xl p-3.5"
                  style={{
                    backgroundColor: "#135D43",
                  }}
                >
                  <p className="text-sm font-bold text-white mb-2.5">
                    {mod.label}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {ACTIONS.map((action) => {
                      const on = !!row[action];

                      return (
                        <button
                          key={action}
                          onClick={() =>
                            toggle(
                              selected,
                              mod.key,
                              action
                            )
                          }
                          disabled={
                            busy === selected ||
                            busy ===
                              selected + "cross"
                          }
                          className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors text-white"
                          style={
                            on
                              ? {
                                  backgroundColor:
                                    "#2C7A63",
                                  border:
                                    "1px solid #FFFFFF",
                                }
                              : {
                                  backgroundColor:
                                    "#0E4D38",
                                  border:
                                    "1px solid transparent",
                                }
                          }
                        >
                          {ACTION_LABELS[action]}
                        </button>
                      );
                    })}
                  </div>

                  {mod.key === "reports" && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-[11px] font-semibold tracking-[0.15em] text-white/70 mb-2.5">
                        REPORT ACCESS
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {REPORT_PERMISSIONS.map(
                          (report) => {
                            const on =
                              !!reportPermissions[
                                report.key
                              ];

                            return (
                              <button
                                key={report.key}
                                type="button"
                                disabled={
                                  busy === selected ||
                                  !row.read
                                }
                                onClick={() =>
                                  toggleReportPermission(
                                    selected,
                                    report.key
                                  )
                                }
                                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] font-semibold text-white transition-colors disabled:opacity-40"
                                style={
                                  on
                                    ? {
                                        backgroundColor:
                                          "#2C7A63",
                                        border:
                                          "1px solid #FFFFFF",
                                      }
                                    : {
                                        backgroundColor:
                                          "#0E4D38",
                                        border:
                                          "1px solid transparent",
                                      }
                                }
                              >
                                <span>
                                  {report.label}
                                </span>

                                <span className="text-[10px]">
                                  {on ? "ON" : "OFF"}
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>

                      {!row.read && (
                        <p className="text-[10px] text-white/50 mt-2">
                          Enable REPORTS → READ to give
                          report access.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 pb-5 pt-1">
            <button
              onClick={() =>
                toggleCross(selected)
              }
              disabled={
                busy === selected + "cross"
              }
              className="w-full flex items-center justify-between rounded-2xl px-4 py-3"
              style={{
                backgroundColor: "#135D43",
              }}
            >
              <span className="text-sm font-semibold text-white">
                Assign cross-department
              </span>

              <span
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  perms[selected]
                    ?.can_assign_cross_department
                    ? "bg-emerald-400"
                    : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    perms[selected]
                      ?.can_assign_cross_department
                      ? "left-[22px]"
                      : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}