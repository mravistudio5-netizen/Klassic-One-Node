import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Clock, CheckCircle2, Trash2 } from "lucide-react";

const priorityColors = {
  Urgent: "bg-red-100 text-red-700",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-blue-100 text-blue-700",
  Low: "bg-slate-100 text-slate-600",
};

const statusColors = {
  Pending: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Done: "bg-purple-100 text-purple-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Overdue: "bg-red-100 text-red-700",
};

const COMPLETED_STATUSES = ["Done", "Approved", "Cancelled", "Rejected"];

const normalizeStatus = (value) =>
  String(value || "").toLowerCase().replace(/[\s_-]+/g, "");

export default function TaskList({ scope = "all" }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);

  const { t } = useLang();
  const { can } = usePermissions();

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const meResponse = await apiFetch("/api/auth/me");
        const user = meResponse?.user || meResponse;
        if (!alive) return;

        setMe(user);
        await loadTasks(user, alive);
      } catch (error) {
        console.error("Task list loading failed:", error);
        if (alive) {
          setTasks([]);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      alive = false;
    };
    // loadTasks is intentionally called from this effect when scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const loadTasks = async (user, alive = true) => {
    try {
      const storeId = localStorage.getItem("klassic_store") || "all";
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("sort", "-due_date");

      if (scope === "mine") {
        const userId = user?.id || user?._id;
        if (userId) params.set("assigned_to_id", String(userId));
      }

      if (scope !== "mine" && storeId !== "all") {
        params.set("store_id", storeId);
      }

      const response = await apiFetch(`/api/tasks?${params.toString()}`);
      const loadedTasks = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.tasks)
            ? response.tasks
            : [];

      let visibleTasks = loadedTasks;

      if (scope === "mine") {
        const currentUserId = String(user?.id || user?._id || "");
        // Keep every task assigned to this user; do not restrict to today's date.
        visibleTasks = loadedTasks.filter((task) => {
          const assignedUserId = String(
            task?.assigned_to_id ||
              task?.assignedToId ||
              task?.assigned_to?._id ||
              task?.assigned_to?.id ||
              task?.assigned_to ||
              ""
          );
          return Boolean(currentUserId) && assignedUserId === currentUserId;
        });
      }

      if (alive) setTasks(visibleTasks);
    } catch (error) {
      console.error("Task loading failed:", error);
      if (alive) setTasks([]);
    } finally {
      if (alive) setLoading(false);
    }
  };

  const isPastDue = (task) => {
    if (!task?.due_date) return false;
    return (
      new Date(task.due_date) < new Date() &&
      !COMPLETED_STATUSES.includes(task.status)
    );
  };

  const filtered = tasks.filter((task) => {
    const status = normalizeStatus(task?.status);

    if (filter === "active") {
  if (COMPLETED_STATUSES.includes(task.status)) return false;

  if (task.start_date && new Date(task.start_date) > new Date()) {
    return false;
  }

  if (!task.due_date) return false;

  const dueDate = new Date(task.due_date);
  const now = new Date();

  return (
    dueDate.getFullYear() === now.getFullYear() &&
    dueDate.getMonth() === now.getMonth() &&
    dueDate.getDate() === now.getDate()
  );
}

    if (filter === "all") return true;
    if (filter === "pending") return status === "pending";
    if (filter === "inprogress") return status === "inprogress";
    if (filter === "done") return status === "done";
    if (filter === "approved") return status === "approved";
    if (filter === "overdue") return isPastDue(task);

    return false;
  });

  const canCreate = can("tasks", "create");
  // Delete is available only to Owner/Admin; backend also enforces permissions.
  const canDelete = can("tasks", "delete") && ["owner", "admin"].includes(me?.role);

  const handleDelete = async (taskId, event) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((current) =>
        current.filter((task) => String(task.id || task._id) !== String(taskId))
      );
    } catch (error) {
      console.error("Task delete failed:", error);
      window.alert(error?.message || "Failed to delete task");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {scope === "mine" ? t("myTasks") : t("todayTasks")}
        </h2>

        {canCreate && (
          <Link
            to="/tasks/new"
            className="flex items-center gap-1 bg-slate-900 text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {t("newTask")}
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {["active", "pending", "inprogress", "done", "approved", "overdue"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium ${
              filter === f
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {f === "active"
              ? t("active")
              : f === "inprogress"
                ? t("inProgress")
                : t(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{t("noTasks")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const taskId = task.id || task._id;
            return (
              <div
                key={taskId}
                className="relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <Link to={`/tasks/${taskId}`} className="block p-4">
                  <div className="flex items-start justify-between gap-2 pr-10">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug flex-1">
                      {task.title}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        priorityColors[task.priority] || ""
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.assigned_to_name && scope !== "mine" && (
                    <p className="text-xs text-slate-500 mt-1">
                      {t("assignTo")}: {task.assigned_to_name}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        statusColors[task.status] || ""
                      }`}
                    >
                      {t(normalizeStatus(task.status)) || task.status}
                    </span>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      {task.due_date && <Clock className="w-3 h-3" />}
                      <span>
                        {task.due_date
                          ? new Date(task.due_date).toLocaleString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>

                  {task.location_tag && (
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      📍 {task.location_tag}
                    </p>
                  )}
                </Link>

                {canDelete && (
                  <button
                    type="button"
                    onClick={(event) => handleDelete(taskId, event)}
                    className="absolute top-3 right-3 z-10 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Task"
                    aria-label="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
