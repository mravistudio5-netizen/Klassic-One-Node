import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SheetExport from "@/components/reports/SheetExport";

export default function Reports() {
  const { t } = useLang();
  const { can } = usePermissions();

  const [tab, setTab] = useState("tasks");
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);

  const [reportPermissions, setReportPermissions] = useState({
    task_report: false,
    not_done: false,
    tailor_report: false,
    checklist_report: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const [meResponse, userResponse] =
          await Promise.all([
            apiFetch("/api/auth/me"),
            apiFetch("/api/users?limit=100"),
          ]);

        const currentUser = meResponse.user;

        setMe(currentUser);

        // Load individual report permissions
        try {
          const permissionResponse = await apiFetch(
            `/api/permissions/${currentUser.role}`
          );

          setReportPermissions(
            permissionResponse?.item?.report_permissions || {
              task_report: false,
              not_done: false,
              tailor_report: false,
              checklist_report: false,
            }
          );
        } catch (permissionError) {
          console.error(
            "Failed to load report permissions:",
            permissionError
          );

          setReportPermissions({
            task_report: false,
            not_done: false,
            tailor_report: false,
            checklist_report: false,
          });
        }

        setUsers(
          (userResponse.users || []).filter(
            (user) =>
              [
                "manager",
                "tailoring_manager",
                "tailoring_operator",
                "admin",
                "mis",
                "owner",
              ].includes(user.role)
          )
        );
      } catch (error) {
        console.error(
          "Reports initialization failed:",
          error
        );
      }
    })();
  }, []);

  const isAdmin =
    me &&
    ["owner", "admin"].includes(me.role);

  const isReviewer =
    me &&
    ["owner", "admin", "mis"].includes(
      me.role
    );

  const tabs = [];

  // Individual report permissions
  if (reportPermissions.task_report) {
    tabs.push([
      "tasks",
      t("taskReport"),
    ]);
  }

  if (reportPermissions.not_done) {
    tabs.push([
      "notdone",
      "Not Done",
    ]);
  }

  if (reportPermissions.tailor_report) {
    tabs.push([
      "tailor",
      t("tailorReport"),
    ]);
  }

  if (reportPermissions.checklist_report) {
    tabs.push([
      "checklists",
      t("checklistReport"),
    ]);
  }

  if (isReviewer) {
    tabs.push([
      "scorecard",
      "Scorecard",
    ]);
  }

  if (can("reports", "export")) {
    tabs.push([
      "sheet",
      "Sheet Export",
    ]);
  }

  if (isAdmin) {

  if (isReviewer) {
    tabs.push([
      "scorecard",
      "Scorecard",
    ]);
  }

  if (can("reports", "export")) {
    tabs.push([
      "sheet",
      "Sheet Export",
    ]);
  }

  if (isAdmin) {
    tabs.push([
      "data",
      "Manage Data",
    ]);
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-slate-900">
        {t("reports")}
      </h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
              tab === key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tasks" && (
        <TaskReport users={users} />
      )}

      {tab === "notdone" && (
        <NotDoneReport users={users} />
      )}

      {tab === "tailor" && (
        <TailorReport />
      )}

      {tab === "checklists" && (
        <ChecklistReport users={users} />
      )}

      {tab === "scorecard" &&
        isReviewer && (
          <Scorecard users={users} />
        )}

      {tab === "sheet" &&
        can("reports", "export") && (
          <SheetExport />
        )}

      {tab === "data" &&
        isAdmin && (
          <DeletePriorData />
        )}
    </div>
  );
}

// ==================================================
// Helpers
// ==================================================

function storeQuery() {
  const storeId =
    localStorage.getItem(
      "klassic_store"
    );

  return storeId &&
    storeId !== "all"
    ? {
        store_id: storeId,
      }
    : {};
}

async function reportAggregate(
  entity,
  params = {}
) {
  const query = new URLSearchParams();

  query.set("entity", entity);

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        typeof value === "object"
      ) {
        query.set(
          key,
          JSON.stringify(value)
        );
      } else {
        query.set(
          key,
          String(value)
        );
      }
    }
  );

  const response =
    await apiFetch(
      `/api/reports/aggregate?${query.toString()}`
    );

  return response;
}

async function reportList(
  entity,
  params = {}
) {
  const query = new URLSearchParams();

  query.set("entity", entity);

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        typeof value === "object"
      ) {
        query.set(
          key,
          JSON.stringify(value)
        );
      } else {
        query.set(
          key,
          String(value)
        );
      }
    }
  );

  return apiFetch(
    `/api/reports/list?${query.toString()}`
  );
}

// ==================================================
// SCORECARD
// ==================================================

