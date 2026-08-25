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
    public DbSet<RefreshSession> RefreshSessions => Set<RefreshSession>();
    public DbSet<TeamInvitation> TeamInvitations => Set<TeamInvitation>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<BlockedTime> BlockedTimes => Set<BlockedTime>();
    public DbSet<PaymentRecord> Payments => Set<PaymentRecord>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<ShopLocation> ShopLocations => Set<ShopLocation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BarberShop>(entity =>
        {
            entity.ToTable("BarberShops");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            entity.Property(x => x.TimeZoneId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Plan).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.SubscriptionStatus).HasConversion<string>().HasMaxLength(30).IsRequired();
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
            entity.Property(x => x.SecurityStamp).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.IsActive });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Barber>(entity =>
        {
            entity.ToTable("Barbers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.RowVersion).IsRowVersion();
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
            entity.Property(x => x.RowVersion).IsRowVersion();
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
            entity.Property(x => x.CustomerPhone).HasMaxLength(40);
            entity.Property(x => x.PublicLookupTokenHash).HasMaxLength(64);
            entity.Property(x => x.IdempotencyKey).HasMaxLength(100);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.RowVersion).IsRowVersion();
            entity.Property(x => x.QueueDate).HasColumnType("date");
            entity.HasIndex(x => new { x.BarberShopId, x.QueueDate, x.SequenceNumber }).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.QueueDate, x.Status });
            entity.HasIndex(x => new { x.BarberShopId, x.IdempotencyKey }).IsUnique().HasFilter("[IdempotencyKey] IS NOT NULL");
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BarberService>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Appointment>().WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<RefreshSession>(entity =>
        {
            entity.ToTable("RefreshSessions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(64);
            entity.Property(x => x.UserAgent).HasMaxLength(300);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAtUtc });
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeamInvitation>(entity =>
        {
            entity.ToTable("TeamInvitations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.Email, x.ExpiresAtUtc });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.ToTable("EmailVerificationTokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Action).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ResourceType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ResourceId).HasMaxLength(100);
            entity.Property(x => x.Metadata).HasMaxLength(4000);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.HasIndex(x => new { x.BarberShopId, x.CreatedAtUtc });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customers");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Phone).HasMaxLength(40);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.HasIndex(x => new { x.BarberShopId, x.Phone }).HasFilter("[Phone] IS NOT NULL");
            entity.HasIndex(x => new { x.BarberShopId, x.Email }).HasFilter("[Email] IS NOT NULL");
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ShopLocation>(entity =>
        {
            entity.ToTable("ShopLocations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Address).HasMaxLength(300);
            entity.Property(x => x.TimeZoneId).HasMaxLength(100).IsRequired();
            entity.HasIndex(x => new { x.BarberShopId, x.Slug }).IsUnique();
            entity.HasIndex(x => new { x.BarberShopId, x.IsActive });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("Appointments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CustomerName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.CustomerPhone).HasMaxLength(40);
            entity.Property(x => x.CustomerEmail).HasMaxLength(180);
            entity.Property(x => x.PublicLookupTokenHash).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.RowVersion).IsRowVersion();
            entity.HasIndex(x => new { x.BarberShopId, x.BarberId, x.StartsAtUtc, x.EndsAtUtc });
            entity.HasIndex(x => x.PublicLookupTokenHash).IsUnique();
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BarberService>().WithMany().HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BlockedTime>(entity =>
        {
            entity.ToTable("BlockedTimes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Reason).HasMaxLength(200).IsRequired();
            entity.HasIndex(x => new { x.BarberShopId, x.BarberId, x.StartsAtUtc, x.EndsAtUtc });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Barber>().WithMany().HasForeignKey(x => x.BarberId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PaymentRecord>(entity =>
        {
            entity.ToTable("Payments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(18, 2);
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.Property(x => x.Method).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.ExternalReference).HasMaxLength(180);
            entity.HasIndex(x => new { x.BarberShopId, x.CreatedAtUtc });
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Turn>().WithMany().HasForeignKey(x => x.TurnId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Appointment>().WithMany().HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("Subscriptions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Plan).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(x => x.Provider).HasMaxLength(40).IsRequired();
            entity.Property(x => x.ProviderSubscriptionId).HasMaxLength(180);
            entity.HasIndex(x => new { x.BarberShopId, x.CreatedAtUtc });
            entity.HasIndex(x => x.ProviderSubscriptionId).HasFilter("[ProviderSubscriptionId] IS NOT NULL");
            entity.HasOne<BarberShop>().WithMany().HasForeignKey(x => x.BarberShopId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
