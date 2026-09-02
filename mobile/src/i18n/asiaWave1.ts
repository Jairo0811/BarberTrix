import type { Dictionary } from './types';

const d = (title: string, email: string, password: string, submit: string, hello: string, requests: string, signOut: string, enable: string): Dictionary => ({
  'login.title': title,
  'login.email': email,
  'login.password': password,
  'login.submit': submit,
  'home.hello': hello,
  'home.requests': requests,
  'home.signOut': signOut,
  'push.enable': enable,
});

export const asiaWave1Mobile: Record<string, Dictionary> = {
  'zh-CN': d('你的理发店，也在你的口袋里。', '电子邮箱', '密码', '登录', '你好，{{name}}。', '排队请求', '退出登录', '启用通知'),
  'zh-TW': d('你的理髮店，也在你的口袋裡。', '電子郵件', '密碼', '登入', '你好，{{name}}。', '排隊請求', '登出', '啟用通知'),
  ja: d('あなたのバーバーショップをポケットに。', 'メール', 'パスワード', 'ログイン', 'こんにちは、{{name}}。', '順番リクエスト', 'ログアウト', '通知を有効にする'),
  ko: d('내 바버샵을 주머니 속에서도.', '이메일', '비밀번호', '로그인', '안녕하세요, {{name}}.', '대기 요청', '로그아웃', '알림 사용'),
  hi: d('आपकी बार्बरशॉप, आपकी जेब में भी।', 'ईमेल', 'पासवर्ड', 'साइन इन करें', 'नमस्ते, {{name}}।', 'टर्न अनुरोध', 'साइन आउट', 'सूचनाएँ चालू करें'),
  bn: d('আপনার বারবারশপ, এখন আপনার পকেটেও।', 'ইমেইল', 'পাসওয়ার্ড', 'সাইন ইন', 'হ্যালো, {{name}}।', 'টার্ন অনুরোধ', 'সাইন আউট', 'নোটিফিকেশন চালু করুন'),
  ur: d('آپ کی باربر شاپ، آپ کی جیب میں بھی۔', 'ای میل', 'پاس ورڈ', 'سائن اِن', 'سلام، {{name}}۔', 'باری کی درخواستیں', 'سائن آؤٹ', 'اطلاعات فعال کریں'),
  id: d('Barbershop Anda, juga di saku Anda.', 'Email', 'Kata sandi', 'Masuk', 'Halo, {{name}}.', 'Permintaan antrean', 'Keluar', 'Aktifkan notifikasi'),
  ms: d('Barbershop anda, juga dalam poket anda.', 'E-mel', 'Kata laluan', 'Log masuk', 'Hai, {{name}}.', 'Permintaan giliran', 'Log keluar', 'Aktifkan pemberitahuan'),
  vi: d('Tiệm cắt tóc của bạn, ngay trong túi bạn.', 'Email', 'Mật khẩu', 'Đăng nhập', 'Xin chào, {{name}}.', 'Yêu cầu lượt', 'Đăng xuất', 'Bật thông báo'),
  th: d('ร้านตัดผมของคุณ อยู่ในกระเป๋าคุณด้วย', 'อีเมล', 'รหัสผ่าน', 'เข้าสู่ระบบ', 'สวัสดี {{name}}', 'คำขอคิว', 'ออกจากระบบ', 'เปิดการแจ้งเตือน'),
  fil: d('Ang barbershop mo, nasa bulsa mo rin.', 'Email', 'Password', 'Mag-sign in', 'Kumusta, {{name}}.', 'Mga request sa pila', 'Mag-sign out', 'I-enable ang notifications'),
  fa: d('آرایشگاه شما، در جیب شما هم هست.', 'ایمیل', 'رمز عبور', 'ورود', 'سلام، {{name}}.', 'درخواست‌های نوبت', 'خروج', 'فعال‌کردن اعلان‌ها'),
};
