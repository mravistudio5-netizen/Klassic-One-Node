import React, { useState, useEffect } from "react";
import { apiFetch } from "@/api";
import {
  UserPlus,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultMatrixForRole,
  modulesFromMatrix,
} from "@/lib/permissions";
import { clearPermissionsCache } from "@/hooks/usePermissions";
import PermissionMatrixEditor from "@/components/admin/PermissionMatrixEditor";

const ROLE_OPTIONS = [
  "admin",
  "mis",
  "manager",
  "tailoring_manager",
  "tailoring_operator",
];

export default function UserInviteForm({ onInvited }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("manager");

  const [matrix, setMatrix] = useState(() =>
    defaultMatrixForRole("manager")
  );

  const [showMatrix, setShowMatrix] = useState(false);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadRolePermissions = async () => {
      setLoadingMatrix(true);

      try {
        const res = await apiFetch(
          `/api/permissions/roles/${role}`
        );

        const permission = res?.item;

        const savedMatrix =
          permission?.matrix &&
          Object.keys(permission.matrix).length
            ? permission.matrix
            : defaultMatrixForRole(role);

        if (alive) {
          setMatrix(savedMatrix);
        }
      } catch (error) {
        console.error(
          "Failed to load role permissions:",
          error
        );

        if (alive) {
          setMatrix(defaultMatrixForRole(role));
        }
      } finally {
        if (alive) {
          setLoadingMatrix(false);
        }
      }
    };

    loadRolePermissions();

    return () => {
      alive = false;
    };
  }, [role]);

  const toggle = (modKey, action) => {
    setMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev));

      if (!next[modKey]) {
        next[modKey] = {};
      }

      next[modKey][action] =
        !next[modKey][action];

      return next;
    });
  };

  const saveMatrix = async () => {
    const modules = modulesFromMatrix(matrix) || [];

    const res = await apiFetch(
      `/api/permissions/roles/${role}`,
      {
        method: "PUT",
        body: JSON.stringify({
          matrix,
          modules,
          can_assign_cross_department: false,
        }),
      }
    );

    clearPermissionsCache();

    return res?.item;
  };

  const sendInvite = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail) {
      toast.error("Email required");
      return;
    }

    setInviting(true);

    try {
      // Save the permission matrix for this role.
      await saveMatrix();

      // Create the user in MongoDB.
      // Backend creates a temporary password if one isn't supplied.
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
          role,
        }),
      });

      toast.success(
        `User created: ${cleanEmail}`
      );

      if (res?.temporaryPassword) {
        toast.info(
          `Temporary password: ${res.temporaryPassword}`,
          {
            duration: 10000,
          }
        );

        // Also show it in console for development.
        console.log(
          "Temporary password:",
          res.temporaryPassword
        );
      }

      setEmail("");
      setName("");
      setShowMatrix(false);

      onInvited?.();
    } catch (error) {
      console.error(
        "Create user failed:",
        error
      );

      toast.error(
        "Invite failed: " +
          (error.message || "Unknown error")
      );
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <UserPlus className="w-4 h-4" />
        Invite User
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
        placeholder="Full name"
        className="input"
      />

      <input
        type="email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        placeholder="email@example.com"
        className="input"
      />

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
          Role
        </label>

        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value)
          }
          className="input flex-1"
        >
          {ROLE_OPTIONS.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowMatrix((value) => !value)
        }
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100"
      >
        <span>
          Set permission matrix for this role
        </span>

        {showMatrix ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {showMatrix &&
        (loadingMatrix ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <PermissionMatrixEditor
            matrix={matrix}
            onToggle={toggle}
            disabled={inviting}
          />
        ))}

      <button
        onClick={sendInvite}
        disabled={inviting}
        className="w-full bg-slate-900 text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {inviting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Send Invite
          </>
        )}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        The user will be created with the selected
        role and permissions.
      </p>
    </div>
  );
}