const messages: Record<string, string> = {
  'auth/unauthorized-domain': 'Hostname này chưa có trong Firebase Authorized domains. Hãy thêm đúng hostname rồi thử lại.',
  'auth/invalid-api-key': 'Firebase API key không hợp lệ. Hãy kiểm tra Web config, không sử dụng khóa quản trị.',
  'auth/operation-not-allowed': 'Google provider chưa được bật trong Firebase Authentication.',
  'auth/popup-blocked': 'Trình duyệt đã chặn popup. Hãy cho phép popup rồi bấm đăng nhập lại.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập. Có thể bấm đăng nhập để thử lại.',
  'auth/network-request-failed': 'Không thể kết nối Firebase. Hãy kiểm tra mạng rồi thử lại.',
  'auth/app-not-authorized': 'Web app này chưa được phép dùng Firebase Authentication. Hãy kiểm tra API key restrictions và Firebase Web app.',
  'auth/configuration-not-found': 'Firebase Authentication hoặc Google provider chưa được cấu hình cho project này.',
  'auth/cancelled-popup-request': 'Một cửa sổ đăng nhập khác đã được mở. Hãy đóng cửa sổ cũ rồi thử lại.',
  'auth/account-exists-with-different-credential': 'Email này đã tồn tại với một phương thức đăng nhập khác trong Firebase.',
  'auth/web-storage-unsupported': 'Trình duyệt đang chặn storage cần thiết cho luồng đăng nhập popup.',
  'auth/internal-error': 'Firebase gặp lỗi nội bộ. Hãy kiểm tra API key, Authorized domains và Google provider.',
  'auth/argument-error': 'Frontend chưa khởi tạo đúng thành phần đăng nhập popup của Firebase.',
}

export function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : undefined
  if (!code) return 'Đăng nhập không thành công. Vui lòng thử lại.'
  const message = messages[code] ?? 'Firebase từ chối đăng nhập. Hãy dùng mã lỗi bên dưới để kiểm tra cấu hình.'
  return `${message} (Mã: ${code})`
}
