import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shuffle, BookOpen } from "lucide-react";
import { api } from "../lib/api";
import { LoadingBlock } from "../components/Spinner";
import Spinner from "../components/Spinner";
import GlassButton from "../components/ui/GlassButton";

export default function Topics() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [surprising, setSurprising] = useState(false);

  useEffect(() => {
    api
      .get("/topics/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/topics", { params: activeCategory ? { category: activeCategory } : {} })
      .then((res) => setTopics(res.data))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const useTopic = (topic) => {
    navigate(`/debates?suggested_topic=${encodeURIComponent(topic)}`);
  };

  const handleSurpriseMe = async () => {
    setSurprising(true);
    try {
      const res = await api.get("/topics/random", {
        params: activeCategory ? { category: activeCategory } : {},
      });
      useTopic(res.data.topic);
    } catch {
      // no matching topics for this filter - just stay put
    } finally {
      setSurprising(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent-soft p-2.5">
            <BookOpen size={20} className="text-accent" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-display text-4xl mb-1">Pick a fight.</h1>
            <p className="text-faint">Browse debate topics, or let us pick one for you.</p>
          </div>
        </div>
        <GlassButton onClick={handleSurpriseMe} variant="primary" disabled={surprising} className="shrink-0">
          {surprising ? <Spinner size={14} className="border-surface/40 border-t-surface" /> : <Shuffle size={14} />}
          Surprise me
        </GlassButton>
      </motion.div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={`font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
            activeCategory === null
              ? "bg-accent text-surface border-accent"
              : "border-glass-border text-faint hover:border-accent hover:text-accent"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? "bg-accent text-surface border-accent"
                : "border-glass-border text-faint hover:border-accent hover:text-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <LoadingBlock />}

      {!loading && topics.length === 0 && (
        <p className="text-sm text-faint">No topics in this category yet.</p>
      )}

      {!loading && topics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="border border-glass-border rounded-2xl bg-glass backdrop-blur-xl divide-y divide-glass-border overflow-hidden"
        >
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => useTopic(t.topic)}
              className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 hover:bg-glass-strong transition-colors group"
            >
              <span className="text-sm">{t.topic}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-faint border border-glass-border rounded-full px-1.5 py-0.5 shrink-0 group-hover:border-accent group-hover:text-accent transition-colors">
                {t.category}
              </span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
