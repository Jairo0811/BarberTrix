using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace BarberTrix.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260828223000_MobileM3PushNotifications")]
public sealed class MobileM3PushNotifications : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PushSubscriptions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                TurnRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                InstallationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                ExpoPushToken = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Platform = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false),
                LastSeenAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PushSubscriptions", x => x.Id);
                table.CheckConstraint(
                    "CK_PushSubscriptions_ExactlyOneOwner",
                    "([UserId] IS NOT NULL AND [TurnRequestId] IS NULL) OR ([UserId] IS NULL AND [TurnRequestId] IS NOT NULL)");
                table.ForeignKey("FK_PushSubscriptions_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_PushSubscriptions_TurnRequests_TurnRequestId", x => x.TurnRequestId, "TurnRequests", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_PushSubscriptions_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "PushNotificationOutbox",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                PushSubscriptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Body = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                Route = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                AttemptCount = table.Column<int>(type: "int", nullable: false),
                AvailableAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                ProcessingStartedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                AcceptedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                ExpoTicketId = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                LastError = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PushNotificationOutbox", x => x.Id);
                table.ForeignKey("FK_PushNotificationOutbox_PushSubscriptions_PushSubscriptionId", x => x.PushSubscriptionId, "PushSubscriptions", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PushSubscriptions_BarberShopId_IsActive",
            table: "PushSubscriptions",
            columns: new[] { "BarberShopId", "IsActive" });
        migrationBuilder.CreateIndex(
            name: "IX_PushSubscriptions_TurnRequestId_InstallationId",
            table: "PushSubscriptions",
            columns: new[] { "TurnRequestId", "InstallationId" },
            unique: true,
            filter: "[TurnRequestId] IS NOT NULL");
        migrationBuilder.CreateIndex(
            name: "IX_PushSubscriptions_UserId_InstallationId",
            table: "PushSubscriptions",
            columns: new[] { "UserId", "InstallationId" },
            unique: true,
            filter: "[UserId] IS NOT NULL");
        migrationBuilder.CreateIndex(
            name: "IX_PushNotificationOutbox_PushSubscriptionId",
            table: "PushNotificationOutbox",
            column: "PushSubscriptionId");
        migrationBuilder.CreateIndex(
            name: "IX_PushNotificationOutbox_Status_AvailableAtUtc",
            table: "PushNotificationOutbox",
            columns: new[] { "Status", "AvailableAtUtc" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PushNotificationOutbox");
        migrationBuilder.DropTable(name: "PushSubscriptions");
    }
}
#pragma warning restore CA1861
