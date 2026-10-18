# Candidate onboarding import: privacy and unsupported assets

`POST /api/v1/candidate/profile/import-onboarding` dùng access token và draft của tài khoản hiện tại. Request tương thích ngược:

```json
{ "version": 3, "confirmPrivacy": true }
```

Khi draft chứa avatar/CV chưa có storage backend, ứng viên có thể xác nhận bỏ qua **chỉ hai nhóm asset này**:

```json
{ "version": 3, "confirmPrivacy": true, "confirmOmitUnsupportedAssets": true }
```

`confirmOmitUnsupportedAssets` là boolean optional. Không cần gửi khi draft không có asset. `confirmPrivacy` luôn phải là `true` và xác nhận ứng viên đã được thông báo về trạng thái riêng tư ban đầu; nó không bật công khai hồ sơ. Nếu một trong năm lựa chọn privacy của draft khác trạng thái ban đầu, Backend trả `400 CANDIDATE_IMPORT_PRIVACY_DIFFERENCES` kèm `details.privacyDifferences` và `details.initialPrivacy`. Sau khi trình bày từng khác biệt và nhận xác nhận riêng của người dùng, gửi thêm `"confirmPrivacyDifferences": true`. Xác nhận này không thay thế `confirmPrivacy`.

## Privacy handoff cho CP8C

CP8C cần lấy `data.privacy` và `version` từ `GET /api/v1/candidate/onboarding-draft`, hiển thị summary và so sánh **từng field** với trạng thái sẽ được tạo trước khi cho phép ứng viên xác nhận import:

| Field trong draft | Giá trị CandidatePrivacySetting khi import |
| --- | --- |
| `searchableProfile` | `false` |
| `showEmail` | `false` |
| `showPhone` | `false` |
| `allowResumeDownload` | `false` |
| `allowJobMatching` | `true` |

Field khác biệt khi giá trị trong draft không bằng giá trị ở cột phải. CP8C phải nêu rõ từng khác biệt, kể cả trường hợp `allowJobMatching` trong draft là `false`, rồi mới gửi `confirmPrivacyDifferences: true` cùng `confirmPrivacy: true`. Backend kiểm tra đủ năm giá trị boolean nhưng **không áp dụng** chúng vào profile. Draft giữ nguyên; ứng viên có thể điều chỉnh privacy sau import bằng API privacy hiện có.

## Unsupported asset handoff cho CP8C

Backend phân loại `avatar` khi `personal.avatarUrl` không rỗng. Backend phân loại `resume` khi một trong `resume.resumeName`, `resume.resumeUrl`, `resume.fileName`, `resume.mimeType` không rỗng, `resume.fileSize` khác `null`, hoặc `resume.hasExistingResume` là `true`. Riêng `resume.createLater` là trạng thái UI, không đại diện cho asset.

Nếu có asset mà request chưa gửi `confirmOmitUnsupportedAssets: true`, backend trả HTTP 400:

```json
{
  "code": "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
  "message": "Confirm omission of unsupported onboarding assets before importing.",
  "details": { "unsupportedAssets": ["avatar", "resume"] }
}
```

API error filter còn thêm `traceId`, `path`, `timestamp`. Lỗi chỉ chứa tên nhóm, không chứa URL, tên file, nội dung file hay dữ liệu cá nhân. CP8C phải cho ứng viên thấy các asset sẽ không được chuyển trước khi gửi cờ xác nhận. Nếu đã xác nhận, import chỉ bỏ qua các asset đó; các field profile khác vẫn được validate và lưu bình thường. API không tạo `avatarAssetKey`, `Resume` hoặc metadata giả. Response 201 giữ nguyên dạng CandidateProfile hiện có, gồm `privacySetting`; không có warning field mới. Draft luôn được giữ nguyên.
