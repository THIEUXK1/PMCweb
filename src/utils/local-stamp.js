/** Date → 'YYYY-MM-DD HH:mm:ss' theo giờ địa phương (khớp SYSDATETIME() của SQL Server cùng múi giờ). */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

module.exports = { localStamp };
