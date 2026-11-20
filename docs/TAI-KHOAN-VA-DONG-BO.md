# Hiên Nhà Bun: tài khoản, chế độ khách và đồng bộ nhiều thiết bị

Tài liệu cho nhà phát triển, gồm 4 phần: kết quả rà soát dự án, kiến trúc đã làm, các bước bạn **phải tự cấu hình** (Google Cloud, Supabase, Vercel) và trạng thái kiểm thử.
Tài liệu không chứa khóa hay mật khẩu nào. Đừng dán khóa bí mật vào cuộc trò chuyện, vào mã nguồn hay vào tệp này.

---

## 1. Rà soát dự án (trước khi sửa)

| Mục | Hiện trạng |
|---|---|
| Khung ứng dụng | Web tĩnh, JavaScript thuần (không framework, không bước build). Các tệp `js/*.js` dạng IIFE, dùng chung không gian tên `window.B`. Hình vẽ là SVG sinh bằng mã. |
| Triển khai | Vercel lấy mã trực tiếp từ GitHub (`main`), phục vụ `index.html` ở gốc. Trước đây chưa có `vercel.json` và chưa có hàm máy chủ nào. |
| Supabase / xác thực | Chưa có. |
| localStorage | `hien-nha-bun:v1` là **toàn bộ** trạng thái trò chơi trong một đối tượng JSON (khoảng vài trăm KB), kèm bản dự phòng `hien-nha-bun:v1:backup` được ghi khi sang ngày mới. |
| IndexedDB | Cơ sở dữ liệu `hien-nha-bun` (phiên bản 2) có 2 kho: `photos` chứa ảnh tường ảnh (Blob JPEG) và `audio` chứa nhạc người dùng tự nhập. |
| Thú cưng | `S.bun`: chỉ số, cân nặng, quần áo, bộ đếm, căng thẳng. `S.pets[]`: bạn đồng hành cùng đồ dùng riêng. `S.generations[]`: các thế hệ Bun. |
| Công việc và kế hoạch | `S.tasks[]`, `S.dayPlan`, `S.nextPlan`, `S.plan` (giờ giấc), `S.learn` (học thời lượng), `S.history{}` (tối đa 400 ngày). |
| Xu | `S.coins`, `S.debt`. Mọi thay đổi số xu đều đi qua `B.earn`, `B.spend` và `B.refund` trong `state.js`. `S.ledger[]` là sổ chi tiêu để hiển thị. |
| Đồ đạc và phòng | `S.house`: `owned`, `placed`, `pos` (vị trí kéo thả), `stored`, cấp nhà. `S.pantry` là tủ đồ ăn. |
| Ảnh và nhạc | Danh sách ảnh nằm trong `S.photos[]`, còn ảnh thật nằm trong IndexedDB. Nhạc tự nhập nằm trong IndexedDB `audio`, cấu hình trong `S.audio`. |
| Cài đặt và tiến trình | `S.settings`, `S.audio`, `S.music`, `S.achievements`, `S.memories`, `S.streak`, `S.totals`. |
| Sao lưu | Xuất và nhập tệp JSON (kèm ảnh dạng data URL), có kiểm tra định dạng. |

**Dữ liệu then chốt cần giữ:** toàn bộ `hien-nha-bun:v1` và kho ảnh. Nhạc tự nhập được giữ trên từng máy và không đưa lên mây, vì dung lượng lớn và có thể dính bản quyền.

**Rủi ro khi chuyển sang tài khoản và cách xử lý:**
- **Trạng thái là một khối JSON lớn, logic trò chơi chạy trong trình duyệt.** Giữ nguyên mô hình đó, chia khối thành 11 "phần" và chỉ gửi phần đã đổi.
- **Mô phỏng chạy theo thời gian thực** (`lastTick`). Thiết bị nào mở cũng tự tính tiếp từ bản mới nhất, nên những thay đổi chỉ do thời gian trôi không cần gửi lên.
- **Hai thiết bị cùng sửa.** Mỗi lần lưu có số phiên bản `rev`. Lưu với `rev` cũ sẽ bị từ chối và người dùng được hỏi giữ bản nào.
- **Xu không thể tin hoàn toàn vào trình duyệt.** Dùng sổ xu bất biến trên máy chủ có mã giao dịch duy nhất. Số dư do máy chủ tính.

