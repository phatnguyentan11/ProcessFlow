# Process Files

This folder contains all process JSON files for the in-house app workflow.

## Process Files

| File | Name | Order | Status |
|------|------|-------|--------|
| `task-reception.json` | Nhận Task | 1 | Active |
| `brs-dd-reception.json` | Tiếp nhận tài liệu BRS/DD | 2 | Active |
| `planning.json` | Planning & Estimation | 3 | Active |
| `golive-3rd-party.json` | Tích hợp 3rd-Party | 4 | Active |
| `development.json` | Development (TDD) | 5 | Active |
| `golive-init.json` | Giai đoạn 1: Khởi tạo & Thu thập thông tin | 6 | Active |
| `golive-prep.json` | Giai đoạn 2: Mail Checklist Golive | 7 | Active |
| `golive-pentest.json` | Giai đoạn 3: Mail Pentest Golive | 8 | Active |
| `golive-change.json` | Giai đoạn 4: Cập nhật change item | 9 | Active |
| `golive-exec.json` | Giai đoạn 5: Thực thi Go-live | 10 | Active |
| `bug-fix.json` | Bug Fix (Normal) | 11 | Active |
| `hotfix.json` | Hotfix | 12 | Active |

## Thứ tự ưu tiên tài liệu

```
Quyết định Team / Tech Lead   >   DD (từ Lead)   >   BRS (từ BA)   >   các bản cũ
```

- Luôn giữ **tất cả** version; bản làm theo luôn là bản **cuối cùng**.
- Yêu cầu mới phải vào BRS/DD trước, dev làm sau. Ngoại lệ duy nhất là quyết định của Lead — phải ghi nhận lại.
- DD ít version và hiếm khi đổi; BRS nhiều version và thay đổi thường xuyên.
- **Tài liệu thay đổi = tiếp nhận lại.** Không có quy trình riêng cho việc thay đổi — mọi lần BA sửa BRS hay Lead sửa DD đều chạy lại `brs-dd-reception.json` (bước 6–8 dành riêng cho lần tiếp nhận lại).

## Structure

Each process file follows this structure:

```json
{
  "id": "process-name",
  "name": "Process Name",
  "version": "1.0.0",
  "description": "Description",
  "lastUpdated": "2026-07-23",
  "order": 1,
  "status": "active",
  "whenToApply": "When to use this process",
  "workflow": [...],
  "outputs": [...],
  "checklist": [...],
  "notes": [...]
}
```

## Updating Processes

1. Edit the process JSON file directly
2. Keep the `id` and `order` fields unchanged
3. Update `lastUpdated` date
4. Update version if breaking changes

## Master Process

Main process file: `docs/process.json` - references all process files.