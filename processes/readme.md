# Process Files

This folder contains all process JSON files for the in-house app workflow.

## Process Files

| File | Name | Order | Status |
|------|------|-------|--------|
| `task-reception.json` | Nhận Task | 1 | Active |
| `planning.json` | Planning & Estimation | 2 | Active |
| `development.json` | Development (TDD) | 3 | Active |
| `golive-3rd-party.json` | Tích hợp 3rd-Party | 4 | Active |
| `golive-init.json` | Giai đoạn 1: Khởi tạo & Thu thập thông tin | 5 | Active |
| `golive-prep.json` | Giai đoạn 2: Mail Checklist Golive | 6 | Active |
| `golive-pentest.json` | Giai đoạn 3: Mail Pentest Golive | 7 | Active |
| `golive-change.json` | Giai đoạn 4: Cập nhật change item | 8 | Active |
| `golive-exec.json` | Giai đoạn 5: Thực thi Go-live | 9 | Active |
| `bug-fix.json` | Bug Fix (Normal) | 10 | Active |
| `hotfix.json` | Hotfix | 11 | Active |

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