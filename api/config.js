// Hiên Nhà Bun — trả cấu hình CÔNG KHAI của Supabase cho trình duyệt (Vercel Serverless Function).
// Chỉ gồm URL dự án và khóa publishable/anon (vốn được thiết kế để công khai, dữ liệu được bảo vệ bằng RLS).
// Giá trị lấy từ biến môi trường của Vercel nên bản Production và bản Preview có thể dùng dự án khác nhau.
// Tuyệt đối không đặt khóa service_role / sb_secret_ vào các biến này: hàm sẽ từ chối trả về.
function isSecret(key) {
  if (/^sb_secret_/.test(key)) return true;
  const p = String(key).split('.');
  if (p.length !== 3) return false;
  try { return JSON.parse(Buffer.from(p[1], 'base64').toString('utf8')).role === 'service_role'; } catch (e) { return false; }
}

module.exports = (req, res) => {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!url || !key || isSecret(key) || !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/.test(url)) {
    res.statusCode = 200;
    res.end(JSON.stringify({ enabled: false }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ enabled: true, url, key }));
};
