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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              Module 13 • Reports & Export Intelligence
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Performance Reports & Archive
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Download official PDF reports and Excel analytics exports for debate simulations and presentation reviews.
            </p>
          </div>

          {/* FILTER PILLS */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {["all", "debate", "presentation"].map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setSelectedFilter(filterKey)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                  selectedFilter === filterKey
                    ? "bg-white text-indigo-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {filterKey === "all" ? "All Reports" : `${filterKey} Reports`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 font-medium border border-slate-200">
            Loading verified report registry...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 font-medium border border-slate-200">
            No reports found matching criteria. Complete a debate or presentation to generate one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                      {report.type?.toUpperCase()} REPORT
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(report.date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-2">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Format: {report.format || "Structured"} • Status: Verified
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Score</span>
                    <strong className="text-2xl font-black text-indigo-600">{report.score}%</strong>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(report.type, report.reference_id || 1, "pdf")}
                      className="bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>📄</span> Export PDF
                    </button>
                    <button
                      onClick={() => handleDownload(report.type, report.reference_id || 1, "excel")}
                      className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>📊</span> Excel / CSV
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
