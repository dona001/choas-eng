export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Chaos Engineering Dashboard
          </h1>
          <p className="text-slate-300 text-lg">Real-time resilience monitoring</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatusCard
            title="System Health"
            status="operational"
            testId="health-card"
          />
          <StatusCard
            title="API Status"
            status="loading"
            testId="api-card"
          />
          <StatusCard
            title="Database"
            status="degraded"
            testId="db-card"
          />
        </div>

        <div className="mt-12">
          <ItemsList />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, status, testId }: { title: string; status: string; testId: string }) {
  const statusColors = {
    operational: 'bg-green-500/20 border-green-500',
    degraded: 'bg-yellow-500/20 border-yellow-500',
    loading: 'bg-blue-500/20 border-blue-500',
    error: 'bg-red-500/20 border-red-500',
  };

  return (
    <div
      data-testid={testId}
      className={`backdrop-blur-lg ${statusColors[status as keyof typeof statusColors]} border-2 rounded-2xl p-6 shadow-2xl`}
    >
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${status === 'operational' ? 'bg-green-500' : status === 'loading' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-slate-300 capitalize">{status}</span>
      </div>
    </div>
  );
}

function ItemsList() {
  return (
    <div className="backdrop-blur-lg bg-white/10 border-2 border-purple-500/30 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-3xl font-bold text-white mb-6">Items</h2>
      <div data-testid="items-container" className="space-y-4">
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
      </div>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div data-testid="skeleton-loader" className="animate-pulse flex items-center gap-4 bg-slate-800/50 p-4 rounded-lg">
      <div className="w-12 h-12 bg-slate-700 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}
