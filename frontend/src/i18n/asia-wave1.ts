import type { Dictionary } from './types'

const d = (language: string, signIn: string, email: string, password: string, demo: string, dashboard: string, logout: string): Dictionary => ({
  'language.label': language,
  'nav.demo': demo,
  'nav.dashboard': dashboard,
  'auth.login.title': signIn,
  'auth.login.email': email,
  'auth.login.password': password,
  'auth.login.submit': signIn,
  'auth.logout': logout,
})

export const asiaWave1: Record<string, Dictionary> = {
  'zh-CN': d('语言', '登录', '电子邮箱', '密码', '演示', '控制面板', '退出登录'),
  'zh-TW': d('語言', '登入', '電子郵件', '密碼', '示範', '控制台', '登出'),
  ja: d('言語', 'ログイン', 'メール', 'パスワード', 'デモ', 'ダッシュボード', 'ログアウト'),
  ko: d('언어', '로그인', '이메일', '비밀번호', '데모', '대시보드', '로그아웃'),
  hi: d('भाषा', 'साइन इन करें', 'ईमेल', 'पासवर्ड', 'डेमो', 'डैशबोर्ड', 'साइन आउट'),
  bn: d('ভাষা', 'সাইন ইন', 'ইমেইল', 'পাসওয়ার্ড', 'ডেমো', 'ড্যাশবোর্ড', 'সাইন আউট'),
  ur: d('زبان', 'سائن اِن', 'ای میل', 'پاس ورڈ', 'ڈیمو', 'ڈیش بورڈ', 'سائن آؤٹ'),
  id: d('Bahasa', 'Masuk', 'Email', 'Kata sandi', 'Demo', 'Dasbor', 'Keluar'),
  ms: d('Bahasa', 'Log masuk', 'E-mel', 'Kata laluan', 'Demo', 'Papan pemuka', 'Log keluar'),
  vi: d('Ngôn ngữ', 'Đăng nhập', 'Email', 'Mật khẩu', 'Bản demo', 'Bảng điều khiển', 'Đăng xuất'),
  th: d('ภาษา', 'เข้าสู่ระบบ', 'อีเมล', 'รหัสผ่าน', 'สาธิต', 'แดชบอร์ด', 'ออกจากระบบ'),
  fil: d('Wika', 'Mag-sign in', 'Email', 'Password', 'Demo', 'Dashboard', 'Mag-sign out'),
  fa: d('زبان', 'ورود', 'ایمیل', 'رمز عبور', 'نسخه نمایشی', 'داشبورد', 'خروج'),
}
