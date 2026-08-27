type Props = { title: string; text: string; plan?: string }

export default function LockedFeature({ title, text, plan = 'Pro' }: Props) {
  return <div className="locked-feature-card"><strong>🔒 {title}</strong><span>{text}</span><a href="#billing-section">Disponible con BarberTurn {plan}</a></div>
}
