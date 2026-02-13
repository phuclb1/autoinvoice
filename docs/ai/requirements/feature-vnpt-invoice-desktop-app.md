---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
feature: vnpt-invoice-desktop-app
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- **Core Problem**: Kế toán viên phải download hàng chục/trăm hóa đơn VNPT mỗi tháng một cách thủ công, tốn nhiều thời gian và dễ sai sót
- **Current Workaround**: Sử dụng Python script (`vnpt_invoice_downloader.py`) chạy từ terminal - yêu cầu kiến thức kỹ thuật, không thân thiện với người dùng phổ thông
- **Who is affected**: Kế toán viên, nhân viên hành chính cần download hóa đơn điện tử từ VNPT Invoice portal

## Goals & Objectives
**What do we want to achieve?**

### Primary Goals
- [ ] Desktop app cross-platform (macOS + Windows) sử dụng Tauri
- [ ] Upload file Excel chứa danh sách mã tra cứu hóa đơn
- [ ] Tự động trích xuất và hiển thị danh sách mã tra cứu từ Excel
- [ ] Tự động giải captcha bằng OpenAI GPT-4o-mini
- [ ] Tự động download hàng loạt hóa đơn PDF
- [ ] UI hiển thị progress bar + log chi tiết (giống terminal)
- [ ] Lưu lịch sử download vào SQLite local database

### Secondary Goals
- [ ] Retry tự động khi captcha sai (max 3 lần)
- [ ] Popup cho phép nhập captcha thủ công khi AI fail
- [ ] Cho phép user chọn thư mục lưu file download
- [ ] Export báo cáo kết quả download (thành công/thất bại)

### Non-Goals (Out of Scope)
- Không hỗ trợ các invoice portal khác ngoài VNPT
- Không hỗ trợ AI provider khác ngoài OpenAI (trong version 1.0)
- Không có cloud sync hay multi-user
- Không có chức năng edit/view nội dung hóa đơn

## User Stories & Use Cases
**How will users interact with the solution?**

### User Stories
1. **US-01**: Là kế toán, tôi muốn upload file Excel danh sách hóa đơn để app tự động trích xuất mã tra cứu, tiết kiệm thời gian nhập liệu thủ công
2. **US-02**: Là kế toán, tôi muốn nhập OpenAI API key một lần và app lưu lại để không phải nhập lại mỗi lần sử dụng
3. **US-03**: Là kế toán, tôi muốn xem danh sách mã tra cứu đã trích xuất trước khi bắt đầu download để kiểm tra và xác nhận
4. **US-04**: Là kế toán, tôi muốn chọn thư mục lưu file PDF download để quản lý file theo ý muốn
5. **US-05**: Là kế toán, tôi muốn xem progress real-time khi đang download (số lượng, % hoàn thành, log chi tiết) để biết trạng thái công việc
6. **US-06**: Là kế toán, tôi muốn được thông báo khi có captcha không giải được để nhập tay, đảm bảo không bỏ sót hóa đơn
7. **US-07**: Là kế toán, tôi muốn xem lịch sử các lần download trước đó để theo dõi và kiểm soát
8. **US-08**: Là kế toán, tôi muốn retry các hóa đơn download thất bại từ lần trước mà không cần upload lại Excel
9. **US-09**: Là kế toán, tôi muốn app tự động detect URL portal VNPT từ file Excel để không phải cấu hình thủ công cho từng công ty
10. **US-10**: Là kế toán, tôi muốn cấu hình URL portal VNPT trong Settings khi app không tự detect được từ Excel

### Key Workflows

```
1. Setup (lần đầu):
   User mở app → Nhập OpenAI API key → Chọn thư mục download mặc định → Lưu settings

2. Download hóa đơn:
   Upload Excel → Xem preview danh sách mã → Click "Process" →
   Xem progress + log → (Popup nhập captcha nếu AI fail) → Download hoàn tất

3. Xem lịch sử:
   Click "History" → Xem danh sách các batch đã download →
   Chọn batch → Xem chi tiết từng hóa đơn → Retry failed invoices
```

### Edge Cases
- File Excel không có cột "MÃ TRA CỨU" hoặc format khác
- API key hết hạn hoặc không hợp lệ
- Mất kết nối internet giữa chừng
- VNPT website thay đổi cấu trúc HTML
- File PDF đã tồn tại trong thư mục download

## Success Criteria
**How will we know when we're done?**

### Measurable Outcomes
- [ ] App build thành công trên cả macOS và Windows
- [ ] Download được ít nhất 95% hóa đơn trong điều kiện mạng ổn định
- [ ] Thời gian download trung bình < 30s/hóa đơn (bao gồm captcha solving)
- [ ] App không crash trong suốt quá trình download batch > 100 hóa đơn

### Acceptance Criteria
- [ ] Upload và parse thành công file Excel với format VNPT chuẩn
- [ ] Hiển thị đúng danh sách mã tra cứu sau khi upload
- [ ] Giải captcha thành công > 80% với OpenAI GPT-4o-mini
- [ ] Popup manual captcha xuất hiện đúng thời điểm khi AI fail 3 lần
- [ ] Progress bar và log cập nhật real-time
- [ ] Lịch sử được lưu và hiển thị chính xác
- [ ] Settings được persist sau khi đóng app

### Performance Benchmarks
- App startup time: < 3 giây
- Excel parsing: < 5 giây cho file 1000 dòng
- Memory usage: < 500MB trong quá trình download

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical Constraints
- Phải sử dụng Tauri framework (Rust backend + Web frontend)
- Browser automation cần embedded trong app (headless browser)
- Local database chỉ dùng SQLite (không external DB)
- Chỉ hỗ trợ OpenAI API (không Gemini, Claude)

### Business Constraints
- App chỉ dùng internal, không phát hành công khai
- Không yêu cầu license/activation system
- VNPT Invoice URL cố định hoặc có thể cấu hình

### Assumptions
- User đã có OpenAI API key hợp lệ
- File Excel theo format chuẩn của VNPT (có cột "MÃ TRA CỨU HÓA ĐƠN ĐIỆN TỬ")
- VNPT website không thay đổi thường xuyên
- Mỗi máy chỉ 1 user sử dụng (không multi-user)

## Questions & Open Items
**What do we still need to clarify?**

### Resolved
- [x] UI Progress style → Progress bar + log chi tiết
- [x] Captcha fail handling → Auto retry 3x + manual popup
- [x] AI Provider → Chỉ OpenAI
- [x] History feature → Có, lưu SQLite local
- [x] VNPT Invoice URL → Tự detect từ file Excel, nếu không tìm thấy thì dùng config UI
- [x] Pause/Resume → Không cần trong v1.0, chỉ có Start và Cancel
- [x] Selective download → Không cần, download tất cả sau khi preview
- [x] Timeout → 30 giây/hóa đơn (giữ nguyên như script hiện tại)

### Open Questions
_Tất cả câu hỏi đã được giải quyết._
