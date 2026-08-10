using BarberTurn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<BarberShop> BarberShops => Set<BarberShop>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BarberShop>(entity =>
        {
            entity.ToTable("BarberShops");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            entity.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(180).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.IsActive });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
