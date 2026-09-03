import type { Locale } from './types'
import { getHomeAuxCopy, type LocalizedPlan } from './homeAuxCopy'

type HomeAuxCopy = {
  plans: LocalizedPlan[]
  supportSubject: string
  slogan: string
  terms: string
  privacy: string
}

const eastAsiaHomeAuxCopy: Record<'ko' | 'zh-CN', HomeAuxCopy> = {
  ko: {
    plans: [
      { name: 'Free', price: 'US$0', description: '소규모 바버샵이 카드 등록 없이 BarberTrix을 매일 운영할 수 있습니다.', features: ['월 1,000건 + 50건 여유', '바버 최대 3명', '서비스 무제한', '예약 및 온라인 예약', '필수 알림', '1개월 달력 기준 기록(28~31일)', '공개 QR 및 링크'] },
      { name: 'Pro', price: 'US$40.00', description: '운영, 예약과 고객 경험을 더 자동화하려는 바버샵을 위한 요금제입니다.', features: ['대규모 대기열', '바버 최대 10명', '전체 기록', 'BarberTrix TV', 'CRM 및 현금 관리', '고급 자동화'], featured: true },
      { name: 'Business', price: 'US$70.00', description: '여러 지점, 분석과 기업 수준의 관리가 필요한 운영을 위한 요금제입니다.', features: ['최대 3개 지점', '바버 무제한', 'Pro의 모든 기능', '고급 보고서', '고급 역할 및 감사', '우선 지원'] },
    ],
    supportSubject: '[BarberTrix] 지원 요청',
    slogan: '내 순서. 내 스타일. 내 시간.',
    terms: '이용약관',
    privacy: '개인정보 보호',
  },
  'zh-CN': {
    plans: [
      { name: 'Free', price: 'US$0', description: '适合希望每天使用 BarberTrix 且无需绑定银行卡的小型理发店。', features: ['每月 1,000 次 + 50 次宽限', '最多 3 位理发师', '服务数量不限', '预约和在线预订', '基础通知', '1 个自然月历史记录（28–31 天）', '公开二维码和链接'] },
      { name: 'Pro', price: 'US$40.00', description: '适合希望进一步自动化运营、预约和顾客体验的理发店。', features: ['高容量排队', '最多 10 位理发师', '完整历史记录', 'BarberTrix TV', 'CRM 和现金管理', '高级自动化'], featured: true },
      { name: 'Business', price: 'US$70.00', description: '适合多门店、分析和企业级管理需求。', features: ['最多 3 家门店', '理发师数量不限', '包含 Pro 全部功能', '高级报表', '高级角色与审计', '优先支持'] },
    ],
    supportSubject: '[BarberTrix] 支持请求',
    slogan: '你的顺序。你的风格。你的时间。',
    terms: '服务条款',
    privacy: '隐私',
  },
}

export function getProductHomeAuxCopy(locale: Locale): HomeAuxCopy {
  if (locale === 'ko' || locale === 'zh-CN') return eastAsiaHomeAuxCopy[locale]
  return getHomeAuxCopy(locale)
}

export { eastAsiaHomeAuxCopy }
