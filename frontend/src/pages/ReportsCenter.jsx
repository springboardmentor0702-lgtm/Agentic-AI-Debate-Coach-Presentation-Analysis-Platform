import React, { useState } from 'react';
import { api } from '../services/api';
import { 
  FileText, Download, FileSpreadsheet, CheckCircle2, 
  Sparkles, Clock, Award, ShieldAlert, ArrowUpRight
} from 'lucide-react';

export default function ReportsCenter() {
  const [reportType, setReportType] = useState("debate");
  const [format, setFormat] = useState("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [recentExports, setRecentExports] = useState([
    { title: "Debate_Report_1_Official.pdf", type: "Debate Performance", format: "PDF", date: "Today" },
    { title: "Speech_Audit_Keynote.pdf", type: "Presentation Analysis", format: "PDF", date: "Yesterday" },
    { title: "Classroom_Cohort_Standings.csv", type: "Classroom Cohort", format: "CSV", date: "Sep 03" }
  ]);

  const handleGenerateReport = async () => {
    setIsExporting(true);
    try {
      const res = await api.exportReport(reportType, null, format);
      const newExport = {
        title: res.filename,
        type: reportType === "debate" ? "Debate Performance" : (reportType === "presentation" ? "Presentation Audit" : "Class Progress"),
        format: format.toUpperCase(),
        date: "Just now",
        url: api.getDownloadUrl(res.filename)
      };
      setRecentExports(prev => [newExport, ...prev]);
      window.open(newExport.url, "_blank");
    } catch (err) {
      alert("Report generation failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            Reports & Export Center
          </span>
          <span className="text-xs text-slate-400 font-mono">PDF & Spreadsheet Compiler</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Performance Dossiers & Data Exports
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Compile accredited PDF adjudication reports, speech delivery metrics, or spreadsheet datasets for tournament or classroom evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Export Generator Box */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Configure Performance Dossier</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Report Category</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "debate", label: "Debate Match", desc: "Weighted scorecard & warrants" },
                  { id: "presentation", label: "Speech Audit", desc: "WPM, fillers, prosody" },
                  { id: "progress", label: "Class Progress", desc: "Cohort learning trends" },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportType(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reportType === item.id 
                        ? "bg-blue-600/20 border-blue-500 text-white" 
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Output Format</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "pdf", label: "PDF Document", icon: FileText, ext: ".pdf" },
                  { id: "csv", label: "CSV File", icon: FileSpreadsheet, ext: ".csv" },
                  { id: "excel", label: "Excel Workbook", icon: FileSpreadsheet, ext: ".xlsx" },
                ].map(fmt => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id)}
                      className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        format === fmt.id 
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" 
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-bold text-xs">{fmt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong className="text-white block mb-1">Document Inclusions:</strong>
              PDF files include institutional letterhead formatting, official 5-metric weighted score table, speaker attribution, and adjudicator feedback.
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isExporting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating & Compiling..." : "Compile & Download Report"}</span>
            </button>
          </div>
        </div>

        {/* Export History & Recent Documents */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recently Compiled Dossiers</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Secure Archives</span>
          </div>

          <div className="space-y-3">
            {recentExports.map((doc, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                    {doc.format}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{doc.title}</div>
                    <div className="text-[11px] text-slate-400">{doc.type} • {doc.date}</div>
                  </div>
                </div>

                <a
                  href={doc.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
