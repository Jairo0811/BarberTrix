using BarberTurn.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberTurn.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260823170000_Phase2CoreQueue")]
public sealed class Phase2TurnManagement : Migration
{
    private static readonly string[] BarberChairIndexColumns = ["BarberShopId", "ChairNumber"];
    private static readonly string[] BarberStatusIndexColumns = ["BarberShopId", "IsActive", "Status"];
    private static readonly string[] ServiceNameIndexColumns = ["BarberShopId", "Name"];
    private static readonly string[] ServiceStatusIndexColumns = ["BarberShopId", "IsActive"];
    private static readonly string[] TurnSequenceIndexColumns = ["BarberShopId", "QueueDate", "SequenceNumber"];
    private static readonly string[] TurnStatusIndexColumns = ["BarberShopId", "QueueDate", "Status"];

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Barbers",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                ChairNumber = table.Column<int>(type: "int", nullable: false),
                Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Barbers", x => x.Id);
                table.ForeignKey("FK_Barbers_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "BarberServices",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                EstimatedDurationMinutes = table.Column<int>(type: "int", nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_BarberServices", x => x.Id);
                table.ForeignKey("FK_BarberServices_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "Turns",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                QueueDate = table.Column<DateOnly>(type: "date", nullable: false),
                SequenceNumber = table.Column<int>(type: "int", nullable: false),
                CustomerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                CalledAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                ServiceStartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                CompletedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Turns", x => x.Id);
                table.ForeignKey("FK_Turns_Barbers_BarberId", x => x.BarberId, "Barbers", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_Turns_BarberServices_ServiceId", x => x.ServiceId, "BarberServices", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_Turns_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(name: "IX_Barbers_BarberShopId_ChairNumber", table: "Barbers", columns: BarberChairIndexColumns, unique: true);
        migrationBuilder.CreateIndex(name: "IX_Barbers_BarberShopId_IsActive_Status", table: "Barbers", columns: BarberStatusIndexColumns);
        migrationBuilder.CreateIndex(name: "IX_BarberServices_BarberShopId_Name", table: "BarberServices", columns: ServiceNameIndexColumns, unique: true);
        migrationBuilder.CreateIndex(name: "IX_BarberServices_BarberShopId_IsActive", table: "BarberServices", columns: ServiceStatusIndexColumns);
        migrationBuilder.CreateIndex(name: "IX_Turns_BarberId", table: "Turns", column: "BarberId");
        migrationBuilder.CreateIndex(name: "IX_Turns_ServiceId", table: "Turns", column: "ServiceId");
        migrationBuilder.CreateIndex(name: "IX_Turns_BarberShopId_QueueDate_SequenceNumber", table: "Turns", columns: TurnSequenceIndexColumns, unique: true);
        migrationBuilder.CreateIndex(name: "IX_Turns_BarberShopId_QueueDate_Status", table: "Turns", columns: TurnStatusIndexColumns);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Turns");
        migrationBuilder.DropTable(name: "Barbers");
        migrationBuilder.DropTable(name: "BarberServices");
    }
}