---

## 2. Kiến trúc đã làm

```
Trình duyệt                                   Supabase (Postgres + Auth + Storage)
───────────                                   ────────────────────────────────────
Cổng chào (js/account.js)                     auth.users  (Google, Email OTP; tự liên kết cùng email)
 ├─ Khách  → localStorage "hien-nha-bun:v1"  (không cần mạng, như cũ)
 └─ Google / Email OTP ──────────────────────▶ phiên đăng nhập do supabase-js tự lưu
Tài khoản → ngăn đệm "hien-nha-bun:acct:<id>" (mở được khi mất mạng)
 js/sync.js: phần đã đổi + giao dịch xu ───▶ rpc save_game(base_rev, sections, events)
                                            ◀─ rev mới + số dư do máy chủ tính
 kiểm tra rev mỗi phút / khi quay lại trang ◀─ game_saves.rev  → tải bản mới nếu máy rảnh tay
 ảnh tường ảnh ─────────────────────────────▶ storage "photos/<user_id>/<id>.jpg" (riêng tư)
```

**Bảng** (xem `supabase/migrations/20261121000000_accounts_sync.sql`):
- `game_saves`: mỗi tài khoản một dòng, giữ `rev` để phát hiện xung đột.
- `game_sections`: các phần `core, bun, house, tasks, history, memories, health, pets, media, settings, misc` dạng `jsonb`, tối đa 5 MB mỗi phần.
- `coin_events`: sổ xu bất biến (chỉ thêm, không sửa, không xóa).
  - `unique(user_id, event_id)` để chống cộng trùng.
  - Trigger kiểm tra giới hạn mỗi giao dịch, trần 6000 xu mỗi 24 giờ, và mỗi tài khoản chỉ một số dư mở đầu.
- `migrations`: ghi nhận lần chuyển dữ liệu khách theo `migration_id`, nên chạy lại cũng không nhân đôi.
- `profiles`: hồ sơ tối thiểu.
- Không tạo bảng cho dữ liệu tĩnh như cửa tiệm hay món ăn.

**Bảo mật:**
- **RLS:** bật trên mọi bảng. Chính sách SELECT, INSERT và UPDATE chỉ áp dụng cho `auth.uid()`.
  - Không có chính sách DELETE.
  - Vai `anon` bị thu hồi mọi quyền.
  - Sổ xu không có quyền UPDATE hay DELETE.
- **Các hàm:** đều là `SECURITY INVOKER` (RLS vẫn áp dụng) với `search_path = ''`, chỉ vai `authenticated` được gọi.
- **Kho ảnh:** riêng tư, mỗi người chỉ đọc và ghi trong thư mục `<user_id>/`.
- **Khóa ở trình duyệt:** chỉ có URL và khóa **publishable/anon**, lấy từ `/api/config` (hàm Vercel đọc biến môi trường).
  - Hàm này và `js/cloud.js` đều từ chối khóa có dạng `service_role` hoặc `sb_secret_`.
- **Không cần quyền đặc biệt:** không có Edge Function hay khóa `service_role` nào được dùng, vì không thao tác nào cần quyền vượt RLS.
- **Phiên đăng nhập:** do supabase-js quản lý (luồng PKCE, tự làm mới token). Ứng dụng không tự lưu bí mật nào.
- **Thư viện ngoài:** `supabase-js@2.118.0` tải từ jsDelivr có khóa toàn vẹn SRI.

**Giới hạn cần biết:**
- Luật trò chơi (thưởng bao nhiêu xu cho việc gì) vẫn chạy trong trình duyệt. Máy chủ bảo đảm sổ xu không sửa được, không cộng trùng, từng giao dịch hợp lệ và không vượt trần mỗi ngày. Máy chủ **không** tự kiểm chứng việc bạn có làm xong công việc hay không; trò chơi năng suất tự khai báo không có cách nào kiểm chứng điều đó.
- Khi hai thiết bị xung đột và bạn chọn "Giữ dữ liệu trên thiết bị này", giao dịch xu của thiết bị kia vẫn còn trong sổ xu (không mất, không trùng). Riêng thay đổi khác của thiết bị kia, ví dụ công việc, sẽ được thay bằng bản bạn chọn.

