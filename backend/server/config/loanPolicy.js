const adminConfigService = require("../services/adminConfigService");

function envOverrideInt(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

function envOverrideNumber(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/**
 * 合并「管理员在库中配置」与可选环境变量覆盖（回归测试可在 require app 前设置 LOAN_*）。
 */
async function getLoanPolicy() {
  const db = await adminConfigService.getConfig();
  return {
    maxBooks: envOverrideInt("LOAN_MAX_BOOKS") ?? db.maxBooks,
    maxDays: envOverrideInt("LOAN_MAX_DAYS") ?? db.maxDays,
    fineRate: envOverrideNumber("LOAN_FINE_RATE") ?? db.fineRate,
  };
}

module.exports = {
  getLoanPolicy,
};
