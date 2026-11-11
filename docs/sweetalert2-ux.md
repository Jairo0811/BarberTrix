# SweetAlert2 — BarberTrix Web

BarberTrix ya dependía de SweetAlert2 antes de esta actualización. Esta fase consolida su experiencia en una única capa (`frontend/src/alerts.ts`), sin añadir versiones ni paquetes duplicados.

## Flujos cubiertos

- Confirmación de cancelación inmediata de suscripción (no se llama al API si el usuario desiste).
- Confirmación de desactivación de usuarios del equipo y servicios.
- Confirmación de cancelación y *no-show* de citas administrativas.
- Confirmación de revocación de pantallas BarberTrix TV.
- Confirmación de cancelación de turnos/citas web públicas, sin exponer tokens.
- Se mantienen confirmaciones ya existentes de cola, cierre de caja y devoluciones; y toasts/errores de CRM, servicios, clientes y otras operaciones.

## Experiencia y seguridad

- Modal de diseño oscuro BarberTrix con colores de marca, responsive, contraste y `focus-visible`.
- Etiquetas de acción según `<html lang>` del selector existente (idiomas principales; inglés de respaldo).
- Los diálogos usan `text`, no HTML interpretado, para evitar inyección de contenido de API o clientes.
- Acción potencialmente irreversible: **Cancelar** toma el foco inicial y un clic externo no autoriza la operación. La API solo se ejecuta después de `isConfirmed === true`.
- Toast de éxito no bloqueante de 3 segundos; sin usarlo como único reporte de error crítico.
- Se conservan mensajes en línea donde aportan información accesible, especialmente el flujo de reservas y los errores del backend.
- No cambia el stack móvil Expo ni la semántica de negocio/API.

## QA

`cd frontend && npm ci && npm run test:run && npm run build`

Además de `alerts.test.ts`, CI ejecuta Playwright y full-stack E2E. Antes de desplegar, revisar visualmente en móvil y desktop, teclado (foco/ESC/cancelación), lectores de pantalla y traducciones.
