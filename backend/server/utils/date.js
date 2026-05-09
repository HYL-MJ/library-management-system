function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateTime(input) {
  const date = new Date(input);

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(" ");
}

function addDays(input, days) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(dateInput) {
  const d = new Date(dateInput);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * 逾期天数：按 UTC 日历日差（归还日日期 − 应还日日期），与「自然日」口径一致，避免
 * ceil(毫秒差/86400000) 在刚过整倍数天时多算一天。
 */
function overdueWholeDays(dueDate, returnDate) {
  const dueDay = utcMidnight(dueDate);
  const retDay = utcMidnight(returnDate);
  if (retDay <= dueDay) return 0;
  return Math.floor((retDay - dueDay) / MS_PER_DAY);
}

module.exports = {
  formatDateTime,
  addDays,
  overdueWholeDays,
};
