import type { Dictionary } from './types'
import type { OfficialLocale } from './officialLocales'

type TvAudioSupplement = Record<OfficialLocale, Dictionary>

export const tvAudioSupplement: TvAudioSupplement = {
  'es-419': {
    'tv.audioOn': 'Audio activado',
    'tv.audioOff': 'Audio silenciado',
    'tv.audioVolume': 'Volumen',
    'tv.audioTest': 'Probar audio',
  },
  en: {
    'tv.audioOn': 'Audio on',
    'tv.audioOff': 'Audio muted',
    'tv.audioVolume': 'Volume',
    'tv.audioTest': 'Test audio',
  },
  'pt-BR': {
    'tv.audioOn': 'Áudio ativado',
    'tv.audioOff': 'Áudio silenciado',
    'tv.audioVolume': 'Volume',
    'tv.audioTest': 'Testar áudio',
  },
  fr: {
    'tv.audioOn': 'Audio activé',
    'tv.audioOff': 'Audio coupé',
    'tv.audioVolume': 'Volume',
    'tv.audioTest': 'Tester l’audio',
  },
  ht: {
    'tv.audioOn': 'Odyo aktive',
    'tv.audioOff': 'Odyo etenn',
    'tv.audioVolume': 'Volim',
    'tv.audioTest': 'Teste odyo',
  },
  de: {
    'tv.audioOn': 'Audio aktiviert',
    'tv.audioOff': 'Audio stumm',
    'tv.audioVolume': 'Lautstärke',
    'tv.audioTest': 'Audio testen',
  },
  it: {
    'tv.audioOn': 'Audio attivo',
    'tv.audioOff': 'Audio disattivato',
    'tv.audioVolume': 'Volume',
    'tv.audioTest': 'Prova audio',
  },
  ja: {
    'tv.audioOn': '音声オン',
    'tv.audioOff': '音声ミュート',
    'tv.audioVolume': '音量',
    'tv.audioTest': '音声をテスト',
  },
  ko: {
    'tv.audioOn': '오디오 켜짐',
    'tv.audioOff': '오디오 음소거',
    'tv.audioVolume': '볼륨',
    'tv.audioTest': '오디오 테스트',
  },
  'zh-CN': {
    'tv.audioOn': '音频已开启',
    'tv.audioOff': '音频已静音',
    'tv.audioVolume': '音量',
    'tv.audioTest': '测试音频',
  },
}
