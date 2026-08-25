export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const privacy = kind === 'privacy'
  return <main className="login-shell"><article className="login-card legal-card">
    <a className="back-home-link" href="#/">← Volver al inicio</a>
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>{privacy ? 'Aviso de privacidad' : 'Términos de servicio'}</h1>
    <p className="login-subtitle">Última actualización: 25 de agosto de 2026.</p>
    {privacy ? <>
      <p>BarberTurn procesa los datos necesarios para administrar usuarios, clientes, turnos, citas y pagos registrados. Esto puede incluir nombre, correo, teléfono, actividad operativa, dirección IP y metadatos técnicos de sesión.</p>
      <p>La información se usa para prestar y proteger el servicio, autenticar usuarios, enviar comunicaciones transaccionales y generar reportes. Los datos de tarjeta son procesados por PayPal y no deben almacenarse en BarberTurn.</p>
      <p>Aplicamos aislamiento por barbería, permisos por rol, controles de sesión y auditoría. Los datos se conservan durante la vigencia de la cuenta y cuando sea necesario por seguridad u obligaciones legales. Las sesiones demo se eliminan automáticamente.</p>
      <p>El titular puede solicitar acceso, corrección, exportación o eliminación mediante el canal de soporte publicado por el operador.</p>
    </> : <>
      <p>BarberTurn ofrece software para administrar filas, citas, clientes, equipo, caja y reportes. La barbería conserva la responsabilidad sobre sus servicios, precios, personal, impuestos y uso lícito de los datos.</p>
      <p>El titular debe proporcionar información veraz, proteger credenciales y asignar permisos adecuados. Está prohibido interferir con el servicio, acceder a otros tenants o usar la plataforma para actividades ilícitas.</p>
      <p>Los planes y límites se muestran antes de contratar. Las suscripciones se procesan mediante PayPal y pueden cancelarse desde el panel. La falta de pago puede limitar o suspender funciones.</p>
      <p>El servicio puede cambiar por seguridad o mejora operativa y no se garantiza disponibilidad ininterrumpida donde la ley permita esa limitación.</p>
    </>}
    <p><small>Este texto es un borrador operativo y debe adaptarse con asesoría legal antes del lanzamiento público.</small></p>
  </article></main>
}
