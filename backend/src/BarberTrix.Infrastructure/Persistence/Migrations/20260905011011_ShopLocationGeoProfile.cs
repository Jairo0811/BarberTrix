using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarberTrix.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ShopLocationGeoProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "ShopLocations",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "ShopLocations",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "ShopLocations",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Neighborhood",
                table: "ShopLocations",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reference",
                table: "ShopLocations",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShopLocations_Latitude_Longitude",
                table: "ShopLocations",
                columns: new[] { "Latitude", "Longitude" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ShopLocations_Latitude_Longitude",
                table: "ShopLocations");

            migrationBuilder.DropColumn(
                name: "City",
                table: "ShopLocations");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "ShopLocations");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "ShopLocations");

            migrationBuilder.DropColumn(
                name: "Neighborhood",
                table: "ShopLocations");

            migrationBuilder.DropColumn(
                name: "Reference",
                table: "ShopLocations");
        }
    }
}
