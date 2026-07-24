# WorkHub — Quy trình & Task Tracker

Ứng dụng web quản lý **quy trình làm việc** và **task/feature** của team.
Chạy bằng **Node.js thuần** — không cần cài thư viện, không cần build.

---

## Yêu cầu

- **Node.js ≥ 18** (dùng `for await...of`, `fsp.rm`, `fs.promises`).
  Kiểm tra: `node -v`

Không cần `npm install` — dự án không có dependency ngoài.

---

## Chạy nhanh

Từ thư mục gốc dự án:

```bash
node server.js
```

Sau đó mở trình duyệt: **http://localhost:8080**

Dừng server: `Ctrl + C`.

---

## Biến môi trường

| Biến           | Mặc định        | Ý nghĩa                                  |
|----------------|-----------------|------------------------------------------|
| `PORT`         | `8080`          | Cổng HTTP của server                     |
| `WORKHUB_DATA` | `./tasks`       | Thư mục lưu dữ liệu task + attachment     |

### Ví dụ

**PowerShell (Windows):**

```powershell
$env:PORT = "3000"; node server.js
$env:WORKHUB_DATA = "D:\data\workhub"; node server.js
```

**bash / macOS / Linux:**

```bash
PORT=3000 node server.js
WORKHUB_DATA=/path/to/data node server.js
```

---

## Cấu trúc thư mục

```
.
├── server.js          # Server Node thuần: phục vụ web tĩnh + API task
├── index.html         # Trang chính (SPA)
├── assets/
│   ├── css/           # styles.css
│   └── js/            # app, tasks, processes, storage, apistore, pipeline
├── processes/         # Định nghĩa các quy trình (JSON)
└── tasks/             # Dữ liệu task được lưu tại đây (mỗi task 1 thư mục)
```

Mỗi task lưu thành `tasks/<task-id>/task.json`; file đính kèm nằm trong `tasks/<task-id>/files/`.

---

## API (tóm tắt)

Server cung cấp REST API để lưu/đọc task:

| Method   | Endpoint                              | Chức năng                        |
|----------|---------------------------------------|----------------------------------|
| `GET`    | `/api/info`                           | Thông tin thư mục dữ liệu         |
| `GET`    | `/api/tasks`                          | Lấy toàn bộ task                  |
| `PUT`    | `/api/tasks/:id`                      | Tạo / cập nhật một task           |
| `DELETE` | `/api/tasks/:id`                      | Xóa một task                     |
| `POST`   | `/api/tasks/:id/files?name=...`       | Upload file đính kèm              |
| `GET`    | `/api/tasks/:id/files/:storedAs`      | Tải / xem file đính kèm           |

---

## Ghi chú

- Dữ liệu task lưu trực tiếp dạng file JSON trong `tasks/` — có thể sao lưu bằng cách copy thư mục.
- Trong giao diện có nút **Export** / **Import** để sao lưu và nạp lại toàn bộ task qua file JSON.