**Hành vi người dùng:**
- **Người mới:** thấy cổng chào với 3 nút. "Vào nhà với tư cách khách" là nút nổi bật nhất.
- **Người đang dùng sẵn trên máy:** vào thẳng như trước, chỉ thấy **một lần** lời nhắc nhẹ về tài khoản.
- **Khách → tài khoản:** vào Cài đặt hoặc nút đám mây, chọn "Đồng bộ và lưu tài khoản".
  - Tài khoản trống: xem tóm tắt dữ liệu, xác nhận, rồi tải ảnh lên. Sau đó toàn bộ thế giới được ghi trong **một giao dịch** và đối chiếu từng phần với bản gửi đi. Chỉ khi khớp mới đánh dấu đã chuyển. Bản khách trên máy được giữ nguyên.
  - Tài khoản đã có dữ liệu: không gộp, không ghi đè. Có các lựa chọn "Sử dụng dữ liệu trên tài khoản", "Xem lại dữ liệu đang có trên thiết bị" (bảng so sánh) và "Lưu bản sao lưu trước khi xử lý".
  - Bị gián đoạn: dữ liệu trên máy còn nguyên. Thử lại dùng **cùng mã chuyển**, máy chủ nhận ra thì không tạo bản trùng.
- **Trạng thái đồng bộ:** chấm màu trên nút đám mây và trong hộp "Tài khoản và đồng bộ". Các trạng thái là "Đang đồng bộ...", "Đã đồng bộ.", "Chưa đồng bộ.", "Đồng bộ thất bại." kèm nút "Thử lại", và giờ đồng bộ thành công lần cuối.
- **Đăng xuất:** nếu đã đồng bộ hết thì dữ liệu tài khoản bị xóa khỏi máy, để giữ riêng tư trên máy dùng chung. Nếu còn thay đổi chưa gửi thì giữ lại để gửi khi đăng nhập lại.

---

## 3. Việc bạn cần tự cấu hình

Thứ tự gợi ý: Supabase, rồi Google Cloud, rồi Supabase (Google), rồi Vercel. Khuyên dùng **hai dự án Supabase**: một cho phát triển, một cho bản thật.

### 3.1. Tạo dự án Supabase và chạy lược đồ
1. Vào https://supabase.com/dashboard và tạo dự án mới. Chọn vùng gần người dùng, ví dụ Singapore.
2. Vào **SQL Editor** → New query, dán toàn bộ `supabase/migrations/20261121000000_accounts_sync.sql` rồi bấm **Run**. Chạy lại nhiều lần vẫn an toàn.
3. Lấy 2 giá trị **công khai** ở **Project Settings → API Keys** (hoặc **Data API**):
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **Publishable key** `sb_publishable_…`, hoặc khóa **anon** (legacy).
   - **Không** lấy `service_role` hay `sb_secret_…`, ứng dụng không cần chúng.

### 3.2. Cấu hình đăng nhập trong Supabase (Authentication)
1. **URL Configuration**
   - **Site URL**: `https://hiennhabun.vercel.app`
   - **Redirect URLs**: thêm từng dòng sau.
     - `https://hiennhabun.vercel.app/**`
     - `http://localhost:5173/**` (chỉ nên thêm ở dự án phát triển)
     - Nếu muốn thử trên bản Preview của Vercel: `https://*-<tên-team-vercel>.vercel.app/**`
   - Ứng dụng chỉ có một trang (`/`), nên Google trả về đúng `https://hiennhabun.vercel.app/` kèm `?code=…`. Thư viện tự đổi mã lấy phiên, ứng dụng xóa mã khỏi thanh địa chỉ.
2. **Sign In / Providers → Email**
   - Bật Email.
   - Đặt **Email OTP Length = 6**.
   - Đặt **Email OTP Expiration** khoảng **600** giây (10 phút).
   - Không cần mật khẩu.
3. **Emails → Templates**: sửa **cả hai** mẫu **Magic Link** và **Confirm signup**, để thư gửi **mã 6 số** thay vì đường liên kết. Người dùng mới nhận "Confirm signup", người đã có tài khoản nhận "Magic Link".
   - Tiêu đề: `Mã đăng nhập Hiên Nhà Bun: {{ .Token }}`
   - Nội dung (HTML):
     ```html
     <div style="font-family:Arial,sans-serif;color:#4B3A2C">
       <h2 style="color:#6B4A32">Mã xác nhận của bạn</h2>
       <p>Nhập mã sau vào Hiên Nhà Bun để tiếp tục:</p>
       <p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#BF7430">{{ .Token }}</p>
       <p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua thư.</p>
       <p>Bun đang chờ bạn ở hiên nhà.</p>
     </div>
     ```
   - Đừng để `{{ .ConfirmationURL }}` trong mẫu: ứng dụng chỉ dùng mã.
