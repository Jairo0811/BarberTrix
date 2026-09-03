using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberTrix.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BarberIdentityMemberships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BarberProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsAvailableForWork = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BarberProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BarberProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShopMemberships",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    BarberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EndedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopMemberships", x => x.Id);
                    table.CheckConstraint("CK_ShopMemberships_BarberLink", "([Role] = 'Barber' AND [BarberId] IS NOT NULL) OR ([Role] <> 'Barber' AND [BarberId] IS NULL)");
                    table.ForeignKey(
                        name: "FK_ShopMemberships_BarberShops_BarberShopId",
                        column: x => x.BarberShopId,
                        principalTable: "BarberShops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShopMemberships_Barbers_BarberId",
                        column: x => x.BarberId,
                        principalTable: "Barbers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShopMemberships_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BarberProfiles_UserId",
                table: "BarberProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopMemberships_BarberId",
                table: "ShopMemberships",
                column: "BarberId");

            migrationBuilder.CreateIndex(
                name: "IX_ShopMemberships_BarberShopId_Status_Role",
                table: "ShopMemberships",
                columns: new[] { "BarberShopId", "Status", "Role" });

            migrationBuilder.CreateIndex(
                name: "IX_ShopMemberships_UserId_BarberShopId",
                table: "ShopMemberships",
                columns: new[] { "UserId", "BarberShopId" },
                unique: true);

            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [Users] WHERE [Role] = 'Barber' AND [BarberId] IS NULL)
                    THROW 51000, 'Cannot backfill barber memberships because at least one barber user has no BarberId.', 1;

                INSERT INTO [ShopMemberships] ([Id], [CreatedAtUtc], [UpdatedAtUtc], [UserId], [BarberShopId], [Role], [BarberId], [Status], [EndedAtUtc])
                SELECT NEWID(), u.[CreatedAtUtc], u.[UpdatedAtUtc], u.[Id], u.[BarberShopId], u.[Role],
                       CASE WHEN u.[Role] = 'Barber' THEN u.[BarberId] ELSE NULL END,
                       CASE WHEN u.[IsActive] = 1 THEN 'Active' ELSE 'Revoked' END,
                       CASE WHEN u.[IsActive] = 1 THEN NULL ELSE SYSUTCDATETIME() END
                FROM [Users] u
                WHERE NOT EXISTS (
                    SELECT 1 FROM [ShopMemberships] m
                    WHERE m.[UserId] = u.[Id] AND m.[BarberShopId] = u.[BarberShopId]);

                INSERT INTO [BarberProfiles] ([Id], [CreatedAtUtc], [UpdatedAtUtc], [UserId], [DisplayName], [Bio], [IsAvailableForWork])
                SELECT NEWID(), u.[CreatedAtUtc], u.[UpdatedAtUtc], u.[Id], u.[Name], NULL, CAST(0 AS bit)
                FROM [Users] u
                WHERE u.[Role] = 'Barber'
                  AND NOT EXISTS (SELECT 1 FROM [BarberProfiles] p WHERE p.[UserId] = u.[Id]);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BarberProfiles");

            migrationBuilder.DropTable(
                name: "ShopMemberships");
        }
    }
}
