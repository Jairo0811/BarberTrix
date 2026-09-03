using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberTrix.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BarberTrixTvDisplays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TvDisplays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BarberShopId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PairingCodeHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    PairingExpiresAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DisplayTokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    PairedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastSeenAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RevokedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TvDisplays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TvDisplays_BarberShops_BarberShopId",
                        column: x => x.BarberShopId,
                        principalTable: "BarberShops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TvDisplays_BarberShopId_IsActive",
                table: "TvDisplays",
                columns: new[] { "BarberShopId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_TvDisplays_DisplayTokenHash",
                table: "TvDisplays",
                column: "DisplayTokenHash",
                unique: true,
                filter: "[DisplayTokenHash] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TvDisplays_PairingCodeHash",
                table: "TvDisplays",
                column: "PairingCodeHash",
                unique: true,
                filter: "[PairingCodeHash] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TvDisplays");
        }
    }
}
