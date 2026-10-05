import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  defaultMatrixForRole,
  migrateModules,
  modulesFromMatrix,
  can as canFn,
} from "@/lib/permissions";

let cache = null;

export function usePermissions() {
  const [state, setState] = useState(
    cache || {
      matrix: null,
      modules: null,
      loading: true,
    }
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      if (cache) {
        setState(cache);
        return;
      }

      try {
        const me = await apiFetch("/api/auth/me");

        const userRole = me.user?.role || "manager";
        const role =
          userRole === "admin" ? "owner" : userRole;

        const res = await apiFetch(
          `/api/permissions/${userRole}`
        );

        const rp = res.permission;

        let matrix;

        if (
          rp?.matrix &&
          Object.keys(rp.matrix).length
        ) {
          matrix = rp.matrix;
        } else if (rp?.modules?.length) {
          matrix = migrateModules(rp.modules);
        } else {
          matrix = defaultMatrixForRole(role);
        }

        const modules =
          modulesFromMatrix(matrix) || [];

        const obj = {
          matrix,
          modules,
          loading: false,
        };

        cache = obj;

        if (alive) {
          setState(obj);
        }
      } catch (e) {
        console.error(
          "Permission loading failed:",
          e
        );

        const matrix =
          defaultMatrixForRole("manager");

        const obj = {
          matrix,
          modules: modulesFromMatrix(matrix) || [],
          loading: false,
        };

        cache = obj;

        if (alive) {
          setState(obj);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const can = (moduleKey, action) =>
    canFn(state.matrix, moduleKey, action);

  return {
    ...state,
    can,
  };
}

export function clearPermissionsCache() {
  cache = null;
}