import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  Activity, 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  RotateCcw, 
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stressStatus, setStressStatus] = useState(null);
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Services');
  const [logs, setLogs] = useState(['Dashboard initialized. Connecting to backend...']);
  const [loading, setLoading] = useState(false);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  // Fetch health and metrics
  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      // Backend not yet ready
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setHealth({ status: 'unreachable', error: err.message });
    }
  };

  const fetchStressStatus = async () => {
    try {
      const res = await fetch('/api/stress/status');
      if (res.ok) {
        const data = await res.json();
        setStressStatus(data);
      }
    } catch (err) {}
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchMetrics();
    fetchStressStatus();
    fetchItems();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchStressStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // CRUD handlers
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName,
          category: newItemCategory,
          description: `Created via Dashboard on ${new Date().toLocaleTimeString()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Item created in PostgreSQL: "${data.data.name}"`);
        setNewItemName('');
        fetchItems();
      }
    } catch (err) {
      addLog(`Error creating item: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addLog(`Item #${id} deleted from PostgreSQL`);
        fetchItems();
      }
    } catch (err) {
      addLog(`Error deleting item: ${err.message}`);
    }
  };

  // Stress simulator handlers
  const handleAllocate = async (mb) => {
    try {
      addLog(`Requesting allocation of +${mb} MB RAM...`);
      const res = await fetch('/api/stress/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mb }),
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Allocated +${mb} MB. Total retained: ${data.totalAllocatedMB} MB`);
        fetchMetrics();
        fetchStressStatus();
      }
    } catch (err) {
      addLog(`Allocation failed: ${err.message}`);
    }
  };

  const handleStartLeak = async () => {
    try {
      addLog('Starting continuous memory leak simulator (+25 MB every 3s)...');
      const res = await fetch('/api/stress/leak-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbPerTick: 25, intervalMs: 3000 }),
      });
      const data = await res.json();
      if (data.success) {
        addLog('Continuous memory leak is now ACTIVE.');
        fetchStressStatus();
      }
    } catch (err) {
      addLog(`Failed to start leak: ${err.message}`);
    }
  };

  const handleStopLeak = async () => {
    try {
      const res = await fetch('/api/stress/leak-stop', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog('Continuous memory leak stopped.');
        fetchStressStatus();
      }
    } catch (err) {
      addLog(`Failed to stop leak: ${err.message}`);
    }
  };

  const handleResetMemory = async () => {
    try {
      addLog('Triggering memory release and Garbage Collector...');
      const res = await fetch('/api/stress/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        addLog(`Memory freed! GC invoked: ${data.gcAvailable}`);
        fetchMetrics();
        fetchStressStatus();
      }
    } catch (err) {
      addLog(`Reset failed: ${err.message}`);
    }
  };

  // RAM percentage calculation for UI bar
  const rssMB = metrics ? parseFloat(metrics.process.rssMB) : 0;
  const limitMB = metrics?.containerCgroup?.limitMB ? parseFloat(metrics.containerCgroup.limitMB) : 2048;
  const usagePercentage = Math.min(100, Math.round((rssMB / limitMB) * 100));

  return (
    <div className="container">
      {/* Top Header */}
      <header>
        <div className="brand">
          <div className="brand-icon">RG</div>
          <div>
            <h1>RAMGuard 3-Tier Suite</h1>
            <p>Presentation (React/Nginx) &bull; App (Node Express) &bull; Data (PostgreSQL)</p>
          </div>
        </div>

        <div className={`status-badge ${health?.status === 'healthy' ? '' : 'error'}`}>
          <div className="status-dot"></div>
          <span>{health?.status === 'healthy' ? 'Cluster Healthy' : 'Backend Connecting'}</span>
        </div>
      </header>

      {/* Realtime Memory Telemetry */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">
          <Activity size={20} color="#3b82f6" />
          Live Container Memory Telemetry
        </div>

        <div className="metric-row">
          <div className="metric-box">
            <div className="metric-label">Process RSS</div>
            <div className="metric-value">{metrics ? `${metrics.process.rssMB} MB` : '--'}</div>
            <div className="metric-subtext">Resident Set (Physical RAM)</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">V8 Heap Used</div>
            <div className="metric-value">{metrics ? `${metrics.process.heapUsedMB} MB` : '--'}</div>
            <div className="metric-subtext">Active JavaScript Objects</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Heap Total</div>
            <div className="metric-value">{metrics ? `${metrics.process.heapTotalMB} MB` : '--'}</div>
            <div className="metric-subtext">V8 Allocated Space</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Retained Bloat</div>
            <div className="metric-value" style={{ color: stressStatus?.allocatedMB > 0 ? '#ef4444' : '#10b981' }}>
              {stressStatus ? `${stressStatus.allocatedMB} MB` : '0 MB'}
            </div>
            <div className="metric-subtext">{stressStatus?.activeAllocationsCount || 0} buffer chunks</div>
          </div>
          <div className="metric-box">
            <div className="metric-label">Cgroup Usage</div>
            <div className="metric-value">
              {metrics?.containerCgroup?.usageMB ? `${metrics.containerCgroup.usageMB} MB` : 'Host OS'}
            </div>
            <div className="metric-subtext">cgroup {metrics?.containerCgroup?.version || 'n/a'}</div>
          </div>
        </div>

        {/* Visual RAM usage bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>Memory Pressure (RSS vs Estimated Limit)</span>
            <span>{usagePercentage}% ({rssMB} MB / {limitMB.toFixed(0)} MB)</span>
          </div>
          <div className="ram-bar-container">
            <div
              className={`ram-bar ${usagePercentage > 75 ? 'warning' : ''}`}
              style={{ width: `${Math.max(5, usagePercentage)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: RAMGuard Bloat Simulator & PostgreSQL Items */}
      <div className="grid-2">
        {/* Memory Bloat Simulation Controls */}
        <div className="card">
          <div className="card-title">
            <AlertTriangle size={20} color="#f59e0b" />
            RAMGuard Memory Bloat Simulator
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Simulate the scenario where containers gradually bloat from 200MB to multiple GBs over time.
          </p>

          <div className="control-panel">
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>Step Allocations:</div>
            <div className="btn-group">
              <button className="btn-secondary" onClick={() => handleAllocate(100)}>+100 MB</button>
              <button className="btn-secondary" onClick={() => handleAllocate(250)}>+250 MB</button>
              <button className="btn-secondary" onClick={() => handleAllocate(500)}>+500 MB</button>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.5rem' }}>
              Continuous Leak Simulation:
            </div>
            <div className="btn-group">
              {!stressStatus?.isContinuousLeakRunning ? (
                <button className="btn-warning" onClick={handleStartLeak}>
                  <Play size={16} /> Start Leak (+25MB/3s)
                </button>
              ) : (
                <button className="btn-danger" onClick={handleStopLeak}>
                  <Square size={16} /> Stop Continuous Leak
                </button>
              )}
              <button className="btn-primary" onClick={handleResetMemory}>
                <RotateCcw size={16} /> Free Memory & GC
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                Activity & Diagnostic Log:
              </div>
              <div className="log-terminal">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Database Items Tier */}
        <div className="card">
          <div className="card-title">
            <Database size={20} color="#10b981" />
            Tier 3: PostgreSQL Records ({items.length})
          </div>

          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="input-row">
            <input
              type="text"
              className="input-flex"
              placeholder="Workload / Item Name..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={loading}
            />
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              disabled={loading}
            >
              <option value="Services">Services</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Messaging">Messaging</option>
              <option value="Compute">Compute</option>
            </select>
            <button type="submit" className="btn-primary" disabled={loading || !newItemName.trim()}>
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Items Table */}
          <div className="table-container" style={{ maxHeight: '330px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No items found in PostgreSQL database.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#{item.id}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td><span className="badge">{item.category}</span></td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', color: '#ef4444' }}
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete from database"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
