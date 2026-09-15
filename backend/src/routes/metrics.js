const express = require('express');
const router = express.Router();
const fs = require('fs');
const v8 = require('v8');
const os = require('os');

// Helper to read cgroup memory stats safely
function getCgroupMemory() {
  const result = {
    cgroupVersion: null,
    limitBytes: null,
    currentUsageBytes: null,
  };

  try {
    // Check cgroup v2 (Linux 5.x+, Docker modern)
    if (fs.existsSync('/sys/fs/cgroup/memory.current')) {
      result.cgroupVersion = 'v2';
      result.currentUsageBytes = parseInt(fs.readFileSync('/sys/fs/cgroup/memory.current', 'utf8').trim(), 10);
      const maxVal = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      result.limitBytes = maxVal === 'max' ? os.totalmem() : parseInt(maxVal, 10);
    } 
    // Check cgroup v1
    else if (fs.existsSync('/sys/fs/cgroup/memory/memory.usage_in_bytes')) {
      result.cgroupVersion = 'v1';
      result.currentUsageBytes = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'utf8').trim(), 10);
      result.limitBytes = parseInt(fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8').trim(), 10);
    }
  } catch (err) {
    // If running on macOS or unprivileged container
    result.error = err.message;
  }

  return result;
}

// GET /api/metrics - Real-time Node.js process and container memory metrics
router.get('/', (req, res) => {
  const mem = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  const cgroup = getCgroupMemory();

  const toMB = (bytes) => (bytes ? (bytes / (1024 * 1024)).toFixed(2) : null);

  res.json({
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    process: {
      rssBytes: mem.rss,
      rssMB: toMB(mem.rss),
      heapTotalBytes: mem.heapTotal,
      heapTotalMB: toMB(mem.heapTotal),
      heapUsedBytes: mem.heapUsed,
      heapUsedMB: toMB(mem.heapUsed),
      externalBytes: mem.external,
      externalMB: toMB(mem.external),
      arrayBuffersBytes: mem.arrayBuffers,
      arrayBuffersMB: toMB(mem.arrayBuffers),
    },
    v8Heap: {
      heapSizeLimitBytes: heapStats.heap_size_limit,
      heapSizeLimitMB: toMB(heapStats.heap_size_limit),
      usedHeapSizeBytes: heapStats.used_heap_size,
      usedHeapSizeMB: toMB(heapStats.used_heap_size),
    },
    containerCgroup: {
      version: cgroup.cgroupVersion,
      usageBytes: cgroup.currentUsageBytes,
      usageMB: toMB(cgroup.currentUsageBytes),
      limitBytes: cgroup.limitBytes,
      limitMB: toMB(cgroup.limitBytes),
    },
    system: {
      totalMemMB: toMB(os.totalmem()),
      freeMemMB: toMB(os.freemem()),
      loadAvg: os.loadavg(),
    },
  });
});

module.exports = router;
