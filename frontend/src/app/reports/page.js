"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      const token = Cookies.get("token");
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/api/reports`, { headers });
        setReports(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDownload = (reportType, reportId, fileFormat) => {
    const url = `${API_BASE}/api/reports/${reportType}/${reportId}/export/${fileFormat}`;
    window.open(url, "_blank");
  };

  const filteredReports = reports.filter((r) => {
    if (selectedFilter === "all") return true;
    return r.type === selectedFilter;
  });

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              Audit Registry
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Formal PDF & Excel Reports
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            Official Performance Reports & Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Download verified PDF scorecards, telemetry records, and Excel spreadsheets for institutional debate tracking.
          </p>
        </div>

        {/* FILTER PILLS */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-max self-start md:self-center">
          {["all", "debate", "presentation"].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setSelectedFilter(filterKey)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                selectedFilter === filterKey
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {filterKey === "all" ? "All Archives" : `${filterKey}s`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center text-slate-500 font-semibold border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Fetching institutional report archives...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center text-slate-500 font-semibold border border-slate-200 dark:border-slate-800 shadow-sm">
          No records found matching criteria. Complete a debate or presentation to generate one!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all card-glow"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                    {report.type?.toUpperCase()} AUDIT
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(report.date).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2.5 line-clamp-2">
                  {report.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Format: <strong className="text-slate-700 dark:text-slate-300">{report.format || "Structured"}</strong> • Status: Verified
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Performance Score</span>
                  <strong className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{report.score}%</strong>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(report.type, report.reference_id || 1, "pdf")}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>📄</span> PDF
                  </button>
                  <button
                    onClick={() => handleDownload(report.type, report.reference_id || 1, "excel")}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>📊</span> Excel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
