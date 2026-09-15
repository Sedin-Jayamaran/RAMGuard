const express = require('express');
const router = express.Router();

// Memory store to intentionally hold references and simulate bloat/leaks
let retainedBuffers = [];
let leakIntervalTimer = null;
let leakRateMB = 0;
let leakIntervalMs = 0;

// Helper to allocate buffer memory
function allocateMB(megabytes) {
  const bytes = megabytes * 1024 * 1024;
  // Use Buffer.alloc(bytes, 1) so physical pages are committed in Linux RAM (RSS), not just virtual address space
  const buf = Buffer.alloc(bytes, 1);
  retainedBuffers.push(buf);
  return buf.length;
}

// GET /api/stress/status - Status of simulated bloat
router.get('/status', (req, res) => {
  const totalAllocatedBytes = retainedBuffers.reduce((acc, b) => acc + b.length, 0);
  res.json({
    activeAllocationsCount: retainedBuffers.length,
    allocatedMB: (totalAllocatedBytes / (1024 * 1024)).toFixed(2),
    isContinuousLeakRunning: !!leakIntervalTimer,
    leakRateMBPerTick: leakRateMB,
    leakIntervalMs: leakIntervalMs,
  });
});

// POST /api/stress/allocate - Allocate a specific amount of RAM (one-off spike or step increase)
router.post('/allocate', (req, res) => {
  const mb = parseInt(req.body.mb || 100, 10);
  if (isNaN(mb) || mb <= 0 || mb > 4096) {
    return res.status(400).json({ error: 'Please specify an allocation amount between 1 and 4096 MB.' });
  }

  try {
    allocateMB(mb);
    const totalAllocatedBytes = retainedBuffers.reduce((acc, b) => acc + b.length, 0);
    res.json({
      success: true,
      message: `Allocated ${mb} MB into memory buffer retention`,
      totalAllocatedMB: (totalAllocatedBytes / (1024 * 1024)).toFixed(2),
      bufferChunksCount: retainedBuffers.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Allocation failed: ${err.message}` });
  }
});

// POST /api/stress/leak-start - Start a continuous leak (simulates gradual bloat over time)
router.post('/leak-start', (req, res) => {
  const mbPerTick = parseInt(req.body.mbPerTick || 25, 10);
  const intervalMs = parseInt(req.body.intervalMs || 3000, 10);

  if (leakIntervalTimer) {
    clearInterval(leakIntervalTimer);
  }

  leakRateMB = mbPerTick;
  leakIntervalMs = intervalMs;

  leakIntervalTimer = setInterval(() => {
    try {
      allocateMB(leakRateMB);
      const totalMB = (retainedBuffers.reduce((acc, b) => acc + b.length, 0) / (1024 * 1024)).toFixed(2);
      console.log(`[RAMGuard Simulator] Leaked +${leakRateMB} MB (Total retained: ${totalMB} MB)`);
    } catch (err) {
      console.error('[RAMGuard Simulator] Out of memory allocating chunk:', err.message);
      clearInterval(leakIntervalTimer);
      leakIntervalTimer = null;
    }
  }, leakIntervalMs);

  res.json({
    success: true,
    message: `Started continuous memory leak (+${mbPerTick} MB every ${intervalMs} ms)`,
    leakRateMB,
    leakIntervalMs,
  });
});

// POST /api/stress/leak-stop - Stop the continuous leak timer
router.post('/leak-stop', (req, res) => {
  if (leakIntervalTimer) {
    clearInterval(leakIntervalTimer);
    leakIntervalTimer = null;
  }
  res.json({ success: true, message: 'Continuous memory leak stopped' });
});

// POST /api/stress/reset - Free all retained buffers and invoke garbage collector
router.post('/reset', (req, res) => {
  if (leakIntervalTimer) {
    clearInterval(leakIntervalTimer);
    leakIntervalTimer = null;
  }

  const chunksCount = retainedBuffers.length;
  retainedBuffers = []; // Drop references

  let gcInvoked = false;
  if (global.gc) {
    global.gc();
    gcInvoked = true;
  }

  res.json({
    success: true,
    message: `Released ${chunksCount} memory buffers. Garbage collector invoked: ${gcInvoked}`,
    gcAvailable: !!global.gc,
  });
});

module.exports = router;