4. **Emails → SMTP Settings**: dịch vụ gửi thư mặc định của Supabase chỉ dùng để thử. Nó giới hạn rất thấp và có thể chỉ gửi tới email thành viên của dự án.
   - **Bản thật bắt buộc** phải cấu hình SMTP riêng, ví dụ Resend, Postmark, Brevo hoặc Amazon SES, với tên miền gửi đã xác minh.
   - Tên người gửi gợi ý: "Hiên Nhà Bun".
5. **Rate Limits**: giữ mức mặc định, mỗi email chờ khoảng 60 giây mới gửi lại được. Ứng dụng đếm ngược đúng 60 giây trước khi cho bấm "Gửi lại mã".
6. **Liên kết tài khoản**:
   - **Tự động:** Supabase tự gộp danh tính Google và Email **cùng một địa chỉ email đã xác minh** vào cùng một người dùng. Đây là mặc định, không cần bật gì.
   - **Liên kết thủ công:** chỉ khi muốn có nút "Liên kết thêm Google" cho email **khác** địa chỉ Google, hãy bật **Allow manual linking** trong Authentication → Sign In / Providers. Không bật thì nút báo "Máy chủ chưa bật tính năng liên kết…".

### 3.3. Google Cloud (OAuth)
1. Vào https://console.cloud.google.com và tạo dự án, ví dụ "Hien Nha Bun".
2. **Google Auth Platform → Branding** (màn hình đồng ý OAuth):
   - Tên ứng dụng: "Hiên Nhà Bun".
   - Email hỗ trợ, logo nếu muốn.
   - Authorized domains: `hiennhabun.vercel.app` và `supabase.co`.
3. **Audience**: chọn External.
   - Khi còn thử nghiệm thì để "Testing" và thêm email người thử.
   - Khi mở cho mọi người thì bấm "Publish app". Chỉ dùng phạm vi cơ bản (`openid`, `email`, `profile`) nên thường không cần Google duyệt thêm.
4. **Clients → Create client → Web application**:
   - **Authorized JavaScript origins**: `https://hiennhabun.vercel.app` và `http://localhost:5173`.
   - **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`. Lấy đúng địa chỉ này ở Supabase → Authentication → Sign In / Providers → Google, mục "Callback URL".
5. Chép **Client ID** và **Client secret**, rồi dán **thẳng vào Supabase**: Authentication → Sign In / Providers → **Google** → Enable → dán → Save.
   - Client secret chỉ nằm trong Supabase.
   - **Không** đưa vào mã, Vercel hay cuộc trò chuyện.

### 3.4. Vercel
1. Vào Project → **Settings → Environment Variables** và thêm 2 biến:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_PUBLISHABLE_KEY` = publishable/anon key (hoặc dùng tên `SUPABASE_ANON_KEY`)
2. Tách môi trường:
   - Biến cho **Production** dùng dự án Supabase bản thật.
   - Biến cho **Preview** (và Development nếu có) dùng dự án phát triển.
3. Triển khai lại (Redeploy) để hàm `/api/config` nhận biến mới.
4. Kiểm tra: mở `https://hiennhabun.vercel.app/api/config`. Phải thấy `{"enabled":true,"url":…,"key":"sb_publishable_…"}`. Nếu thấy `{"enabled":false}` nghĩa là thiếu biến, hoặc khóa bị từ chối vì là khóa bí mật.
5. Các thư mục `tools/`, `tests/`, `supabase/` và `docs/` không được triển khai (xem `.vercelignore`).

### 3.5. Chạy thử trên máy
1. Chép `config.local.example.json` thành `config.local.json`. Tệp này đã được git bỏ qua.
2. Điền URL và khóa **publishable của dự án phát triển** vào tệp.
3. Mở bằng `Mở Hiên Nhà Bun.cmd`. Ứng dụng sẽ chạy ở `http://localhost:5173`, cần có trong Redirect URLs và Authorized JavaScript origins.
4. Xóa `config.local.json` thì ứng dụng quay về chỉ có chế độ khách.

