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



const COMPLETED_STATUSES = [

  "done",

  "completed",

  "approved",

  "closed",

  "cancelled",

  "rejected",

];



const normalizeStatus = (status) =>

  String(status || "")

    .trim()

    .toLowerCase()

    .replace(/[\s\_-]+/g, "");



const getTaskDate = (task, ...keys) => {

  for (const key of keys) {

    if (task?.[key]) return task[key];

  }

  return null;

};



const isValidDate = (value) => {

  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());

};



const isToday = (value) => {

  if (!isValidDate(value)) return false;



  const date = new Date(value);

  const now = new Date();



  return (

    date.getFullYear() === now.getFullYear() &&

    date.getMonth() === now.getMonth() &&

    date.getDate() === now.getDate()

  );

};



export default function Home() {

  const { user, activeStoreId } = useOutletContext();

  const { t } = useLang();



  const rawRole = user?.role || "manager";



  const isAdminRole = [

  "owner",

  "admin",

  "hr",

  "human_resources",

].includes(rawRole);



  const role =

    rawRole === "admin"

      ? "owner"

      : rawRole;



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

        const [dashboardResponse, tailorResponse] =
          await Promise.all([
            apiFetch(`/api/dashboard/stats${storeQuery}`),
            apiFetch(`/api/tailor/stats${storeQuery}`),
          ]);

        if (cancelled) return;

        const dashboardStats =
          dashboardResponse?.stats || {};

        setStats({
          today: Number(dashboardStats.today || 0),
          pending: Number(dashboardStats.pending || 0),
          overdue: Number(dashboardStats.overdue || 0),
          completed: Number(dashboardStats.completed || 0),
        });

        setTailorStats({
          alterActive: Math.max(
            0,
            Number(tailorResponse?.totalAlterations || 0) -
              Number(tailorResponse?.completedAlterations || 0)
          ),

          stitchActive: Math.max(
            0,
            Number(tailorResponse?.totalPantStitch || 0) -
              Number(tailorResponse?.completedPantStitch || 0)
          ),

          overdue: 0,
        });
      } catch (error) {
        console.error(
          "Dashboard load failed:",
          error
        );

        if (!cancelled) {
          setStats({
            today: 0,
            pending: 0,
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



  return (

    <div className="p-4 space-y-4">



      {/\* Welcome \*/}

      <div>

        <p className="text-sm text-slate-500">

          {t("welcome")}

        </p>



        <h2 className="text-2xl font-bold text-slate-900">

          {user?.full_name ||

            user?.name ||

            "Staff"}

        </h2>

      </div>



      {/\* Normal task dashboard \*/}

      {!isTailorRole && (

        <div className="grid grid-cols-2 gap-3">



          <StatCard

            icon={CheckSquare}

            label={t("todayTasks")}

            value={

              loading

                ? "—"

                : stats.today

            }

            color="bg-blue-50 text-blue-700"

          />



          <StatCard

            icon={Clock}

            label={t("pending")}

            value={

              loading

                ? "—"

                : stats.pending

            }

            color="bg-amber-50 text-amber-700"

          />



          <StatCard

            icon={AlertTriangle}

            label={t("overdue")}

            value={

              loading

                ? "—"

                : stats.overdue

            }

            color="bg-red-50 text-red-700"

          />



          <StatCard

            icon={CheckCircle2}

            label={t("completed")}

            value={

              loading

                ? "—"

                : stats.completed

            }

            color="bg-green-50 text-green-700"

          />



        </div>

      )}



      {/\* Tailor dashboard \*/}

      {isTailorRole && (

        <div className="grid grid-cols-2 gap-3">



          <StatCard

            icon={Scissors}

            label={t("alterations")}

            value={

              loading

                ? "—"

                : tailorStats.alterActive

            }

            color="bg-purple-50 text-purple-700"

          />



          <StatCard

            icon={Scissors}

            label={t("pantStitching")}

            value={

              loading

                ? "—"

                : tailorStats.stitchActive

            }

            color="bg-indigo-50 text-indigo-700"

          />



        </div>

      )}



      {/* Quick Actions — OWNER / ADMIN ONLY */}

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



function QuickActionCard({

  to,

  icon: Icon,

  label,

}) {

  return (

    <Link

      to={to}

      className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer min-h-[86px] flex flex-col items-center justify-center text-center"

    >

      <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 group-hover:bg-slate-100 flex items-center justify-center mb-2 transition-colors">

        <Icon className="w-5 h-5" />

      </div>



      <p className="text-xs font-medium text-slate-700">

        {label}

      </p>

    </Link>

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
