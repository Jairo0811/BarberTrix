using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace BarberTrix.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260825120000_CommercialReadiness")]
public sealed class CommercialReadiness : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("TimeZoneId", "BarberShops", type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "America/Santo_Domingo");
        migrationBuilder.AddColumn<string>("Plan", "BarberShops", type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pro");
        migrationBuilder.AddColumn<string>("SubscriptionStatus", "BarberShops", type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Trialing");
        migrationBuilder.AddColumn<DateTimeOffset>("TrialEndsAtUtc", "BarberShops", type: "datetimeoffset", nullable: true);

        migrationBuilder.AddColumn<Guid>("BarberId", "Users", type: "uniqueidentifier", nullable: true);
        migrationBuilder.AddColumn<bool>("IsEmailVerified", "Users", type: "bit", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<string>("SecurityStamp", "Users", type: "nvarchar(64)", maxLength: 64, nullable: false, defaultValueSql: "LOWER(REPLACE(CONVERT(nvarchar(36), NEWID()), '-', ''))");
        migrationBuilder.CreateIndex("IX_Users_BarberId", "Users", "BarberId");
        migrationBuilder.AddForeignKey("FK_Users_Barbers_BarberId", "Users", "BarberId", "Barbers", principalColumn: "Id", onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddColumn<byte[]>("RowVersion", "Barbers", type: "rowversion", rowVersion: true, nullable: false);
        migrationBuilder.AddColumn<byte[]>("RowVersion", "BarberServices", type: "rowversion", rowVersion: true, nullable: false);
        migrationBuilder.AddColumn<string>("CustomerPhone", "Turns", type: "nvarchar(40)", maxLength: 40, nullable: true);
        migrationBuilder.AddColumn<string>("PublicLookupTokenHash", "Turns", type: "nvarchar(64)", maxLength: 64, nullable: true);
        migrationBuilder.AddColumn<string>("IdempotencyKey", "Turns", type: "nvarchar(100)", maxLength: 100, nullable: true);
        migrationBuilder.AddColumn<Guid>("AppointmentId", "Turns", type: "uniqueidentifier", nullable: true);
        migrationBuilder.AddColumn<byte[]>("RowVersion", "Turns", type: "rowversion", rowVersion: true, nullable: false);
        migrationBuilder.CreateIndex("IX_Turns_BarberShopId_IdempotencyKey", "Turns", new[] { "BarberShopId", "IdempotencyKey" }, unique: true, filter: "[IdempotencyKey] IS NOT NULL");

        migrationBuilder.CreateTable(
            "Customers",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Phone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                Email = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true),
                IsActive = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Customers", x => x.Id);
                table.ForeignKey("FK_Customers_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            "ShopLocations",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false), Slug = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false), Address = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true), TimeZoneId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false), IsActive = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table => { table.PrimaryKey("PK_ShopLocations", x => x.Id); table.ForeignKey("FK_ShopLocations_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Cascade); });

        migrationBuilder.CreateTable(
            "RefreshSessions",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false), ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                RevokedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), ReplacedByTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true), UserAgent = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true), IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_RefreshSessions", x => x.Id); table.ForeignKey("FK_RefreshSessions_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade); });

        migrationBuilder.CreateTable(
            "EmailVerificationTokens",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false), ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UsedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table => { table.PrimaryKey("PK_EmailVerificationTokens", x => x.Id); table.ForeignKey("FK_EmailVerificationTokens_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade); });

        migrationBuilder.CreateTable(
            "TeamInvitations",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Email = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: false), Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false), Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false), BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false), ExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), AcceptedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), RevokedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TeamInvitations", x => x.Id); table.ForeignKey("FK_TeamInvitations_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Cascade); table.ForeignKey("FK_TeamInvitations_Barbers_BarberId", x => x.BarberId, "Barbers", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            "AuditLogs",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false), ResourceType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false), ResourceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true), Metadata = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true), IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuditLogs", x => x.Id); table.ForeignKey("FK_AuditLogs_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Cascade); table.ForeignKey("FK_AuditLogs_Users_UserId", x => x.UserId, "Users", "Id");
            });

        migrationBuilder.CreateTable(
            "Appointments",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                StartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), EndsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), CustomerName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false), CustomerPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true), CustomerEmail = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true), PublicLookupTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false), Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false), RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Appointments", x => x.Id); table.ForeignKey("FK_Appointments_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Appointments_BarberServices_ServiceId", x => x.ServiceId, "BarberServices", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Appointments_Barbers_BarberId", x => x.BarberId, "Barbers", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Appointments_Customers_CustomerId", x => x.CustomerId, "Customers", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.AddForeignKey("FK_Turns_Appointments_AppointmentId", "Turns", "AppointmentId", "Appointments", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
        migrationBuilder.CreateIndex("IX_Turns_AppointmentId", "Turns", "AppointmentId");

        migrationBuilder.CreateTable(
            "BlockedTimes",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), StartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), EndsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
            },
            constraints: table => { table.PrimaryKey("PK_BlockedTimes", x => x.Id); table.ForeignKey("FK_BlockedTimes_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Cascade); table.ForeignKey("FK_BlockedTimes_Barbers_BarberId", x => x.BarberId, "Barbers", "Id", onDelete: ReferentialAction.Cascade); });

        migrationBuilder.CreateTable(
            "Payments",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), TurnId = table.Column<Guid>(type: "uniqueidentifier", nullable: true), AppointmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true), CustomerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true), Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false), Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false), Method = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false), Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false), ExternalReference = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true), PaidAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Payments", x => x.Id); table.ForeignKey("FK_Payments_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Payments_Turns_TurnId", x => x.TurnId, "Turns", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Payments_Appointments_AppointmentId", x => x.AppointmentId, "Appointments", "Id", onDelete: ReferentialAction.Restrict); table.ForeignKey("FK_Payments_Customers_CustomerId", x => x.CustomerId, "Customers", "Id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            "Subscriptions",
            table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false), CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true), BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false), Plan = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false), Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false), Provider = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false), ProviderSubscriptionId = table.Column<string>(type: "nvarchar(180)", maxLength: 180, nullable: true), PeriodStartsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), PeriodEndsAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false), CancelAtPeriodEnd = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table => { table.PrimaryKey("PK_Subscriptions", x => x.Id); table.ForeignKey("FK_Subscriptions_BarberShops_BarberShopId", x => x.BarberShopId, "BarberShops", "Id", onDelete: ReferentialAction.Restrict); });

        migrationBuilder.CreateIndex("IX_Customers_BarberShopId", "Customers", "BarberShopId");
        migrationBuilder.CreateIndex("IX_ShopLocations_BarberShopId_Slug", "ShopLocations", new[] { "BarberShopId", "Slug" }, unique: true);
        migrationBuilder.CreateIndex("IX_ShopLocations_BarberShopId_IsActive", "ShopLocations", new[] { "BarberShopId", "IsActive" });
        migrationBuilder.CreateIndex("IX_Customers_BarberShopId_Phone", "Customers", new[] { "BarberShopId", "Phone" }, filter: "[Phone] IS NOT NULL");
        migrationBuilder.CreateIndex("IX_Customers_BarberShopId_Email", "Customers", new[] { "BarberShopId", "Email" }, filter: "[Email] IS NOT NULL");
        migrationBuilder.CreateIndex("IX_RefreshSessions_TokenHash", "RefreshSessions", "TokenHash", unique: true);
        migrationBuilder.CreateIndex("IX_RefreshSessions_UserId_ExpiresAtUtc", "RefreshSessions", new[] { "UserId", "ExpiresAtUtc" });
        migrationBuilder.CreateIndex("IX_EmailVerificationTokens_TokenHash", "EmailVerificationTokens", "TokenHash", unique: true);
        migrationBuilder.CreateIndex("IX_EmailVerificationTokens_UserId", "EmailVerificationTokens", "UserId");
        migrationBuilder.CreateIndex("IX_TeamInvitations_TokenHash", "TeamInvitations", "TokenHash", unique: true);
        migrationBuilder.CreateIndex("IX_TeamInvitations_BarberId", "TeamInvitations", "BarberId");
        migrationBuilder.CreateIndex("IX_TeamInvitations_BarberShopId_Email_ExpiresAtUtc", "TeamInvitations", new[] { "BarberShopId", "Email", "ExpiresAtUtc" });
        migrationBuilder.CreateIndex("IX_AuditLogs_UserId", "AuditLogs", "UserId");
        migrationBuilder.CreateIndex("IX_AuditLogs_BarberShopId_CreatedAtUtc", "AuditLogs", new[] { "BarberShopId", "CreatedAtUtc" });
        migrationBuilder.CreateIndex("IX_Appointments_ServiceId", "Appointments", "ServiceId");
        migrationBuilder.CreateIndex("IX_Appointments_BarberId", "Appointments", "BarberId");
        migrationBuilder.CreateIndex("IX_Appointments_CustomerId", "Appointments", "CustomerId");
        migrationBuilder.CreateIndex("IX_Appointments_PublicLookupTokenHash", "Appointments", "PublicLookupTokenHash", unique: true);
        migrationBuilder.CreateIndex("IX_Appointments_BarberShopId_BarberId_StartsAtUtc_EndsAtUtc", "Appointments", new[] { "BarberShopId", "BarberId", "StartsAtUtc", "EndsAtUtc" });
        migrationBuilder.CreateIndex("IX_BlockedTimes_BarberId", "BlockedTimes", "BarberId");
        migrationBuilder.CreateIndex("IX_BlockedTimes_BarberShopId_BarberId_StartsAtUtc_EndsAtUtc", "BlockedTimes", new[] { "BarberShopId", "BarberId", "StartsAtUtc", "EndsAtUtc" });
        migrationBuilder.CreateIndex("IX_Payments_TurnId", "Payments", "TurnId");
        migrationBuilder.CreateIndex("IX_Payments_AppointmentId", "Payments", "AppointmentId");
        migrationBuilder.CreateIndex("IX_Payments_CustomerId", "Payments", "CustomerId");
        migrationBuilder.CreateIndex("IX_Payments_BarberShopId_CreatedAtUtc", "Payments", new[] { "BarberShopId", "CreatedAtUtc" });
        migrationBuilder.CreateIndex("IX_Subscriptions_BarberShopId_CreatedAtUtc", "Subscriptions", new[] { "BarberShopId", "CreatedAtUtc" });
        migrationBuilder.CreateIndex("IX_Subscriptions_ProviderSubscriptionId", "Subscriptions", "ProviderSubscriptionId", filter: "[ProviderSubscriptionId] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_Turns_Appointments_AppointmentId", "Turns");
        migrationBuilder.DropForeignKey("FK_Users_Barbers_BarberId", "Users");
        migrationBuilder.DropTable("AuditLogs"); migrationBuilder.DropTable("BlockedTimes"); migrationBuilder.DropTable("EmailVerificationTokens"); migrationBuilder.DropTable("Payments"); migrationBuilder.DropTable("RefreshSessions"); migrationBuilder.DropTable("ShopLocations"); migrationBuilder.DropTable("Subscriptions"); migrationBuilder.DropTable("TeamInvitations");
        migrationBuilder.DropIndex("IX_Turns_AppointmentId", "Turns"); migrationBuilder.DropIndex("IX_Turns_BarberShopId_IdempotencyKey", "Turns");
        migrationBuilder.DropColumn("AppointmentId", "Turns"); migrationBuilder.DropColumn("CustomerPhone", "Turns"); migrationBuilder.DropColumn("IdempotencyKey", "Turns"); migrationBuilder.DropColumn("PublicLookupTokenHash", "Turns"); migrationBuilder.DropColumn("RowVersion", "Turns");
        migrationBuilder.DropTable("Appointments"); migrationBuilder.DropTable("Customers");
        migrationBuilder.DropIndex("IX_Users_BarberId", "Users"); migrationBuilder.DropColumn("BarberId", "Users"); migrationBuilder.DropColumn("IsEmailVerified", "Users"); migrationBuilder.DropColumn("SecurityStamp", "Users");
        migrationBuilder.DropColumn("RowVersion", "Barbers"); migrationBuilder.DropColumn("RowVersion", "BarberServices");
        migrationBuilder.DropColumn("Plan", "BarberShops"); migrationBuilder.DropColumn("SubscriptionStatus", "BarberShops"); migrationBuilder.DropColumn("TimeZoneId", "BarberShops"); migrationBuilder.DropColumn("TrialEndsAtUtc", "BarberShops");
    }
}
#pragma warning restore CA1861