function Scorecard({ users }) {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const baseQuery = {
          ...storeQuery(),
          active: {
            $ne: true,
          },
        };

        const [
          totalAgg,
          completedAgg,
          onTimeAgg,
          escAgg,
        ] = await Promise.all([
          reportAggregate(
            "Task",
            {
              query: baseQuery,
              groupBy:
                "assigned_to_id",
              count: true,
              limit: 100,
            }
          ),

          reportAggregate(
            "Task",
            {
              query: {
                ...baseQuery,
                status: {
                  $in: [
                    "Done",
                    "Approved",
                  ],
                },
              },
              groupBy:
                "assigned_to_id",
              count: true,
              avg:
                "variance_minutes",
              limit: 100,
            }
          ),

          reportAggregate(
            "Task",
            {
              query: {
                ...baseQuery,
                on_time: true,
              },
              groupBy:
                "assigned_to_id",
              count: true,
              limit: 100,
            }
          ),

          reportAggregate(
            "Task",
            {
              query: {
                ...baseQuery,
                variance_minutes: {
                  $gt: 0,
                },
              },
              groupBy:
                "assigned_to_id",
              count: true,
              limit: 100,
            }
          ),
        ]);

        const nameMap = {};

        (users || []).forEach(
          (user) => {
            nameMap[
              user.id ||
                user._id
            ] =
              user.name ||
              user.full_name ||
              user.email;
          }
        );

        const completedMap = {};
        const varianceMap = {};
        const onTimeMap = {};
        const escalationMap = {};

        (
          completedAgg.rows || []
        ).forEach((row) => {
          completedMap[
            row.assigned_to_id
          ] = row.count;

          varianceMap[
            row.assigned_to_id
          ] =
            row.avg_variance_minutes;
        });

        (
          onTimeAgg.rows || []
        ).forEach((row) => {
          onTimeMap[
            row.assigned_to_id
          ] = row.count;
        });

        (
          escAgg.rows || []
        ).forEach((row) => {
          escalationMap[
            row.assigned_to_id
          ] = row.count;
        });

        const output =
          (
            totalAgg.rows || []
          )
            .map((row) => {
              const uid =
                row.assigned_to_id;

              const completed =
                completedMap[
                  uid
                ] || 0;

              const onTime =
                onTimeMap[
                  uid
                ] || 0;

              const escalation =
                escalationMap[
                  uid
                ] || 0;

              const variance =
                varianceMap[
                  uid
                ];

              const onTimePct =
                completed
                  ? Math.round(
                      (onTime /
                        completed) *
                        100
                    )
                  : 0;

              return {
                uid,
                name:
                  nameMap[uid] ||
                  "Unassigned",
                total:
                  row.count,
                completed,
                onTime,
                escalation,
                onTimePct,
                variance,
              };
            })
            .filter(
              (row) => row.uid
            );

        setRows(output);
      } catch (error) {
        console.error(
          "Scorecard failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [users]);

  const fmtVariance = (
    value
  ) => {
    if (
      value == null ||
      Number.isNaN(
        Number(value)
      )
    ) {
      return "—";
    }

    if (
      Math.abs(value) < 1
    ) {
      return "On time";
    }

    const hours =
      Math.abs(value) / 60;

    return `${hours.toFixed(
      1
    )}h ${
      value > 0
        ? "late"
        : "early"
    }`;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        On-time completion,
        escalations (late tasks)
        and avg variance per
        manager.
      </p>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-4">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.uid}
              className="bg-white rounded-2xl p-4 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">
                  {row.name}
                </span>

                <span className="text-[11px] text-slate-400">
                  {row.total} task(s)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-700">
                    {row.onTimePct}%
                  </p>

                  <p className="text-[10px] text-slate-500">
                    On-time
                  </p>
                </div>

                <div>
                  <p className="text-lg font-bold text-red-600">
                    {row.escalation}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    Escalations
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800 leading-6">
                    {fmtVariance(
                      row.variance
                    )}
                  </p>

                  <p className="text-[10px] text-slate-500">
                    Variance
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Completed:{" "}
                  {row.completed}
                </span>

                <span>
                  On-time:{" "}
                  {row.onTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================================================
// COMMON FILTERS
// ==================================================

function PeriodToggle({
  unit,
  setUnit,
}) {
  const { t } = useLang();

  return (
    <div className="flex gap-2">
      {[
        ["day", t("daily")],
        ["month", t("monthly")],
      ].map(
        ([value, label]) => (
          <button
            key={value}
            onClick={() =>
              setUnit(value)
            }
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${
              unit === value
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </button>
        )
      )}
    </div>
  );
}

function ManagerFilter({
  users,
  value,
  onChange,
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white max-w-[160px]"
    >
      <option value="all">
        All Managers
      </option>

      {users.map((user) => (
        <option
          key={
            user.id ||
            user._id
          }
          value={
            user.id ||
            user._id
          }
        >
          {user.name ||
            user.full_name ||
            user.email}
        </option>
      ))}
    </select>
  );
}

// ==================================================
// TASK REPORT
// ==================================================

function TaskReport({ users }) {
  const { t } = useLang();

  const [unit, setUnit] =
    useState("day");

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [managerId, setManagerId] =
    useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const baseQuery = {
          ...storeQuery(),
          active: {
            $ne: true,
          },
        };

        if (
          managerId !== "all"
        ) {
          baseQuery.assigned_to_id =
            managerId;
        }

        const [
          totalAgg,
          doneAgg,
        ] = await Promise.all([
          reportAggregate(
            "Task",
            {
              query: {
                ...baseQuery,
                status: {
                  $ne: "Cancelled",
                },
              },
              dateBucket: {
                field: "due_date",
                unit,
              },
              count: true,
              limit: 60,
            }
          ),

          reportAggregate(
            "Task",
            {
              query: {
                ...baseQuery,
                status: {
                  $in: [
                    "Done",
                    "Approved",
                  ],
                },
              },
              dateBucket: {
                field: "due_date",
                unit,
              },
              count: true,
              limit: 60,
            }
          ),
        ]);

        const doneMap = {};

        (
          doneAgg.rows || []
        ).forEach((row) => {
          doneMap[
            row.due_date
          ] = row.count;
        });

        setRows(
          (totalAgg.rows || [])
            .map((row) => ({
              key: row.due_date,
              count: row.count,
              done:
                doneMap[
                  row.due_date
                ] || 0,
              missed:
                row.count -
                (doneMap[
                  row.due_date
                ] || 0),
            }))
            .sort((a, b) =>
              b.key.localeCompare(
                a.key
              )
            )
        );
      } catch (error) {
        console.error(
          "Task report failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [unit, managerId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PeriodToggle
          unit={unit}
          setUnit={setUnit}
        />

        <ManagerFilter
          users={users}
          value={managerId}
          onChange={setManagerId}
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-4">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const pct = row.count
              ? Math.round(
                  (row.done /
                    row.count) *
                    100
                )
              : 0;

            const label =
              unit === "day"
                ? new Date(
                    row.key
                  ).toLocaleDateString()
                : row.key.slice(
                    0,
                    7
                  );

            return (
              <div
                key={row.key}
                className="bg-white rounded-2xl p-4 border border-slate-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {label}
                  </span>

                  <span className="text-xs text-slate-500">
                    {row.done}/
                    {row.count}

                    {row.missed >
                    0
                      ? ` · ${row.missed} missed`
                      : ""}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>

                <p className="text-[11px] mt-1">
                  {row.missed >
                  0 ? (
                    <span className="text-red-600 font-medium">
                      {row.missed} not done
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {t(
                        "completed"
                      )}
                      : {pct}%
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================================================
// NOT DONE
// ==================================================

function NotDoneReport({
  users,
}) {
  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [managerId, setManagerId] =
    useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const query = {
          ...storeQuery(),

          active: {
            $ne: true,
          },

          status: {
            $nin: [
              "Done",
              "Approved",
              "Cancelled",
              "Rejected",
            ],
          },

          due_date: {
            $lt:
              new Date().toISOString(),
          },
        };

        if (
          managerId !== "all"
        ) {
          query.assigned_to_id =
            managerId;
        }

        const response =
          await reportList(
            "Task",
            {
              query,
              sort: "-due_date",
              limit: 100,
            }
          );

        const nameMap = {};

        (
          users || []
        ).forEach((user) => {
          nameMap[
            user.id ||
              user._id
          ] =
            user.name ||
            user.full_name ||
            user.email;
        });

        setRows(
          (
            response.items ||
            response.tasks ||
            []
          ).map((row) => ({
            ...row,

            _name:
              nameMap[
                row.assigned_to_id
              ] ||
              row.assigned_to_name ||
              "Unassigned",
          }))
        );
      } catch (error) {
        console.error(
          "Not done report failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [managerId, users]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500">
          Tasks past their
          deadline, not completed
          — removed from today's
          view.
        </p>

        <ManagerFilter
          users={users}
          value={managerId}
          onChange={setManagerId}
        />
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-4">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">
          No missed tasks
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={
                row.id ||
                row._id
              }
              className="bg-white rounded-2xl p-3 border border-red-100"
            >
              <p className="text-sm font-semibold text-slate-800">
                {row.title}
              </p>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500">
                  {row._name}

                  {row.store_name
                    ? ` · ${row.store_name}`
                    : ""}
                </span>

                <span className="text-[11px] text-red-600 font-medium">
                  Due{" "}
                  {row.due_date
                    ? new Date(
                        row.due_date
                      ).toLocaleString(
                        [],
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================================================
// TAILOR REPORT
// ==================================================

function TailorReport() {
  const { t } = useLang();

  const [unit, setUnit] =
    useState("month");

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const query =
          storeQuery();

        const [
          pantsAgg,
          onTimeAgg,
          alterAgg,
        ] = await Promise.all([
          reportAggregate(
            "PantStitch",
            {
              query: {
                ...query,
                status: {
                  $in: [
                    "Completed",
                    "Delivered",
                  ],
                },
              },

              dateBucket: {
                field:
                  "completed_at",
                unit,
              },

              count: true,
              limit: 60,
            }
          ),

          reportAggregate(
            "PantStitch",
            {
              query: {
                ...query,
                on_time: true,
              },

              dateBucket: {
                field:
                  "completed_at",
                unit,
              },

              count: true,
              limit: 60,
            }
          ),

          reportAggregate(
            "Alteration",
            {
              query: {
                ...query,
                status: {
                  $in: [
                    "Completed",
                    "Delivered",
                  ],
                },
              },

              dateBucket: {
                field:
                  "completed_at",
                unit,
              },

              count: true,
              limit: 60,
            }
          ),
        ]);

        const onTimeMap = {};
        const alterMap = {};
        const pantsMap = {};

        (
          onTimeAgg.rows || []
        ).forEach((row) => {
          onTimeMap[
            row.completed_at
          ] = row.count;
        });

        (
          alterAgg.rows || []
        ).forEach((row) => {
          alterMap[
            row.completed_at
          ] = row.count;
        });

        (
          pantsAgg.rows || []
        ).forEach((row) => {
          pantsMap[
            row.completed_at
          ] = row.count;
        });

        const keys = [
          ...new Set([
            ...Object.keys(
              onTimeMap
            ),
            ...Object.keys(
              pantsMap
            ),
            ...Object.keys(
              alterMap
            ),
          ]),
        ].sort().reverse();

        setRows(
          keys.map((key) => ({
            key,

            pants:
              pantsMap[key] ||
              0,

            onTime:
              onTimeMap[key] ||
              0,

            alter:
              alterMap[key] ||
              0,
          }))
        );
      } catch (error) {
        console.error(
          "Tailor report failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [unit]);

  return (
    <div className="space-y-3">
      <PeriodToggle
        unit={unit}
        setUnit={setUnit}
      />

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-4">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const onTimePct =
              row.pants
                ? Math.round(
                    (row.onTime /
                      row.pants) *
                      100
                  )
                : 0;

            const label =
              unit === "day"
                ? new Date(
                    row.key
                  ).toLocaleDateString()
                : row.key.slice(
                    0,
                    7
                  );

            return (
              <div
                key={row.key}
                className="bg-white rounded-2xl p-4 border border-slate-100"
              >
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  {label}
                </p>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {row.pants}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {t(
                        "pantsDone"
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-green-700">
                      {row.onTime}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {t(
                        "onTime"
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-purple-700">
                      {row.alter}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {t(
                        "alterations"
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full"
                    style={{
                      width: `${onTimePct}%`,
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 mt-1">
                  {t("onTime")}:{" "}
                  {onTimePct}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================================================
// CHECKLIST REPORT
// ==================================================

function ChecklistReport({
  users,
}) {
  const { t } = useLang();

  const [unit, setUnit] =
    useState("day");

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [managerId, setManagerId] =
    useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        const query =
          storeQuery();

        const periodField =
          unit === "day"
            ? "date"
            : "month";

        let aggregateRows = [];

        if (
          managerId === "all"
        ) {
          const response =
            await reportAggregate(
              "ChecklistEntry",
              {
                query,

                groupBy: [
                  periodField,
                  "manager_id",
                ],

                avg:
                  "completed_pct",

                count: true,

                limit: 300,
              }
            );

          aggregateRows =
            response.rows || [];
        } else {
          query.manager_id =
            managerId;

          const response =
            await reportAggregate(
              "ChecklistEntry",
              {
                query,

                groupBy:
                  periodField,

                avg:
                  "completed_pct",

                count: true,

                sort: `-${periodField}`,

                limit: 60,
              }
            );

          aggregateRows = (
            response.rows || []
          ).map(
            (row) => ({
              ...row,
              manager_id:
                managerId,
            })
          );
        }

        const nameMap = {};

        (
          users || []
        ).forEach((user) => {
          nameMap[
            user.id ||
              user._id
          ] =
            user.name ||
            user.full_name ||
            user.email;
        });

        const periods = {};

        aggregateRows.forEach(
          (row) => {
            const period =
              row[
                periodField
              ];

            if (!period) {
              return;
            }

            if (
              !periods[period]
            ) {
              periods[period] = {
                period,
                rows: [],
              };
            }

            periods[
              period
            ].rows.push({
              manager_id:
                row.manager_id,

              name:
                nameMap[
                  row.manager_id
                ] ||
                row.manager_name ||
                "—",

              pct: Math.round(
                row.avg_completed_pct ||
                  0
              ),

              count:
                row.count,
            });
          }
        );

        setRows(
          Object.values(
            periods
          ).sort((a, b) =>
            b.period.localeCompare(
              a.period
            )
          )
        );
      } catch (error) {
        console.error(
          "Checklist report failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [
    unit,
    managerId,
    users,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <PeriodToggle
          unit={unit}
          setUnit={setUnit}
        />

        <ManagerFilter
          users={users}
          value={managerId}
          onChange={setManagerId}
        />
      </div>

      <p className="text-xs text-slate-500">
        Day-wise / month-wise
        completion % per manager.
      </p>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-4">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">
          No data
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((period) => (
            <div
              key={
                period.period
              }
              className="bg-white rounded-2xl p-4 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">
                  {unit === "day"
                    ? new Date(
                        period.period
                      ).toLocaleDateString()
                    : period.period}
                </span>

                <span className="text-xs text-slate-500">
                  {
                    period.rows
                      .length
                  }{" "}
                  manager(s)
                </span>
              </div>

              <div className="space-y-1.5">
                {period.rows.map(
                  (row) => (
                    <div
                      key={
                        row.manager_id
                      }
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-slate-700 flex-1 truncate">
                        {row.name}
                      </span>

                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${row.pct}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-slate-700 w-9 text-right">
                          {row.pct}%
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================================================
// DELETE PRIOR DATA
// ==================================================

function DeletePriorData() {
  const [cutoff, setCutoff] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const run = async (
    entity,
    query,
    label
  ) => {
    if (!cutoff) {
      toast.error(
        "Pick a cutoff date first"
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete all completed ${label} records before ${cutoff}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response =
        await apiFetch(
          "/api/reports/delete",
          {
            method: "POST",
            body: JSON.stringify({
              entity,
              query,
            }),
          }
        );

      const total =
        response.count || 0;

      toast.success(
        total > 0
          ? `Deleted ${total} ${label} record(s)`
          : `Completed ${label} records cleared`
      );
    } catch (error) {
      toast.error(
        "Failed: " +
          (error.message ||
            "error")
      );
    } finally {
      setBusy(false);
    }
  };

  const cutoffIso = cutoff
    ? new Date(
        cutoff +
          "T00:00:00"
      ).toISOString()
    : "";

  const buttons = [
    {
      entity: "Task",
      label: "Tasks",

      query: {
        status: {
          $in: [
            "Done",
            "Approved",
          ],
        },

        completed_at: {
          $lt: cutoffIso,
        },
      },
    },

    {
      entity: "Alteration",
      label: "Alterations",

      query: {
        status: {
          $in: [
            "Completed",
            "Delivered",
          ],
        },

        completed_at: {
          $lt: cutoffIso,
        },
      },
    },

    {
      entity: "PantStitch",
      label: "Pant Stitching",

      query: {
        status: {
          $in: [
            "Completed",
            "Delivered",
          ],
        },

        completed_at: {
          $lt: cutoffIso,
        },
      },
    },

    {
      entity:
        "ChecklistEntry",

      label:
        "Checklist Entries",

      query: {
        completed_pct: 100,

        date: {
          $lt: cutoff,
        },
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />

        <p className="text-xs text-amber-700">
          Permanently deletes
          completed records older
          than the cutoff date.
          Only Done/Approved/
          Delivered records are
          removed — active records
          are kept. This cannot be
          undone.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
            Delete completed
            records before
          </label>

          <input
            type="date"
            value={cutoff}
            onChange={(event) =>
              setCutoff(
                event.target.value
              )
            }
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {buttons.map((button) => (
            <button
              key={
                button.entity
              }
              disabled={
                busy || !cutoff
              }
              onClick={() =>
                run(
                  button.entity,
                  button.query,
                  button.label
                )
              }
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />

              Delete{" "}
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}