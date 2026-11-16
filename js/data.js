/* Hiên Nhà Bun — dữ liệu tĩnh: mức ưu tiên, vật phẩm, lời thoại, thành tích */
(function () {
  'use strict';
  const B = (window.B = window.B || {});

  B.PRI = {
    ui: { label: 'Gấp & Quan trọng', short: 'Gấp · Quan trọng', coins: 30 },
    i: { label: 'Quan trọng', short: 'Quan trọng', coins: 22 },
    u: { label: 'Gấp', short: 'Gấp', coins: 14 },
    n: { label: 'Thường', short: 'Thường', coins: 8 },
  };
  B.PRI_ORDER = ['ui', 'i', 'u', 'n'];

  // Luật thưởng (chống "cày" việc vặt)
  B.RULES = {
    fullSlots: 6, // 6 việc đầu mỗi ngày nhận đủ thưởng
    halfSlots: 2, // 2 việc kế tiếp nhận 50%
    tailRate: 0.1, // sau đó chỉ còn 10%
    freshMs: 3 * 60 * 1000, // việc vừa tạo xong trong 3 phút
    freshRate: 0.3,
    planBonus: 1.2, // việc đã lên kế hoạch từ hôm trước
    maxUiPerDay: 3, // tối đa 3 việc "Gấp & Quan trọng" mỗi ngày
    shiftBonus: 10,
    allDoneBonus: 25,
    focusCoinPer5: 1,
    focusDailyCapMin: 120,
  };

  B.DIFF = {
    easy: { label: 'Thong thả', decay: 0.6, limitH: null, desc: 'Chỉ số giảm chậm. Bun không bao giờ rời đi, chỉ buồn và chờ bạn.' },
    normal: { label: 'Cân bằng', decay: 1, limitH: 72, desc: 'Nhịp độ tự nhiên. Sau 72 giờ không ai chăm, Bun về quê ở với ông bà.' },
    hard: { label: 'Thử thách', decay: 1.35, limitH: 48, desc: 'Chỉ số giảm nhanh hơn. Giới hạn vắng mặt còn 48 giờ.' },
  };

  // q: chất lượng dinh dưỡng (1 = cân bằng). Giá đã tăng để mỗi bữa ăn là một quyết định chi tiêu.
  B.FOODS = [
    { id: 'kibble', kind: 'food', name: 'Hạt khô thường', price: 12, hunger: 35, joy: 1, q: 0.8, desc: 'Đủ no, dinh dưỡng ở mức cơ bản' },
    { id: 'kibble_pro', kind: 'food', name: 'Hạt dinh dưỡng', price: 22, hunger: 40, joy: 2, q: 1.1, desc: 'Cân bằng đạm, béo và khoáng' },
    { id: 'pate', kind: 'food', name: 'Pate gà', price: 28, hunger: 55, joy: 8, q: 1.0, desc: 'No lâu, Bun rất thích' },
    { id: 'fresh', kind: 'food', name: 'Cơm gà rau củ', price: 36, hunger: 60, joy: 6, q: 1.25, desc: 'Bữa tươi, tốt nhất cho tăng trưởng' },
    { id: 'treat', kind: 'food', name: 'Bánh thưởng', price: 15, hunger: 10, joy: 18, q: 0.5, treat: true, desc: 'Ăn vặt cho vui, quá 3 cái mỗi ngày dễ thừa cân' },
    { id: 'water', kind: 'drink', name: 'Nước lọc', price: 4, thirst: 50, joy: 0, desc: 'Giải khát tốt nhất mỗi ngày' },
    { id: 'milk', kind: 'drink', name: 'Sữa cho cún', price: 14, thirst: 40, hunger: 8, joy: 6, desc: 'Sữa không lactose, thỉnh thoảng mới uống' },
    { id: 'broth', kind: 'drink', name: 'Nước hầm xương', price: 18, thirst: 45, hunger: 12, joy: 5, desc: 'Ấm bụng ngày mưa' },
  ];
  B.food = (id) => B.FOODS.find((f) => f.id === id);

  /* ---------- Lập kế hoạch thông minh ---------- */
  B.CATS = ['Đại học', 'Tài chính', 'Tiếng Anh', 'Công việc', 'Cá nhân', 'Khác'];
  B.CAT_HINTS = [
    [/tài chính|finance|kế toán|excel|đầu tư|chứng khoán|ngân sách|định giá|mô hình/i, 'Tài chính'],
    [/tiếng anh|english|ielts|toeic|từ vựng|vocab|speaking|listening|ngữ pháp/i, 'Tiếng Anh'],
    [/bài tập|assignment|ôn thi|kỳ thi|môn |lecture|bài giảng|đại học|rmit|tiểu luận|luận văn|thuyết trình|quiz/i, 'Đại học'],
    [/email|thư|họp|meeting|báo cáo|khách hàng|dự án|công ty|cv|phỏng vấn|hồ sơ/i, 'Công việc'],
    [/dọn|giặt|gym|tập thể|chạy bộ|nấu|mua |đi chợ|thiền|gia đình|bạn bè|khám|cắt tóc/i, 'Cá nhân'],
  ];
  B.DURS = [15, 30, 45, 60, 90];
  B.DIFFS = { easy: 'Dễ', med: 'Vừa', hard: 'Khó' };
  B.LOADS = { deep: 'Việc sâu', light: 'Việc nhẹ' };
  // Mẫu "thời gian quyết định phạm vi": mỗi loại việc có kết quả vừa sức cho từng mức thời lượng,
  // và một chuỗi bước (tên bước, tỉ trọng thời gian, kết quả đo được).
  B.WORK_TYPES = [
    { id: 'admin', load: 'light', re: /email|thư|trả lời|gọi|đăng ký|nộp|thanh toán|đặt lịch|đặt vé|điền|in |gửi|chuyển khoản|hóa đơn/i,
      scope: { 15: 'Xử lý xong 3 đến 5 mục nhỏ', 30: 'Xử lý xong các mục cần trả lời hôm nay', 45: 'Dọn sạch hộp thư và việc giấy tờ tồn đọng', 60: 'Hoàn tất toàn bộ việc hành chính trong tuần', 90: 'Hoàn tất việc hành chính và sắp xếp lại hồ sơ' },
      steps: [['Liệt kê các mục cần xử lý', 0.15, 'Có danh sách rõ ràng'], ['Xử lý lần lượt từng mục', 0.7, 'Các mục đã gửi hoặc đã xong'], ['Kiểm tra lại và ghi việc còn treo', 0.15, 'Không còn mục nào bị quên']] },
    { id: 'tidy', load: 'light', re: /dọn|sắp xếp|giặt|lau|rửa|gấp|thu dọn/i,
      scope: { 15: 'Dọn gọn một góc nhỏ', 30: 'Dọn xong một khu vực', 45: 'Dọn xong một phòng', 60: 'Dọn xong một phòng và bỏ đồ thừa', 90: 'Dọn và sắp xếp lại cả không gian' },
      steps: [['Gom đồ về đúng chỗ', 0.4, 'Bề mặt trống'], ['Lau dọn', 0.4, 'Sạch sẽ'], ['Bỏ đồ thừa', 0.2, 'Túi rác đã buộc']] },
    { id: 'write', load: 'deep', re: /viết|soạn|luận|essay|report|báo cáo|bài luận|draft|nháp/i,
      scope: { 15: 'Viết dàn ý 3 đến 5 gạch đầu dòng', 30: 'Viết xong dàn ý và đoạn mở đầu', 45: 'Viết nháp một phần chính, khoảng 250 chữ', 60: 'Viết nháp hai phần chính', 90: 'Viết xong bản nháp đầu và đọc lại một lượt' },
      steps: [['Lập dàn ý', 0.2, 'Dàn ý 3 đến 5 ý chính'], ['Viết nháp, chưa cần chỉnh', 0.6, 'Bản nháp đủ các ý'], ['Đọc lại và sửa', 0.2, 'Bản đã sửa lỗi rõ ràng']] },
    { id: 'read', load: 'deep', re: /đọc|read|chương|sách|tài liệu|paper|giáo trình/i,
      scope: { 15: 'Đọc 5 trang và ghi một ý đáng nhớ', 30: 'Đọc 10 đến 15 trang và ghi 3 ý chính', 45: 'Đọc một chương ngắn và tóm tắt 5 dòng', 60: 'Đọc một chương và viết tóm tắt nửa trang', 90: 'Đọc hai chương và viết tóm tắt một trang' },
      steps: [['Xem lướt mục lục và tiêu đề', 0.1, 'Biết phần nào cần đọc kỹ'], ['Đọc và đánh dấu ý chính', 0.65, 'Các ý chính đã được đánh dấu'], ['Viết tóm tắt', 0.25, 'Bản tóm tắt bằng lời của mình']] },
    { id: 'exercise', load: 'deep', re: /bài tập|assignment|làm bài|giải|quiz|đề |problem set|homework/i,
      scope: { 15: 'Đọc đề và ghi ra hướng làm', 30: 'Giải xong một câu hoặc một phần nhỏ', 45: 'Giải xong hai câu', 60: 'Hoàn thành một phần lớn của bài', 90: 'Hoàn thành bản đầu của cả bài và kiểm tra lại' },
      steps: [['Đọc đề, xác định yêu cầu', 0.15, 'Danh sách yêu cầu của đề'], ['Giải từng phần', 0.65, 'Lời giải cho các phần đã chọn'], ['Kiểm tra lại kết quả', 0.2, 'Đã soát lỗi tính toán và trình bày']] },
    { id: 'practice', load: 'deep', re: /luyện|practice|thực hành|excel|code|lập trình|speaking|listening|đề thi thử/i,
      scope: { 15: 'Luyện một kỹ năng nhỏ, lặp lại 3 lần', 30: 'Hoàn thành một bài luyện ngắn', 45: 'Hoàn thành một bài luyện và xem đáp án', 60: 'Hoàn thành một bài luyện và tự chữa lỗi', 90: 'Luyện hai bài và ghi lại các lỗi hay gặp' },
      steps: [['Khởi động với ví dụ mẫu', 0.2, 'Làm lại được ví dụ mẫu'], ['Tự làm bài luyện', 0.55, 'Bài luyện đã làm xong'], ['Chữa lỗi và ghi chú', 0.25, 'Danh sách lỗi cần tránh']] },
    { id: 'prepare', load: 'deep', re: /chuẩn bị|thuyết trình|slide|presentation|kế hoạch|lên kế hoạch|đề cương/i,
      scope: { 15: 'Viết ra mục tiêu và 3 ý chính', 30: 'Dựng khung nội dung đầy đủ', 45: 'Hoàn thành khung và một phần nội dung', 60: 'Hoàn thành bản đầu của nội dung chính', 90: 'Hoàn thành bản đầu và tập trình bày một lượt' },
      steps: [['Xác định mục tiêu và người nghe', 0.15, 'Một câu mục tiêu rõ ràng'], ['Dựng khung và nội dung', 0.6, 'Khung đầy đủ các phần'], ['Rà soát, tập thử', 0.25, 'Đã chạy thử một lượt']] },
    { id: 'research', load: 'deep', re: /nghiên cứu|tra cứu|tìm hiểu|research|khảo sát|so sánh/i,
      scope: { 15: 'Tìm một nguồn tốt và ghi ý chính', 30: 'Tìm 3 nguồn tốt và ghi ý chính của mỗi nguồn', 45: 'Tìm 3 nguồn và viết nửa trang tổng hợp', 60: 'Tổng hợp các nguồn thành một trang ghi chú', 90: 'Tổng hợp nguồn và rút ra kết luận sơ bộ' },
      steps: [['Viết ra câu hỏi cần trả lời', 0.1, 'Một đến ba câu hỏi cụ thể'], ['Tìm và đọc nguồn', 0.6, 'Ghi chú từ các nguồn đáng tin'], ['Tổng hợp', 0.3, 'Bản tổng hợp bằng lời của mình']] },
    { id: 'review', load: 'light', re: /xem lại|review|kiểm tra|rà soát|ôn lại|flashcard/i,
      scope: { 15: 'Xem lại ghi chú của một buổi', 30: 'Xem lại ghi chú và tự kiểm tra 5 câu', 45: 'Xem lại hai buổi và tự kiểm tra', 60: 'Xem lại cả tuần và ghi chỗ còn yếu', 90: 'Tổng ôn và làm một bài tự kiểm tra' },
      steps: [['Đọc lại ghi chú', 0.5, 'Đã đọc hết phần đã chọn'], ['Tự kiểm tra không nhìn tài liệu', 0.35, 'Biết mình nhớ được bao nhiêu'], ['Ghi lại chỗ còn yếu', 0.15, 'Danh sách cần ôn thêm']] },
    { id: 'study', load: 'deep', re: /(^|\s)(học|ôn|study|learn)(\s|$)|bài giảng|lecture|khái niệm/i,
      scope: { 15: 'Đọc lại một ý chính và ghi 3 dòng tóm tắt', 30: 'Ôn một khái niệm và làm một bài tập nhỏ', 45: 'Học một khái niệm và làm hai bài tập áp dụng', 60: 'Học một khái niệm và hoàn thành một bài thực hành', 90: 'Học khái niệm, làm bài thực hành và rà lại lỗi sai' },
      steps: [['Chọn đúng một phần cần học', 0.1, 'Biết chính xác hôm nay học gì'], ['Đọc và ghi chú ý chính', 0.4, 'Ghi chú bằng lời của mình'], ['Làm bài áp dụng', 0.4, 'Bài áp dụng đã làm xong'], ['Ghi lại điều rút ra', 0.1, 'Hai đến ba điều rút ra']] },
    { id: 'generic', load: 'light', re: /.*/,
      scope: { 15: 'Hoàn thành một phần nhỏ, kiểm tra được', 30: 'Hoàn thành một phần rõ ràng của việc này', 45: 'Hoàn thành khoảng một nửa việc này', 60: 'Hoàn thành phần chính của việc này', 90: 'Hoàn thành việc này và kiểm tra lại' },
      steps: [['Xác định kết quả cần có', 0.15, 'Một câu mô tả kết quả'], ['Làm phần chính', 0.65, 'Phần chính đã xong'], ['Kiểm tra và hoàn thiện', 0.2, 'Đã rà soát lại']] },
  ];

  /* ---------- Bạn của Bun ---------- */
  B.FRIENDS = [
    { kind: 'cat', name: 'Mướp', price: 420, trait: 'Kiêu kỳ', desc: 'Một cô mèo mướp thích nằm trên bệ cửa sổ và giả vờ không quan tâm đến Bun.', sound: 'Meo~' },
    { kind: 'rabbit', name: 'Bông', price: 340, trait: 'Nhút nhát', desc: 'Chú thỏ trắng hay nhảy quanh tấm thảm, thấy Bun chạy là chạy theo.', sound: 'Khịt khịt' },
    { kind: 'hedgehog', name: 'Hạt Dẻ', price: 280, trait: 'Chậm rãi', desc: 'Bạn nhím nhỏ đi rất chậm, thích cuộn tròn ngủ cạnh giường của Bun.', sound: 'Phì phì' },
  ];
  B.friendDef = (kind) => B.FRIENDS.find((f) => f.kind === kind);

  B.VACCINE_NAMES = ['Vắc-xin lõi C3 (care, viêm gan, parvo)', 'Ho cũi chó (parainfluenza, Bordetella)', 'Xoắn khuẩn (leptospirosis)', 'Tẩy giun', 'Phòng ve, bọ chét', 'Phòng giun tim'];
  B.HEALTH_KINDS = { vaccine: { label: 'Tiêm phòng', cost: 60, icon: 'shield' }, vet: { label: 'Khám thú y', cost: 45, icon: 'steth' }, check: { label: 'Kiểm tra định kỳ', cost: 30, icon: 'heart' }, groom: { label: 'Tắm, chải lông', cost: 25, icon: 'drop' } };

  B.HOUSE = [
    { level: 1, name: 'Căn phòng nhỏ', price: 0, desc: 'Một căn phòng cũ nhưng ấm, nơi mọi thứ bắt đầu.' },
    { level: 2, name: 'Sàn gỗ và tường ốp', price: 280, desc: 'Lát sàn gỗ sồi, ốp chân tường màu xanh xô thơm.' },
    { level: 3, name: 'Cửa sổ lớn', price: 520, desc: 'Nới rộng cửa sổ để nắng vào nhiều hơn, thêm chậu cây trên bệ.' },
    { level: 4, name: 'Lò sưởi và xà gỗ', price: 850, desc: 'Một chiếc lò sưởi bập bùng mỗi tối, Bun thích nằm gần đó.' },
    { level: 5, name: 'Cửa kính ra vườn', price: 1300, desc: 'Thay cửa gỗ bằng cửa kính nhìn ra khu vườn sau nhà.' },
  ];

  // slot: bed | rug | plant | lamp | wall | curtain | lights | toy | head | face | neck
  B.ITEMS = [
    { id: 'bed0', slot: 'bed', name: 'Hộp các-tông', price: 0, desc: 'Chiếc hộp Bun tự chọn làm giường.' },
    { id: 'bed1', slot: 'bed', name: 'Nệm tròn xô thơm', price: 90, desc: 'Nệm bông êm, vừa một vòng cuộn.' },
    { id: 'bed2', slot: 'bed', name: 'Giỏ mây đan', price: 190, desc: 'Giỏ mây lót đệm kem, thơm mùi nắng.' },
    { id: 'bed3', slot: 'bed', name: 'Giường gỗ chăn bông', price: 360, level: 2, desc: 'Giường gỗ nhỏ có chăn chần bông.' },

    { id: 'rug0', slot: 'rug', name: 'Chiếu cói', price: 0, desc: 'Tấm chiếu cói mát lưng.' },
    { id: 'rug1', slot: 'rug', name: 'Thảm len tròn', price: 80, desc: 'Thảm len đan tay màu kem.' },
    { id: 'rug2', slot: 'rug', name: 'Thảm thổ cẩm', price: 170, desc: 'Hoa văn thổ cẩm ấm áp.' },
    { id: 'rug3', slot: 'rug', name: 'Thảm lông xù', price: 260, desc: 'Mềm đến mức Bun không muốn dậy.' },

    { id: 'plant1', slot: 'plant', name: 'Xương rồng nhỏ', price: 45, desc: 'Dễ sống, hợp người bận rộn.' },
    { id: 'plant2', slot: 'plant', name: 'Trầu bà lá xẻ', price: 130, desc: 'Lá to xanh mướt ở góc phòng.' },
    { id: 'plant3', slot: 'plant', name: 'Cây bàng Singapore', price: 220, desc: 'Cao gần chạm trần, rất ra dáng.' },

    { id: 'lamp1', slot: 'lamp', name: 'Đèn cây chụp vải', price: 140, desc: 'Ánh vàng dịu bên cửa sổ.' },
    { id: 'lamp2', slot: 'lamp', name: 'Đèn lồng giấy', price: 180, desc: 'Quả cầu giấy trên chân gỗ.' },

    { id: 'wall1', slot: 'wall', name: 'Tranh đồi núi', price: 60, desc: 'Một buổi sáng trên đồi.' },
    { id: 'wall2', slot: 'wall', name: 'Chân dung Bun', price: 110, desc: 'Vẽ đúng vệt trắng trên trán.' },
    { id: 'wall3', slot: 'wall', name: 'Đồng hồ gỗ', price: 150, desc: 'Chạy đúng giờ thật của bạn.' },

    { id: 'cur0', slot: 'curtain', name: 'Rèm trắng', price: 0, desc: 'Rèm vải mỏng màu trắng ngà.' },
    { id: 'cur1', slot: 'curtain', name: 'Rèm lanh xanh', price: 70, desc: 'Vải lanh màu xanh xô thơm.' },
    { id: 'cur2', slot: 'curtain', name: 'Rèm ca-rô đỏ', price: 95, desc: 'Ca-rô đỏ kiểu nhà quê.' },

    { id: 'lights1', slot: 'lights', name: 'Dây đèn đom đóm', price: 120, desc: 'Sáng lấp lánh khi trời tối.' },

    { id: 'toy_ball', slot: 'toy', name: 'Bóng tennis', price: 30, desc: 'Ném đi, Bun nhặt về.' },
    { id: 'toy_rope', slot: 'toy', name: 'Dây thừng gặm', price: 45, desc: 'Để gặm lúc bạn làm việc.' },
    { id: 'toy_duck', slot: 'toy', name: 'Vịt cao su', price: 60, desc: 'Kêu chít chít, Bun mê lắm.' },

    { id: 'cap', slot: 'head', name: 'Mũ lưỡi trai xanh', price: 70, desc: 'Đội ngược cho ngầu.' },
    { id: 'beanie', slot: 'head', name: 'Mũ len cam', price: 85, desc: 'Ấm tai ngày trở gió.' },
    { id: 'shades', slot: 'face', name: 'Kính râm gọng trắng', price: 80, desc: 'Chiếc kính quen thuộc của Bun.' },
    { id: 'bandana', slot: 'neck', name: 'Khăn bandana đỏ', price: 50, desc: 'Chấm bi trắng trên nền đỏ.' },
    { id: 'bow', slot: 'neck', name: 'Nơ cổ xanh', price: 40, desc: 'Lịch sự cho dịp đặc biệt.' },
    { id: 'bell', slot: 'neck', name: 'Vòng cổ chuông', price: 35, desc: 'Leng keng mỗi bước chân.' },
    { id: 'bandana_blue', slot: 'neck', name: 'Khăn bandana xanh', price: 50, desc: 'Chiếc khăn xanh Bun hay quàng ngoài đời.' },
    { id: 'scarf', slot: 'neck', name: 'Khăn len kẻ', price: 65, desc: 'Quàng hai vòng cho ấm cổ.' },
    { id: 'straw', slot: 'head', name: 'Nón lá', price: 60, desc: 'Che nắng kiểu Việt Nam.' },
    { id: 'santa', slot: 'head', name: 'Mũ Noel', price: 90, desc: 'Đồ theo mùa, có quả bông trắng.' },
    { id: 'party', slot: 'head', name: 'Mũ sinh nhật', price: 55, desc: 'Cho những ngày đáng ăn mừng.' },
    { id: 'sweater_cream', slot: 'body', name: 'Áo len kem', price: 120, desc: 'Len đan tay, cổ bo sọc caramel.' },
    { id: 'sweater_xmas', slot: 'body', name: 'Áo len Giáng sinh', price: 150, desc: 'Đỏ, xanh và họa tiết zíc zắc trắng.' },
    { id: 'shirt_stripe', slot: 'body', name: 'Áo thun kẻ xanh', price: 95, desc: 'Kẻ ngang kiểu thủy thủ.' },
    { id: 'shirt_hawaii', slot: 'body', name: 'Sơ mi hoa', price: 110, desc: 'Cho ngày hè đi dạo.' },
    { id: 'jacket_denim', slot: 'body', name: 'Áo khoác bò', price: 160, desc: 'Có túi nhỏ bên hông.' },
    { id: 'raincoat', slot: 'body', name: 'Áo mưa vàng', price: 130, desc: 'Ngày mưa vẫn ra hiên được.' },
    { id: 'aodai', slot: 'body', name: 'Áo dài Tết', price: 180, desc: 'Đỏ thắm, hoa mai vàng.' },
    { id: 'bee', slot: 'body', name: 'Bộ ong vàng', price: 200, desc: 'Trang phục đặc biệt, có đôi cánh nhỏ.' },
  ];
  B.item = (id) => B.ITEMS.find((x) => x.id === id);

  B.SHOP_TABS = [
    { id: 'furn', label: 'Nội thất', slots: ['bed', 'rug', 'lamp', 'plant'] },
    { id: 'decor', label: 'Trang trí', slots: ['wall', 'curtain', 'lights'] },
    { id: 'toy', label: 'Đồ chơi', slots: ['toy'] },
    { id: 'wear', label: 'Trang phục', slots: ['body', 'head', 'face', 'neck'] },
    { id: 'pantry', label: 'Thức ăn', slots: [] },
    { id: 'friends', label: 'Bạn của Bun', slots: [] },
    { id: 'house', label: 'Ngôi nhà', slots: [] },
  ];
  B.SLOT_NAMES = {
    bed: 'Giường', rug: 'Thảm', plant: 'Cây', lamp: 'Đèn', wall: 'Tường', curtain: 'Rèm',
    lights: 'Dây đèn', toy: 'Đồ chơi', head: 'Đội đầu', face: 'Đeo mặt', neck: 'Đeo cổ', body: 'Áo',
  };
  B.WEAR_SLOTS = ['head', 'face', 'neck', 'body'];

  B.TROPHIES = {
    star: 'Ngôi sao ngày trọn vẹn',
    paw: 'Dấu chân vàng tuần đầu',
    cup: 'Cúp ba mươi ngày',
    glass: 'Đồng hồ cát tập trung',
    medal: 'Huy chương trăm việc',
  };

  B.TREASURES = [
    { id: 'leaf', name: 'Chiếc lá vàng', text: 'Bay vào từ cửa sổ, Bun đuổi theo mãi mới bắt được.' },
    { id: 'sock', name: 'Chiếc tất lạc đôi', text: 'Bun tìm thấy dưới gầm giường và nhất định không trả.' },
    { id: 'button', name: 'Cúc áo đỏ', text: 'Lăn ra từ khe sàn gỗ.' },
    { id: 'acorn', name: 'Hạt dẻ', text: 'Một chú sóc để quên bên bệ cửa.' },
    { id: 'pebble', name: 'Viên sỏi nhẵn', text: 'Tròn và mát, Bun ngậm về từ cửa.' },
    { id: 'key', name: 'Chìa khóa cũ', text: 'Không ai biết nó mở cánh cửa nào.' },
    { id: 'feather', name: 'Lông chim', text: 'Một chú chim sẻ ghé chơi rồi để lại.' },
    { id: 'cap', name: 'Nắp chai', text: 'Kêu lách cách khi Bun đẩy bằng mũi.' },
    { id: 'shell', name: 'Vỏ ốc', text: 'Áp vào tai nghe như có tiếng sóng.' },
    { id: 'flower', name: 'Bông hoa dại', text: 'Hái tặng bạn, hơi nhàu một chút.' },
    { id: 'pencil', name: 'Mẩu bút chì', text: 'Bun nghĩ đây là thứ giúp bạn giỏi lên.' },
    { id: 'ribbon', name: 'Dải ruy băng', text: 'Còn sót lại từ một món quà cũ.' },
  ];

  B.BOND = [
    { xp: 0, name: 'Mới quen' },
    { xp: 30, name: 'Quen hơi' },
    { xp: 80, name: 'Tin tưởng' },
    { xp: 160, name: 'Thân thiết' },
    { xp: 280, name: 'Bạn thân' },
    { xp: 450, name: 'Tri kỷ' },
    { xp: 700, name: 'Không rời' },
    { xp: 1000, name: 'Người nhà' },
  ];

  // Thành tích: check(S) trả về true khi đạt. reward: coins | trophy | ticket
  B.ACH = [
    { id: 'first_task', name: 'Bước chân đầu tiên', desc: 'Hoàn thành việc đầu tiên', check: (S) => S.totals.tasksDone >= 1, reward: { coins: 10 } },
    { id: 'all_done', name: 'Ngày trọn vẹn', desc: 'Hoàn thành mọi việc trong một ngày (từ 3 việc)', check: (S) => S.totals.daysAllDone >= 1, reward: { trophy: 'star' } },
    { id: 'early', name: 'Chim sớm', desc: 'Xong một việc trước 8 giờ sáng', check: (S) => S.totals.earlyTasks >= 1, reward: { coins: 15 } },
    { id: 'streak3', name: 'Ba ngày liền', desc: 'Giữ chuỗi 3 ngày', check: (S) => S.streak.best >= 3, reward: { coins: 20 } },
    { id: 'streak7', name: 'Tuần đầu tiên', desc: 'Giữ chuỗi 7 ngày', check: (S) => S.streak.best >= 7, reward: { trophy: 'paw', coins: 50 } },
    { id: 'streak14', name: 'Hai tuần bền bỉ', desc: 'Giữ chuỗi 14 ngày', check: (S) => S.streak.best >= 14, reward: { ticket: 1 } },
    { id: 'streak30', name: 'Một tháng bên nhau', desc: 'Giữ chuỗi 30 ngày', check: (S) => S.streak.best >= 30, reward: { trophy: 'cup', coins: 150 } },
    { id: 'tasks50', name: 'Năm mươi việc', desc: 'Hoàn thành tổng cộng 50 việc', check: (S) => S.totals.tasksDone >= 50, reward: { coins: 60 } },
    { id: 'tasks100', name: 'Trăm việc', desc: 'Hoàn thành tổng cộng 100 việc', check: (S) => S.totals.tasksDone >= 100, reward: { trophy: 'medal' } },
    { id: 'focus1', name: 'Ngồi cùng Bun', desc: 'Hoàn thành phiên tập trung đầu tiên', check: (S) => S.totals.focusSessions >= 1, reward: { coins: 10 } },
    { id: 'focus10', name: 'Mười phiên tập trung', desc: 'Hoàn thành 10 phiên tập trung', check: (S) => S.totals.focusSessions >= 10, reward: { trophy: 'glass' } },
    { id: 'planner', name: 'Người biết lo xa', desc: 'Lên kế hoạch trước cho 5 ngày', check: (S) => S.totals.plannedDays >= 5, reward: { coins: 30 } },
    { id: 'home3', name: 'Nhà nhiều nắng', desc: 'Nâng nhà lên cấp 3', check: (S) => S.house.level >= 3, reward: { coins: 40 } },
    { id: 'home5', name: 'Hiên nhà hoàn chỉnh', desc: 'Nâng nhà lên cấp 5', check: (S) => S.house.level >= 5, reward: { coins: 120 } },
    { id: 'bond5', name: 'Bạn thân', desc: 'Đạt mức thân thiết "Bạn thân"', check: (S) => B.bond(S.bun.bondXp).level >= 5, reward: { coins: 50 } },
    { id: 'collector', name: 'Kho báu nhỏ', desc: 'Bun mang về 6 món kho báu', check: (S) => S.treasures.length >= 6, reward: { coins: 40 } },
  ];

  B.LINES = {
    morning: ['Chào buổi sáng! Hôm nay tụi mình làm gì nào?', 'Cậu dậy rồi! Tớ chờ nãy giờ.', 'Sáng nay nắng đẹp ghê.'],
    day: ['Cậu đây rồi!', 'Tớ vừa đi một vòng quanh phòng.', 'Có tớ ở đây nè.'],
    evening: ['Tối rồi, cậu ăn cơm chưa?', 'Đèn bật lên ấm ghê.', 'Hôm nay của cậu thế nào?'],
    night: ['Ư… khuya rồi đó.', 'Tớ buồn ngủ quá…', 'Cậu cũng ngủ sớm nha.'],
    pet: ['Hihi, gãi chỗ đó nữa đi.', 'Thích quá!', 'Tớ thương cậu.', 'Thêm chút nữa nha.', 'Gâu!'],
    petSleepy: ['Ư… để tớ ngủ thêm chút.', 'Mm… cậu chưa ngủ à?'],
    fed: ['Ngon quá, cảm ơn cậu!', 'Măm măm!', 'No bụng rồi, vui ghê.'],
    full: ['Tớ còn no lắm, để lát nữa nha.'],
    drank: ['Nước mát ghê!', 'Đã khát rồi.'],
    notThirsty: ['Tớ chưa khát đâu.'],
    played: ['Vui quá! Chơi nữa đi!', 'Tớ bắt được rồi nè!', 'Cậu ném xa thêm chút nữa đi.'],
    tired: ['Tớ mệt rồi, cho tớ nằm chút nha.'],
    hungry: ['Bụng tớ kêu rồi…', 'Cậu ơi, bát của tớ trống rồi.'],
    thirsty: ['Tớ khát nước…', 'Bát nước cạn rồi cậu ơi.'],
    sad: ['Chơi với tớ một chút được không?'],
    taskDone: ['Giỏi quá!', 'Thêm một việc xong rồi!', 'Tớ biết cậu làm được mà.', 'Gâu! Tuyệt lắm!', 'Từng chút một, cậu đang tiến lên đó.'],
    taskBig: ['Việc lớn cũng xong rồi! Tớ tự hào về cậu.', 'Việc khó nhất đã qua. Giỏi ghê!'],
    taskSleepy: ['Mm… giỏi lắm… ngủ sớm nha.'],
    allDone: ['Xong hết rồi! Hôm nay là một ngày trọn vẹn!', 'Không còn việc nào luôn! Ăn mừng thôi!'],
    focusStart: ['Tớ nằm đây với cậu. Cố lên nha.', 'Cậu cứ làm đi, tớ canh cho.'],
    focusEnd: ['Xong một phiên rồi! Nghỉ chút với tớ nha.', 'Cậu tập trung giỏi ghê.'],
    focusCancel: ['Không sao, lúc khác mình làm lại.'],
    rain: ['Mưa rồi. Ở nhà với tớ nha.', 'Tớ thích nghe tiếng mưa.'],
    window: ['Ngoài kia có con chim sẻ.', 'Gió thổi lá bay kìa.', 'Tớ thích ngắm trời.'],
    door: ['Hôm nào mình đi dạo nha?'],
    call: ['Gâu! Tớ đây!', 'Cậu gọi tớ hả?'],
    welcomeShort: ['Cậu quay lại rồi!', 'Tớ vẫn ở đây nè.'],
    welcomeMid: ['Cậu về rồi! Tớ nghe tiếng bước chân từ xa.', 'Mừng cậu về nhà!'],
    welcomeLong: ['Cậu về rồi! Hôm nay dài ghê, kể tớ nghe đi.', 'Tớ ra cửa chờ mấy lần rồi đó.'],
    welcomeVeryLong: ['Cậu về rồi! Tớ nhớ cậu lắm.', 'Lâu quá mới gặp! Vào nhà đi cậu.'],
    gift: ['Tớ tìm thấy cái này, tặng cậu!', 'Nhìn nè, tớ nhặt được đó!'],
    habit: ['Giờ này hôm nào cậu cũng làm việc mà. Tớ ra bàn chờ nha.'],
    lateNight: ['Khuya rồi mà cậu vẫn làm. Tớ ngủ cạnh cậu nha.'],
    newDay: ['Ngày mới rồi! Kéo rèm thôi.'],
    goodnight: ['Chúc cậu ngủ ngon. Mai gặp lại nha.'],
    rest: ['Bà sang trông tớ rồi, cậu cứ yên tâm nghỉ nha.'],
    newHome: ['Nhà mình đẹp hơn rồi!', 'Chỗ này mới ghê, để tớ ngửi thử.'],
    newItem: ['Của tớ hả? Thích quá!', 'Đồ mới nè!'],
    newWear: ['Tớ trông có bảnh không?', 'Hợp với tớ ghê.'],
  };

  B.GREET_BY_HOUR = (h) => (h < 5 ? 'Khuya rồi' : h < 11 ? 'Chào buổi sáng' : h < 13 ? 'Buổi trưa an lành' : h < 18 ? 'Buổi chiều vui vẻ' : h < 22 ? 'Buổi tối ấm áp' : 'Khuya rồi');
})();
