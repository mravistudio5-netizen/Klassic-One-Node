import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { apiFetch } from "@/api";

import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  FileSpreadsheet,
  TrendingUp,
  ListChecks,
} from "lucide-react";

export default function Home() {
  const { user, activeStoreId, modules } = useOutletContext();
  const { t } = useLang();

  const can = (m) => !modules || modules.includes(m);

  const role =
    user?.role === "admin"
      ? "owner"
      : user?.role || "manager";

  const isTailorRole = [
    "tailoring_manager",
    "tailoring_operator",
  ].includes(role);

  const [stats, setStats] = useState({
    today: 0,
    completed: 0,
    overdue: 0,
    pending: 0,
  });

  const [tailorStats, setTailorStats] = useState({
    alterActive: 0,
    stitchActive: 0,
    overdue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);

      try {
        const storeQuery =
          activeStoreId && activeStoreId !== "all"
            ? `?store_id=${encodeURIComponent(activeStoreId)}`
            : "";

        const [dashboardRes, tailorRes] = await Promise.all([
          apiFetch(`/api/dashboard/owner${storeQuery}`),
          apiFetch(`/api/tailor/stats${storeQuery}`),
        ]);

        if (cancelled) return;

        if (dashboardRes?.stats) {
          setStats({
            today: dashboardRes.stats.today || 0,
            completed: dashboardRes.stats.completed || 0,
            overdue: dashboardRes.stats.overdue || 0,
            pending: dashboardRes.stats.pending || 0,
          });
        }

        setTailorStats({
          alterActive: Math.max(
            0,
            (tailorRes?.totalAlterations || 0) -
              (tailorRes?.completedAlterations || 0)
          ),

          stitchActive: Math.max(
            0,
            (tailorRes?.totalPantStitch || 0) -
              (tailorRes?.completedPantStitch || 0)
          ),

          overdue: 0,
        });
      } catch (error) {
        console.error("Dashboard load failed:", error);
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

  return (
    <div className="p-4 space-y-4">

      <div>
        <p className="text-sm text-slate-500">
          {t("welcome")}
        </p>

        <h2 className="text-2xl font-bold text-slate-900">
          {user?.full_name || user?.name || "Staff"}
        </h2>
      </div>

      {!isTailorRole && (
        <div className="grid grid-cols-2 gap-3">

          <StatCard
            icon={CheckSquare}
            label={t("todayTasks")}
            value={loading ? "—" : stats.today}
            color="bg-blue-50 text-blue-700"
          />

          <StatCard
            icon={Clock}
            label={t("pending")}
            value={loading ? "—" : stats.pending}
            color="bg-amber-50 text-amber-700"
          />

          <StatCard
            icon={AlertTriangle}
            label={t("overdue")}
            value={loading ? "—" : stats.overdue}
            color="bg-red-50 text-red-700"
          />

          <StatCard
            icon={CheckCircle2}
            label={t("completed")}
            value={loading ? "—" : stats.completed}
            color="bg-green-50 text-green-700"
          />

        </div>
      )}

      {isTailorRole && (
        <div className="grid grid-cols-2 gap-3">

          <StatCard
            icon={Scissors}
            label={t("alterations")}
            value={loading ? "—" : tailorStats.alterActive}
            color="bg-purple-50 text-purple-700"
          />

          <StatCard
            icon={Scissors}
            label={t("pantStitching")}
            value={loading ? "—" : tailorStats.stitchActive}
            color="bg-indigo-50 text-indigo-700"
          />

        </div>
      )}

      <div className="pt-2">

        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Quick Actions
        </h3>

        <div className="grid grid-cols-3 gap-3">

          {can("myTasks") && (
            <QuickLink
              to="/my-tasks"
              icon={CheckSquare}
              label={t("myTasks")}
            />
          )}

          {can("tasks") && (
            <QuickLink
              to="/tasks"
              icon={CheckSquare}
              label={t("tasks")}
            />
          )}

          {can("reports") && (
            <QuickLink
              to="/reports"
              icon={TrendingUp}
              label={t("reports")}
            />
          )}

          {can("sheets") && (
            <QuickLink
              to="/sheets"
              icon={FileSpreadsheet}
              label={t("sheets")}
            />
          )}

          {can("tailor") && (
            <QuickLink
              to="/tailor"
              icon={Scissors}
              label={t("tailor")}
            />
          )}

          {["owner", "mis", "manager"].includes(role) && (
            <QuickLink
              to="/task-admin"
              icon={ListChecks}
              label="Task Admin"
            />
          )}

        </div>
      </div>

    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">

      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-2`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <p className="text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="text-xs text-slate-500">
        {label}
      </p>

    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}) {
  return (
    <a
      href={to}
      className="flex flex-col items-center gap-1.5 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm hover:border-slate-300 transition-colors"
    >

      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
        <Icon className="w-5 h-5" />
      </div>

      <span className="text-[11px] font-medium text-slate-600 text-center leading-tight">
        {label}
      </span>

    </a>
  );
}