### 3.6. Sau khi cấu hình: chạy kiểm thử bảo mật
1. Tạo ít nhất 2 người dùng thử, ví dụ đăng nhập bằng hai email khác nhau.
2. **SQL Editor:** chạy `supabase/tests/rls_test.sql`. Mọi dòng phải là `PASS`. Tệp tự hoàn tác, không để lại dữ liệu.
3. **Trình duyệt:** đăng nhập ứng dụng ở `http://localhost:5173`, mở `http://localhost:5173/tests/security.html` rồi bấm "Chạy kiểm tra". Trang thử truy cập trái phép qua API thật và quét mã tìm khóa bí mật.

---

## 4. Trạng thái kiểm thử

**Đã chạy thật trong ứng dụng** (trình duyệt tích hợp, ngày 21/11/2026):
- **Chế độ khách, chưa cấu hình Supabase:**
  - Người mới thấy cổng chào và vào được bằng nút khách.
  - Thêm, hoàn thành việc, mua đồ, cho ăn đều đúng xu.
  - Tải lại trang vẫn giữ nguyên dữ liệu.
  - Người cũ có sẵn dữ liệu vào thẳng, không bị cổng chặn.
  - Không có lỗi trong console.
- **Luồng tài khoản và đồng bộ, chạy trên backend giả lập cục bộ** (`tests/mock-supabase.js`). Backend này mô phỏng đúng quy tắc của lược đồ SQL, nhưng **không phải Supabase thật**. Đã thử:
  - Email OTP: gửi mã, báo lỗi khi mã sai hoặc không đủ 6 số, đếm ngược gửi lại 60 giây, xác nhận thành công.
  - Chuyển dữ liệu khách lên tài khoản trống, gồm cả ảnh.
  - Mất mạng giữa chừng: dữ liệu khách còn nguyên, giữ cùng mã chuyển.
  - Máy chủ đã ghi xong nhưng trình duyệt bị đóng: thử lại không tạo bản trùng (1 bản lưu, 1 lần chuyển, 1 số dư mở đầu) và đối chiếu khớp.
  - Thiết bị thứ hai đăng nhập Google cùng email: cùng một người dùng có cả danh tính Email và Google, thấy đủ việc, đồ, quần áo, ảnh.
  - Chỉ những phần đã đổi được gửi lên.
  - Thiết bị A tự nhận thay đổi của thiết bị B.
  - Mở tài khoản khi mất mạng: dùng bản trên máy, xu chờ trong hàng đợi.
  - Xung đột: hiện hộp chọn, không ghi đè ngầm. Đã thử "Giữ dữ liệu trên thiết bị này".
  - Tài khoản đã có dữ liệu: bảng so sánh, dùng bản tài khoản, dữ liệu khách giữ nguyên, xu không bị cộng gộp.
  - Phần thưởng trùng mã chỉ tính một lần, giao dịch vượt giới hạn bị loại, số xu trên màn hình tự sửa theo máy chủ.
  - Hủy đăng nhập Google: báo hủy, không đổi gì, địa chỉ được làm sạch.
  - Phiên hết hạn: cổng báo đăng nhập lại, dữ liệu trên máy giữ nguyên.
  - Email khác thì thành tài khoản riêng.
  - Bắt đầu lại trên tài khoản.
  - Thêm và xóa ảnh được đồng bộ.
  - Đăng xuất xóa dữ liệu tài khoản khỏi máy.
  - Giao diện ở khổ 375px không tràn ngang.
- **Quét khóa bí mật** trong 22 tệp JS và `index.html`: không có.

**Chưa chạy, cần dự án Supabase và Google thật đã cấu hình:**
- Đăng nhập Google thật và chuyển hướng trên tên miền thật.
- Thư OTP thật, kể cả hết hạn mã thật và giới hạn gửi thật.
- Liên kết danh tính thật của Supabase.
- `supabase/tests/rls_test.sql` và `tests/security.html` trên cơ sở dữ liệu thật.
- Hàm `/api/config` trên Vercel.

Khi bạn cấu hình xong, hãy chạy mục 3.6 và thử lại các luồng trên với dự án thật.
