import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import TaskList from "@/components/TaskList";
import { apiFetch } from "@/api";

export default function AllTasks() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    apiFetch("/api/auth/me")
      .then((response) => {
        if (!alive) return;
        setUser(response?.user || response);
      })
      .catch((error) => {
        console.error("Failed to load user:", error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  const role = user?.role;

  // All Tasks is ONLY for Owner, Admin and MIS
  if (!["owner", "admin", "mis"].includes(role)) {
    return <Navigate to="/my-tasks" replace />;
  }

  return <TaskList scope="all" />;
}