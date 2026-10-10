import React, { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { apiFetch } from "@/api";

import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  FileSpreadsheet,
  BarChart3,
  ListChecks,
  ClipboardCheck,
} from "lucide-react";

const getLabel = (t, key, fallback) => {
  try {
    const value = t(key);
    return typeof value === "string" || typeof value === "number"
      ? value
      : fallback;
  } catch {
    return fallback;
  }
};

export default function Home() {
  const outletContext = useOutletContext() || {};
  const user = outletContext.user || null;
  const activeStoreId = outletContext.activeStoreId;
  const { t } = useLang();

  const rawRole = user?.role || "manager";
  const normalizedRole = String(rawRole).toLowerCase();

  const isAdminRole = [
    "owner",
    "admin",
    "hr",
    "human_resources",
  ].includes(normalizedRole);

  const isTailorRole = [
    "tailoring_manager",
    "tailoring_operator",
  ].includes(normalizedRole);

  const [stats, setStats] = useState({
    today: 0,
    pending: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
    completed: 0,
  });

  const [tailorStats, setTailorStats] = useState({
    alterActive: 0,
    stitchActive: 0,
    overdue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);

      try {
        const storeQuery =
          activeStoreId && activeStoreId !== "all"
            ? `?store_id=${encodeURIComponent(activeStoreId)}`
            : "";

        const [dashboardResponse, tailorResponse] = await Promise.all([
          apiFetch(`/api/dashboard/stats${storeQuery}`),
          apiFetch(`/api/tailor/stats${storeQuery}`).catch((error) => {
            console.error("Tailor stats load failed:", error);
            return null;
          }),
        ]);

        if (cancelled) return;

        const dashboardStats = dashboardResponse?.stats || {};

        setStats({
          today: Number(dashboardStats.today ?? 0) || 0,
          pending: Number(dashboardStats.pending ?? 0) || 0,
          inProgress: Number(dashboardStats.inProgress ?? 0) || 0,
          done: Number(dashboardStats.done ?? dashboardStats.completed ?? 0) || 0,
          overdue: Number(dashboardStats.overdue ?? 0) || 0,
          completed: Number(dashboardStats.completed ?? dashboardStats.done ?? 0) || 0,
        });

        setTailorStats({
          alterActive: Math.max(
            0,
            (Number(tailorResponse?.totalAlterations ?? 0) || 0) -
              (Number(tailorResponse?.completedAlterations ?? 0) || 0)
          ),
          stitchActive: Math.max(
            0,
            (Number(tailorResponse?.totalPantStitch ?? 0) || 0) -
              (Number(tailorResponse?.completedPantStitch ?? 0) || 0)
          ),
          overdue: 0,
        });
      } catch (error) {
        console.error("Dashboard load failed:", error);

        if (!cancelled) {
          setStats({
            today: 0,
            pending: 0,
            inProgress: 0,
            done: 0,
            overdue: 0,
            completed: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user, activeStoreId]);

  const label = (key, fallback) => getLabel(t, key, fallback);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-sm text-slate-500">
          {label("welcome", "Welcome")}
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          {typeof user?.full_name === "string"
            ? user.full_name
            : typeof user?.name === "string"
              ? user.name
              : "Staff"}
        </h2>
      </div>

      {!isTailorRole && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={CheckSquare}
            label={label("todayTasks", "Today's Tasks")}
            value={loading ? "—" : stats.today}
            color="bg-blue-50 text-blue-700"
          />

          <StatCard
            icon={Clock}
            label={label("pending", "Pending")}
            value={loading ? "—" : stats.pending}
            color="bg-amber-50 text-amber-700"
          />

          <StatCard
            icon={Clock}
            label="In Progress"
            value={loading ? "—" : stats.inProgress}
            color="bg-orange-50 text-orange-700"
          />

          <StatCard
            icon={AlertTriangle}
            label={label("overdue", "Overdue")}
            value={loading ? "—" : stats.overdue}
            color="bg-red-50 text-red-700"
          />

          <StatCard
            icon={CheckCircle2}
            label="Done"
            value={loading ? "—" : stats.done}
            color="bg-green-50 text-green-700"
          />

          <StatCard
            icon={CheckCircle2}
            label={label("completed", "Completed")}
            value={loading ? "—" : stats.completed}
            color="bg-emerald-50 text-emerald-700"
          />
        </div>
      )}

      {isTailorRole && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Scissors}
            label={label("alterations", "Alterations")}
            value={loading ? "—" : tailorStats.alterActive}
            color="bg-purple-50 text-purple-700"
          />

          <StatCard
            icon={Scissors}
            label={label("pantStitching", "Pant Stitching")}
            value={loading ? "—" : tailorStats.stitchActive}
            color="bg-indigo-50 text-indigo-700"
          />
        </div>
      )}

      {isAdminRole && !isTailorRole && (
        <div className="space-y-3 pt-1">
          <h3 className="text-sm font-semibold text-slate-700">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QuickActionCard
              to="/my-tasks"
              icon={CheckSquare}
              label="My Tasks"
            />

            <QuickActionCard
              to="/tasks"
              icon={CheckSquare}
              label="Tasks"
            />

            <QuickActionCard
              to="/reports"
              icon={BarChart3}
              label="Reports"
            />

            <QuickActionCard
              to="/sheets"
              icon={FileSpreadsheet}
              label="My Sheets"
            />

            <QuickActionCard
              to="/task-admin"
              icon={ListChecks}
              label="Task Admin"
            />

            <QuickActionCard
              to="/checklist-admin"
              icon={ClipboardCheck}
              label="Checklist Admin"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer min-h-[86px] flex flex-col items-center justify-center text-center"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 group-hover:bg-slate-100 flex items-center justify-center mb-2 transition-colors">
        <Icon className="w-5 h-5" />
      </div>

      <p className="text-xs font-medium text-slate-700">{label}</p>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-2`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
