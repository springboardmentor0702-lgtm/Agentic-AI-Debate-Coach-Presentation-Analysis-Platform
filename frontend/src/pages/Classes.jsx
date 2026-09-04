import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, GraduationCap } from "lucide-react";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import GlassField from "../components/ui/GlassField";
import GlassButton from "../components/ui/GlassButton";

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/classes")
      .then((res) => setClasses(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load your classes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/classes", { name: newName });
      setNewName("");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create that class.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, cls) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${cls.name}"? This won't delete the learners, just the class grouping.`)) {
      return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
    try {
      await api.delete(`/classes/${cls.id}`);
    } catch {
      load();
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
          <GraduationCap size={20} className="text-accent" strokeWidth={1.75} />
        </div>
        <h1 className="font-display text-4xl">Your classes.</h1>
      </motion.div>
      <p className="text-faint mb-8">
        Group learners into a class to get a roster, a class-wide trend, and a class
        report scoped to just them — instead of the platform-wide list.
      </p>

      <form onSubmit={handleCreate} className="flex items-center gap-3 mb-10 max-w-lg">
        <GlassField
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New class name (e.g. Period 3, Varsity Team)"
          className="flex-1"
        />
        <GlassButton type="submit" variant="primary" disabled={creating} className="shrink-0">
          {creating ? <Spinner size={14} className="border-surface/40 border-t-surface" /> : "Create"}
        </GlassButton>
      </form>

      {loading && <LoadingBlock />}
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {!loading && classes.length === 0 && (
        <p className="text-sm text-faint">No classes yet — create one above.</p>
      )}

      {!loading && classes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border max-w-lg overflow-hidden"
        >
          {classes.map((c) => (
            <Link
              key={c.id}
              to={`/classes/${c.id}`}
              className="group flex items-center justify-between px-4 py-3 hover:bg-glass-strong transition-colors"
            >
              <div>
                <p className="text-sm">{c.name}</p>
                <p className="font-mono text-xs text-faint uppercase">
                  Created {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, c)}
                aria-label="Delete class"
                className="opacity-0 group-hover:opacity-100 text-faint hover:text-danger transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
