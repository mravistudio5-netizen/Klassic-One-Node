import React, { useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api";

export default function SheetExport() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setResult(null);

    try {
      const res = await apiFetch(
        "/api/reports/daily-sheet-export",
        {
          method: "POST",
        }
      );

      setResult(res);

      toast.success(
        `Exported ${
          res?.managers || 0
        } manager row(s)`
      );
    } catch (error) {
      console.error(
        "Daily sheet export error:",
        error
      );

      toast.error(
        "Export failed: " +
          (error?.message || "error")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-green-700" />

          Google Sheets Daily Export
        </h3>

        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Export today's manager task and
          checklist performance data to
          Google Sheets.
        </p>

        <button
          onClick={run}
          disabled={busy}
          className="mt-3 w-full bg-slate-900 text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export today to Google Sheets
            </>
          )}
        </button>

        {result && (
          <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />

            <div className="text-xs text-green-800">
              <p>
                {result.managers || 0} manager
                row(s) written for{" "}
                {result.date || "today"}.
              </p>

              {result.sheetUrl && (
                <a
                  href={result.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline mt-1"
                >
                  Open the sheet

                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}