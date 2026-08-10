# MVP de BarberTurn

## Objetivo

Validar que una barbería pueda sustituir una fila informal por un flujo digital simple, rápido y comprensible, sin requerir una agenda completa ni registrar obligatoriamente a cada cliente.

## Actores iniciales

### Administrador

Configura la barbería, barberos, servicios y parámetros operativos.

### Barbero

Consulta su fila, llama al siguiente cliente, inicia una atención y la finaliza.

### Recepción

Puede crear turnos y asignarlos según las reglas configuradas.

### Cliente

Obtiene un turno y consulta el estado de la fila. El MVP permitirá turnos sin cuenta de usuario.

## Casos de uso principales

1. Crear un turno.
2. Elegir servicio.
3. Elegir barbero específico o cualquiera disponible.
4. Consultar posición aproximada en la fila.
5. Llamar al siguiente turno.
6. Marcar un turno como en atención.
7. Finalizar un turno.
8. Cancelar un turno.
9. Marcar un cliente como no presentado.
10. Mostrar el estado de la fila en BarberTurn TV.

## Reglas iniciales

- Todo turno pertenece a una barbería.
- Un turno solo puede encontrarse en un estado válido.
- Un turno completado no puede volver a la fila.
- Un barbero no debe tener más de una atención activa simultáneamente.
- Un cliente puede pedir un barbero específico o aceptar el próximo disponible.
- Los turnos anónimos deben ser válidos.
- El código visible del turno no debe utilizarse como identificador interno de seguridad.
- Las operaciones internas siempre deben validar la barbería autorizada.

## Fuera del MVP

Estas capacidades se posponen deliberadamente:

- Pagos en línea.
- Suscripciones SaaS.
- Aplicaciones móviles nativas.
- Programa de fidelidad.
- Nómina y comisiones avanzadas.
- Inventario de productos.
- Marketplace de barberías.

Posponer estas funciones permite validar primero el problema central: gestionar turnos con menos fricción.

## Criterio de éxito técnico

La Fase 2 se considerará funcional cuando sea posible ejecutar el flujo completo `Waiting -> Called -> InService -> Completed`, mantener aislamiento por barbería y reflejar los cambios de estado de forma consistente para todos los clientes conectados.
