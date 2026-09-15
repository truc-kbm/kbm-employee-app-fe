# KBM Employee App Frontend

Frontend React + TypeScript + Vite cho KBM Employee App. Giao diện responsive theo design handoff, có đăng nhập Google, kiểm tra domain `@kingbanhmi.com`, màn hình ca làm việc, SOPs Chat Bot và song ngữ EN/VI.

## Chạy local

Yêu cầu Node.js 22.12 trở lên. Trên máy hiện tại có thể dùng Node 22 đã cài qua Homebrew:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
```

Lấy Firebase Web API key tại Firebase Console → Project settings → General → Your apps →
Web app → SDK setup and configuration, rồi thay `REPLACE_WITH_FIREBASE_WEB_API_KEY` trong
`.env.local`. Không điền private key, service-account key, Dify key hoặc token vào `VITE_*`.

```bash
npm run dev
```

Mở `http://localhost:3000/login`. Các route chính là `/login`, `/welcome` và `/sops-chat`.

Mở `http://localhost:3000/dev/token`. Mặc định app dùng backend/proxy ở
`http://localhost:8080/api/v1`; đổi URL trong `.env.local` rồi restart nếu cần.

## Dùng token với Swagger

1. Đăng nhập Google và copy token trên `/dev/token`.
2. Swagger → Authorize → dán token thuần, không thêm `Bearer`.
3. Gọi `POST /api/v1/auth/google`, sau đó gọi `GET /api/v1/me`.

Production mặc định chặn `/dev/token`, kể cả khi mở URL trực tiếp. Firebase login thành công
chưa chứng minh tài khoản đã được backend cấp quyền KBM.

## Publish lên Railway

1. Tạo service từ GitHub repository này.
2. Thêm các biến `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` và `VITE_API_BASE_URL` trong Railway Variables.
3. Generate Domain cho service, sau đó thêm domain Railway đó vào Firebase Authentication → Settings → Authorized domains.
4. Railway tự dùng `railway.json` để build và chạy ứng dụng.

Các biến `VITE_*` được đóng vào frontend lúc build. Không đặt service-account key, private key hay secret backend trong các biến này.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```
