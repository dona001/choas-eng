'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Item {
  id?: number;
  name: string;
  value: number;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 8000); // Increased for testing visibility
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      showToast('Failed to fetch items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value: Number(value) }),
      });

      if (!res.ok) throw new Error(`Chaos Detected: ${res.status}`);

      showToast('Item created successfully!', 'success');
      setName('');
      setValue('');

      // Delay sync slightly to allow users (and chaos tests) to see the success state
      setTimeout(() => fetchItems(), 1000);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2"
          >
            Chaos Control Center
          </motion.h1>
          <p className="text-slate-400">Principal Level Full-Stack Monitoring</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatusCard title="Backend API" status={error ? 'degraded' : 'operational'} testId="api-card" />
          <StatusCard title="DB Connection" status={submitting ? 'busy' : 'stable'} testId="db-card" />
          <StatusCard title="Cache Layer" status="operational" testId="cache-card" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ACTION SECTION */}
          <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full" />
              Trigger Chaos Action
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Resilience Test"
                  id="item-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Impact Value</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0 - 100"
                  id="item-value"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${submitting
                  ? 'bg-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-95'
                  }`}
                id="submit-btn"
              >
                {submitting ? 'Processing Submission...' : 'Commit to Database'}
              </button>
            </form>
          </section>

          {/* LIST SECTION */}
          <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[500px] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Registry</h2>
              <button
                onClick={fetchItems}
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-3" data-testid="items-container">
              {loading ? (
                Array(3).fill(0).map((_, i) => <ItemSkeleton key={i} />)
              ) : items.length === 0 ? (
                <p className="text-slate-500 text-center py-10">No records found.</p>
              ) : (
                items.map((item, idx) => (
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    key={idx}
                    className="flex justify-between items-center bg-slate-800/40 p-4 rounded-2xl border border-white/5"
                  >
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-slate-500">ID: {item.id || 'N/A'}</div>
                    </div>
                    <div className="text-emerald-400 font-mono">+{item.value}</div>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'
              }`}
            data-testid="toast-msg"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({ title, status, testId }: { title: string; status: string; testId: string }) {
  const configs = {
    operational: { color: 'bg-emerald-500', text: 'Operational' },
    stable: { color: 'bg-emerald-500', text: 'Stable' },
    degraded: { color: 'bg-yellow-500', text: 'Degraded' },
    busy: { color: 'bg-blue-500 animate-spin', text: 'Syncing...' },
  };
  const config = configs[status as keyof typeof configs] || configs.operational;

  return (
    <div data-testid={testId} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="font-medium text-lg">{config.text}</span>
      </div>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div data-testid="skeleton-loader" className="animate-pulse flex justify-between bg-slate-800/40 p-4 rounded-2xl border border-white/5">
      <div className="space-y-2 w-full">
        <div className="h-4 bg-slate-700 rounded w-1/2" />
        <div className="h-2 bg-slate-700 rounded w-1/4" />
      </div>
    </div>
  );
}
