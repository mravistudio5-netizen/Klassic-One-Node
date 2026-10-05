import React from "react";
import { MODULES, ACTIONS } from "@/lib/permissions";

const ACTION_LABELS = {
  create: "CREATE",
  read: "READ",
  update: "UPDATE",
  delete: "DELETE",
  export: "EXPORT",
};

const REPORT_PERMISSIONS = [
  { key: "task_report", label: "Task Report" },
  { key: "not_done", label: "Not Done" },
  { key: "tailor_report", label: "Tailor Report" },
  { key: "checklist_report", label: "Checklist Report" },
];

// Reusable forest-green permission matrix editor.
export default function PermissionMatrixEditor({
  matrix,
  onToggle,
  reportPermissions = {},
  onReportToggle,
  disabled,
}) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ backgroundColor: "#0B4C33" }}
    >
      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70">
          PERMISSION MATRIX
        </p>

        <p className="text-xs text-white/60">
          Tap to toggle. Empty modules grant no access.
        </p>
      </div>

      <div className="px-3 pb-3 space-y-2.5">

        {MODULES.map((mod) => {
          const row = matrix?.[mod.key] || {};

          return (
            <div
              key={mod.key}
              className="rounded-2xl p-3.5"
              style={{ backgroundColor: "#135D43" }}
            >
              <p className="text-sm font-bold text-white mb-2.5">
                {mod.label}
              </p>

              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((a) => {
                  const on = !!row[a];

                  return (
                    <button
                      key={a}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(mod.key, a)}
                      className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors text-white disabled:opacity-50"
                      style={
                        on
                          ? {
                              backgroundColor: "#2C7A63",
                              border: "1px solid #FFFFFF",
                            }
                          : {
                              backgroundColor: "#0E4D38",
                              border: "1px solid transparent",
                            }
                      }
                    >
                      {ACTION_LABELS[a]}
                    </button>
                  );
                })}
              </div>

              {/* Individual Reports Permissions */}
              {mod.key === "reports" && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-[11px] font-semibold tracking-wide text-white/70 mb-2">
                    REPORT ACCESS
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_PERMISSIONS.map((report) => {
                      const on = !!reportPermissions?.[report.key];

                      return (
                        <button
                          key={report.key}
                          type="button"
                          disabled={disabled || !row.read}
                          onClick={() =>
                            onReportToggle &&
                            onReportToggle(report.key)
                          }
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-[11px] font-semibold text-white transition-colors disabled:opacity-40"
                          style={
                            on
                              ? {
                                  backgroundColor: "#2C7A63",
                                  border: "1px solid #FFFFFF",
                                }
                              : {
                                  backgroundColor: "#0E4D38",
                                  border: "1px solid transparent",
                                }
                          }
                        >
                          <span>{report.label}</span>

                          <span className="text-[10px]">
                            {on ? "ON" : "OFF"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!row.read && (
                    <p className="text-[10px] text-white/50 mt-2">
                      Enable REPORTS → READ to give report access.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}