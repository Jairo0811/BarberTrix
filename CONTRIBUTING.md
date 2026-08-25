# Contribuir a BarberTurn

1. Crea una rama desde `main`.
2. Mantén el dominio independiente de ASP.NET Core y Entity Framework.
3. Toda consulta autenticada debe filtrar por el `BarberShopId` del token; nunca confíes en un tenant enviado por el cliente.
4. Añade o actualiza pruebas para reglas de negocio.
5. Ejecuta `dotnet test BarberTurn.sln` y `npm ci && npm run build` en `frontend`.
6. Abre un pull request pequeño, con motivación, riesgos, migraciones y evidencias de validación.

No incluyas secretos, `.env`, credenciales demo ni datos personales reales. Los cambios de esquema requieren una migración EF Core revisable y reversible.
