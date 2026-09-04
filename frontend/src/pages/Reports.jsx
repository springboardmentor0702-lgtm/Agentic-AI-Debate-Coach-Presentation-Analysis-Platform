import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, FileSpreadsheet, Database, FileDown } from "lucide-react";
import Spinner from "../components/Spinner";
import { downloadFile } from "../lib/downloadFile";
import GlassCard from "../components/ui/GlassCard";

function ReportCard({ icon: Icon, title, description, loading, onClick, actionLabel }) {
  return (
    <GlassCard as="button" hover onClick={onClick} disabled={loading} className="p-6 text-left">
      <Icon size={22} className="text-accent mb-4" strokeWidth={1.75} />
      <h3 className="font-display text-lg mb-2">{title}</h3>
      <p className="text-sm text-faint leading-relaxed mb-4">{description}</p>
      <span className="font-mono text-xs uppercase tracking-wide text-accent inline-flex items-center gap-2">
        {loading ? (
          <>
            <Spinner size={12} /> Generating...
          </>
        ) : (
          actionLabel
        )}
      </span>
    </GlassCard>
  );
}

export default function Reports() {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError] = useState(null);

  const handlePdf = async () => {
    setError(null);
    setLoadingPdf(true);
    try {
      await downloadFile("/reports/progress/pdf", "progress-report.pdf");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate the PDF report.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExcel = async () => {
    setError(null);
    setLoadingExcel(true);
    try {
      await downloadFile("/reports/progress/excel", "progress-report.xlsx");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate the Excel report.");
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleExport = async () => {
    setError(null);
    setLoadingExport(true);
    try {
      await downloadFile("/export/me", "my-clashlab-data.json");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate your data export.");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="rounded-xl bg-accent-soft p-2.5">
          <FileDown size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Take it with you.</h1>
      </motion.div>
      <p className="text-faint mb-10">
        A full snapshot of your performance, history, and coaching — as a document you
        can keep, print, or share.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl">
        <ReportCard
          icon={FileText}
          title="PDF Report"
          description="Performance score, component breakdown, latest coaching summary, and recent activity — formatted to read or print."
          loading={loadingPdf}
          onClick={handlePdf}
          actionLabel="Download PDF"
        />
        <ReportCard
          icon={FileSpreadsheet}
          title="Excel Workbook"
          description="Every tool's full history as raw data, one sheet per tool — for your own analysis or record-keeping."
          loading={loadingExcel}
          onClick={handleExcel}
          actionLabel="Download Excel"
        />
        <ReportCard
          icon={Database}
          title="Full Data Export"
          description="Every row you own across every table, as raw JSON — including both sides of any human-vs-human debate. For backup, portability, or your own tooling."
          loading={loadingExport}
          onClick={handleExport}
          actionLabel="Download JSON"
        />
      </div>

      {error && <p className="text-sm text-danger mt-6">{error}</p>}
    </div>
  );
}
