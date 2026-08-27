import { useI18n } from '../../i18n'

type Props = { title: string; text: string; plan?: string }

export default function LockedFeature({ title, text, plan = 'Pro' }: Props) {
  const { t } = useI18n()
  return <div className="locked-feature-card"><strong>🔒 {title}</strong><span>{text}</span><a href="#billing-section">{t('billing.availableWith', { plan })}</a></div>
}
