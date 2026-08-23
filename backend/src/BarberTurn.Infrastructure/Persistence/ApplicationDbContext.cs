using BarberTurn.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BarberTurn.Infrastructure.Persistence;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<BarberShop> BarberShops => Set<BarberShop>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Barber> Barbers => Set<Barber>();
    public DbSet<BarberService> BarberServices => Set<BarberService>();
    public DbSet<Turn> Turns => Set<Turn>();

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

        modelBuilder.Entity<Barber>(entity =>
        {
            entity.ToTable("Barbers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.HasIndex(x => new { x.BarberShopId, x.ChairNumber }).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.IsActive, x.Status });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BarberService>(entity =>
        {
            entity.ToTable("BarberServices");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.Property(x => x.Price).HasPrecision(18, 2);
            entity.HasIndex(x => new { x.BarberShopId, x.Name }).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.IsActive });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Turn>(entity =>
        {
            entity.ToTable("Turns");
            entity.HasKey(x => x.Id);
            entity.Ignore(x => x.TicketNumber);
            entity.Property(x => x.CustomerName).HasMaxLength(120);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.QueueDate).HasColumnType("date");
            entity.HasIndex(x => new { x.BarberShopId, x.QueueDate, x.SequenceNumber }).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.QueueDate, x.Status });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BarberService>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
