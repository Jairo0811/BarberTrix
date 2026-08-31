# Caja 2.0

Caja 2.0 convierte el registro simple de pagos en un flujo operativo de apertura, movimientos, conciliación y cierre por turno.

## Alcance

- apertura de caja con moneda y fondo inicial;
- una sola caja abierta por barbería;
- moneda fija por sesión;
- registro de pagos cash, tarjeta y transferencia;
- entradas y salidas manuales con motivo obligatorio;
- efectivo esperado calculado en tiempo real;
- efectivo contado y diferencia al cierre;
- historial de sesiones recientes;
- reembolsos de pagos;
- reembolsos cash convertidos automáticamente en salida de efectivo;
- aislamiento multi-tenant por `barberShopId`;
- acceso limitado a Owner, Administrator y Receptionist.

## Modelo de conciliación

Para una sesión de moneda única:

```text
ExpectedCash = OpeningBalance + CashSales + CashIn - CashOut
Difference   = CountedCash - ExpectedCash
```

Las ventas no efectivas se muestran como contexto operativo, pero no forman parte del efectivo esperado.

## Persistencia

No se añadió una migración ni tablas nuevas en esta fase. Las sesiones de caja se representan mediante eventos financieros append-only en `AuditLogs`:

- `CashSessionOpened`
- `CashMovementAdded`
- `CashSessionClosed`
- `PaymentRefunded`

Cada sesión usa un `ResourceId` UUID estable. El estado se reconstruye a partir de esos eventos y de los `PaymentRecord` existentes.

Esta decisión reutiliza el mecanismo de trazabilidad ya desplegado, evita duplicar un segundo historial mutable y mantiene la fase acotada. Si en el futuro se requieren múltiples cajas simultáneas por sucursal, arqueos firmados, cierres fiscales o consultas analíticas de alto volumen, el siguiente paso será promover las sesiones a agregados persistentes dedicados con su propia migración.

## Integridad

Las operaciones críticas usan transacciones `Serializable` para evitar aperturas concurrentes inconsistentes.

Un pago en efectivo:

1. requiere una caja abierta;
2. debe usar la misma moneda de la caja;
3. queda incluido en `CashSales` de la sesión.

Un reembolso en efectivo:

1. requiere una caja abierta;
2. requiere que la moneda coincida con la sesión;
3. cambia el pago a `Refunded`;
4. agrega una salida de caja por el mismo monto.

Con esto la venta bruta sigue siendo trazable y la devolución física queda reflejada explícitamente en el arqueo.

## Endpoints

```text
GET  /api/cash/current
GET  /api/cash/sessions?take=10
POST /api/cash/open
POST /api/cash/movements
POST /api/cash/close
POST /api/payments/{id}/refund
```

El endpoint existente `POST /api/payments` ahora valida la sesión para pagos en efectivo.

## UI

La ruta administrativa continúa siendo:

```text
#/app/payments
```

El workspace presenta:

- estado de caja;
- fondo inicial;
- ventas cash/no-cash;
- entradas y salidas;
- efectivo esperado;
- formularios de pago y movimiento;
- cierre con diferencia previa al envío;
- historial de pagos y reembolsos;
- historial de cierres.
