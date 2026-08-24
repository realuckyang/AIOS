import os from "node:os";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";

const exec = promisify(execCb);

// 取两次 os.cpus() 的 idle/total 差值算 CPU 使用率,默认 100ms 采样间隔.
const sampleCpu = () => {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const c of cpus) {
    const t = c.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total, count: cpus.length };
};

const cpuUsage = async () => {
  const a = sampleCpu();
  await new Promise((r) => setTimeout(r, 100));
  const b = sampleCpu();
  const dIdle = b.idle - a.idle;
  const dTotal = b.total - a.total;
  const usage = dTotal > 0 ? 1 - dIdle / dTotal : 0;
  return {
    usage: Math.max(0, Math.min(1, usage)),
    cores: a.count,
    model: os.cpus()[0]?.model || "",
    speedMhz: os.cpus()[0]?.speed || 0,
  };
};

const memInfo = () => {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return { total, free, used, usage: total > 0 ? used / total : 0 };
};

const sysInfo = () => ({
  hostname: os.hostname(),
  platform: os.platform(),
  arch: os.arch(),
  release: os.release(),
  uptime: os.uptime(),
  loadavg: os.loadavg(),
  nodeVersion: process.version,
});

const safeExec = async (cmd, opts = {}) => {
  try {
    const { stdout } = await exec(cmd, { timeout: 3000, ...opts });
    return stdout;
  } catch {
    return "";
  }
};

// macOS / Linux 的 df -k 输出大体一致.返回挂载点的容量信息(单位 KB → bytes).
const diskInfo = async () => {
  const stdout = await safeExec("df -kP");
  const lines = stdout.split("\n").filter(Boolean).slice(1);
  const SKIP_PREFIXES = ["devfs", "map ", "tmpfs", "overlay"];
  return lines
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 6)
    .map((parts) => {
      const [filesystem, blocks, used, available, capacity, ...rest] = parts;
      const mountPoint = rest.join(" ");
      const total = Number(blocks) * 1024;
      const usedBytes = Number(used) * 1024;
      const availBytes = Number(available) * 1024;
      return {
        filesystem,
        mountPoint,
        total,
        used: usedBytes,
        available: availBytes,
        capacity: Number(capacity.replace("%", "")) / 100,
      };
    })
    .filter((d) =>
      d.total > 0 && !SKIP_PREFIXES.some((p) => d.filesystem.startsWith(p))
    );
};

// 跨平台的 top processes:macOS / Linux 都有 ps,字段顺序保持一致.
const topProcesses = async (limit = 20) => {
  const stdout = await safeExec(
    `ps -axco pid,user,pcpu,pmem,comm 2>/dev/null || ps -axo pid,user,pcpu,pmem,comm`,
    { shell: "/bin/sh" }
  );
  const lines = stdout.split("\n").filter(Boolean).slice(1);
  const rows = lines.map((line) => {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (!m) return null;
    return {
      pid: Number(m[1]),
      user: m[2],
      cpu: Number(m[3]),
      mem: Number(m[4]),
      command: m[5],
    };
  }).filter(Boolean);
  rows.sort((a, b) => b.cpu - a.cpu);
  return rows.slice(0, limit);
};

const snapshot = async () => {
  const [cpu, disk, processes] = await Promise.all([
    cpuUsage(),
    diskInfo(),
    topProcesses(),
  ]);
  return {
    success: true,
    sys: sysInfo(),
    cpu,
    mem: memInfo(),
    disk,
    processes,
    sampledAt: Date.now(),
  };
};

export { snapshot };
