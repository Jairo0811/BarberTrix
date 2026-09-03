using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace BarberTrix.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260828165000_MobileM2TurnRequests")]
public sealed class MobileM2TurnRequests : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "TurnRequests",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                AppointmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                RequestedStartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CounterProposedStartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                CustomerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                CustomerPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                CustomerEmail = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                PublicLookupTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                RespondedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TurnRequests", x => x.Id);
                table.ForeignKey("FK_TurnRequests_Appointments_AppointmentId", x => x.AppointmentId, "Appointments", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_TurnRequests_Barbers_BarberId", x => x.BarberId, "Barbers", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_TurnRequests_BarberServices_ServiceId", x => x.ServiceId, "BarberServices", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_TurnRequests_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_TurnRequests_Customers_CustomerId", x => x.CustomerId, "Customers", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(name: "IX_TurnRequests_AppointmentId", table: "TurnRequests", column: "AppointmentId");
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_BarberId", table: "TurnRequests", column: "BarberId");
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_CustomerId", table: "TurnRequests", column: "CustomerId");
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_PublicLookupTokenHash", table: "TurnRequests", column: "PublicLookupTokenHash", unique: true);
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_ServiceId", table: "TurnRequests", column: "ServiceId");
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_BarberShopId_ExpiresAtUtc", table: "TurnRequests", columns: new[] { "BarberShopId", "ExpiresAtUtc" });
        migrationBuilder.CreateIndex(name: "IX_TurnRequests_BarberShopId_BarberId_Status_CreatedAtUtc", table: "TurnRequests", columns: new[] { "BarberShopId", "BarberId", "Status", "CreatedAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "TurnRequests");
    }
}
