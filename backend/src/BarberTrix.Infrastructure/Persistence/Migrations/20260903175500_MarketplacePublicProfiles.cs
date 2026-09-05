using BarberTrix.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberTrix.Infrastructure.Persistence.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260903175500_MarketplacePublicProfiles")]
public partial class MarketplacePublicProfiles : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PublicShopProfiles",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                PublicPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                WhatsAppPhone = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                CoverImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                AcceptsWalkIns = table.Column<bool>(type: "bit", nullable: false),
                AcceptsAppointments = table.Column<bool>(type: "bit", nullable: false),
                IsPublished = table.Column<bool>(type: "bit", nullable: false),
                PublishedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PublicShopProfiles", x => x.Id);
                table.ForeignKey(name: "FK_PublicShopProfiles_BarberShops_BarberShopId", column: x => x.BarberShopId, principalTable: "BarberShops", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_PublicShopProfiles_BarberShopId", table: "PublicShopProfiles", column: "BarberShopId", unique: true);
        migrationBuilder.CreateIndex(name: "IX_PublicShopProfiles_IsPublished", table: "PublicShopProfiles", column: "IsPublished");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "PublicShopProfiles");
}
