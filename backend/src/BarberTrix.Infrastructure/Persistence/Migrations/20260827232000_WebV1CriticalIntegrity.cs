using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace BarberTrix.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260827232000_WebV1CriticalIntegrity")]
public sealed class WebV1CriticalIntegrity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PayPalWebhookReceipts",
            columns: table => new
            {
                EventId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                EventType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                ProviderResourceId = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                OccurredAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                ProcessedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                WasApplied = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PayPalWebhookReceipts", x => x.EventId);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PayPalWebhookReceipts_ProviderResourceId_OccurredAtUtc",
            table: "PayPalWebhookReceipts",
            columns: new[] { "ProviderResourceId", "OccurredAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PayPalWebhookReceipts");
    }
}
