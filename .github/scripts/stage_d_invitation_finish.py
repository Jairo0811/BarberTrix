from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f'Marker missing in {path}: {old[:120]!r}')
    target.write_text(text.replace(old, new, 1))

# Allow an existing independent barber to be invited into an already-created operational barber slot.
auth = 'backend/src/BarberTurn.Infrastructure/Auth/AuthService.cs'
replace_once(
    auth,
    '''        if (request.Role == UserRole.Barber && request.BarberId is null)\n            throw new ArgumentException("A barber account must be linked to a barber.");\n        var email = request.Email.Trim().ToLowerInvariant();\n        if (await dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken))\n            throw new InvalidOperationException("A user with that email already exists.");\n        if (request.BarberId is Guid barberId && !await dbContext.Barbers.AnyAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken))\n            throw new InvalidOperationException("The selected barber does not belong to this barbershop.");\n''',
    '''        if (request.Role == UserRole.Barber && request.BarberId is null)\n            throw new ArgumentException("A barber account must be linked to an operational barber.");\n        var email = request.Email.Trim().ToLowerInvariant();\n        var existingUser = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == email && x.IsActive, cancellationToken);\n        if (existingUser is not null)\n        {\n            if (request.Role != UserRole.Barber || existingUser.Role != UserRole.Barber || existingUser.BarberShopId.HasValue ||\n                !await dbContext.BarberProfiles.AnyAsync(x => x.UserId == existingUser.Id, cancellationToken))\n                throw new InvalidOperationException("Only an independent barber account can accept an invitation for an existing user.");\n        }\n        if (request.BarberId is Guid barberId && !await dbContext.Barbers.AnyAsync(x => x.Id == barberId && x.BarberShopId == barberShopId, cancellationToken))\n            throw new InvalidOperationException("The selected barber does not belong to this barbershop.");\n''')

replace_once(
    auth,
    '''        var user = CreateUser(invitation.BarberShopId, invitation.Name, invitation.Email, request.Password, invitation.Role, invitation.BarberId);\n        user.MarkEmailVerified();\n        invitation.Accept();\n        dbContext.Users.Add(user);\n        dbContext.ShopMemberships.Add(new ShopMembership(user.Id, invitation.BarberShopId, invitation.Role, invitation.BarberId));\n        if (invitation.Role == UserRole.Barber)\n            dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));\n        await dbContext.SaveChangesAsync(cancellationToken);\n        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);\n''',
    '''        var existingUser = await dbContext.Users.SingleOrDefaultAsync(x => x.Email == invitation.Email && x.IsActive, cancellationToken);\n        if (existingUser is not null)\n        {\n            if (invitation.Role != UserRole.Barber || invitation.BarberId is null || existingUser.Role != UserRole.Barber || existingUser.BarberShopId.HasValue ||\n                !await dbContext.BarberProfiles.AnyAsync(x => x.UserId == existingUser.Id, cancellationToken))\n                throw new InvalidOperationException("The invitation cannot be applied to this existing account.");\n            if (passwordHasher.VerifyHashedPassword(existingUser, existingUser.PasswordHash, request.Password) == PasswordVerificationResult.Failed)\n                throw new InvalidOperationException("The current account password is invalid.");\n\n            var membership = await dbContext.ShopMemberships.SingleOrDefaultAsync(\n                x => x.UserId == existingUser.Id && x.BarberShopId == invitation.BarberShopId, cancellationToken);\n            if (membership is null)\n                dbContext.ShopMemberships.Add(new ShopMembership(existingUser.Id, invitation.BarberShopId, UserRole.Barber, invitation.BarberId));\n            else\n                membership.ReactivateAsBarber(invitation.BarberId.Value);\n\n            existingUser.AssignTenant(invitation.BarberShopId, UserRole.Barber, invitation.BarberId);\n            var pendingRequests = await dbContext.BarberJoinRequests\n                .Where(x => x.UserId == existingUser.Id && x.Status == BarberJoinRequestStatus.Pending)\n                .ToListAsync(cancellationToken);\n            pendingRequests.ForEach(x => x.Withdraw());\n            invitation.Accept();\n            await dbContext.SaveChangesAsync(cancellationToken);\n            return await CreateSessionAsync(existingUser, userAgent, ipAddress, cancellationToken);\n        }\n\n        var user = CreateUser(invitation.BarberShopId, invitation.Name, invitation.Email, request.Password, invitation.Role, invitation.BarberId);\n        user.MarkEmailVerified();\n        invitation.Accept();\n        dbContext.Users.Add(user);\n        dbContext.ShopMemberships.Add(new ShopMembership(user.Id, invitation.BarberShopId, invitation.Role, invitation.BarberId));\n        if (invitation.Role == UserRole.Barber)\n            dbContext.BarberProfiles.Add(new BarberProfile(user.Id, user.Name));\n        await dbContext.SaveChangesAsync(cancellationToken);\n        return await CreateSessionAsync(user, userAgent, ipAddress, cancellationToken);\n''')

# Approving one shop request invalidates competing pending requests.
onboarding = 'backend/src/BarberTurn.Infrastructure/Onboarding/BarberOnboardingService.cs'
replace_once(
    onboarding,
    '''        user.AssignTenant(barberShopId, UserRole.Barber, barber.Id);\n        request.Approve(reviewerUserId);\n        await dbContext.SaveChangesAsync(cancellationToken);\n''',
    '''        user.AssignTenant(barberShopId, UserRole.Barber, barber.Id);\n        request.Approve(reviewerUserId);\n        var competingRequests = await dbContext.BarberJoinRequests\n            .Where(x => x.UserId == user.Id && x.Id != request.Id && x.Status == BarberJoinRequestStatus.Pending)\n            .ToListAsync(cancellationToken);\n        competingRequests.ForEach(x => x.Withdraw());\n        await dbContext.SaveChangesAsync(cancellationToken);\n''')

# Integration coverage for existing-account invitation acceptance.
test = Path('backend/tests/BarberTurn.Api.Tests/BarberOnboardingTests.cs')
text = test.read_text()
marker = '''    private sealed record AuthPayload(string AccessToken, Guid UserId, Guid? BarberShopId, Guid? BarberId, string SessionScope);\n'''
new_test = r'''    [Fact]
    public async Task ExistingIndependentBarberCanAcceptTeamInvitation()
    {
        using var ownerClient = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        using var barberClient = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = true });
        var suffix = Guid.NewGuid().ToString("N")[..10];
        const string password = "ValidPass123!";
        var barberEmail = $"invited-{suffix}@example.com";

        var ownerResponse = await ownerClient.PostAsJsonAsync("/api/auth/register-owner", new
        {
            barberShopName = $"Invite Stage D {suffix}", barberShopSlug = $"invite-stage-d-{suffix}", name = "Invite Owner",
            email = $"invite-owner-{suffix}@example.com", password, acceptedTerms = true
        });
        ownerResponse.EnsureSuccessStatusCode();
        var owner = await ownerResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(owner);

        var barberResponse = await barberClient.PostAsJsonAsync("/api/auth/register-barber", new
        {
            name = $"Invited Barber {suffix}", email = barberEmail, password, acceptedTerms = true
        });
        barberResponse.EnsureSuccessStatusCode();
        var barber = await barberResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(barber);
        Assert.Equal("Onboarding", barber.SessionScope);

        Guid operationalBarberId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var operationalBarber = new Barber(owner.BarberShopId!.Value, $"Invited Barber {suffix}", 98);
            db.Barbers.Add(operationalBarber);
            await db.SaveChangesAsync();
            operationalBarberId = operationalBarber.Id;
        }

        ownerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", owner.AccessToken);
        var invitationResponse = await ownerClient.PostAsJsonAsync("/api/team/invitations", new
        {
            name = $"Invited Barber {suffix}", email = barberEmail, role = 4, barberId = operationalBarberId
        });
        invitationResponse.EnsureSuccessStatusCode();
        var invitation = await invitationResponse.Content.ReadFromJsonAsync<InvitationPayload>();
        Assert.NotNull(invitation);
        Assert.False(string.IsNullOrWhiteSpace(invitation.DevelopmentAcceptanceUrl));
        var token = new Uri(invitation.DevelopmentAcceptanceUrl!).Fragment.Split("token=", 2)[1];
        token = Uri.UnescapeDataString(token);

        var acceptResponse = await barberClient.PostAsJsonAsync("/api/auth/accept-invitation", new
        {
            token, password, acceptedTerms = true
        });
        acceptResponse.EnsureSuccessStatusCode();
        var tenant = await acceptResponse.Content.ReadFromJsonAsync<AuthPayload>();
        Assert.NotNull(tenant);
        Assert.Equal("Tenant", tenant.SessionScope);
        Assert.Equal(owner.BarberShopId, tenant.BarberShopId);
        Assert.Equal(operationalBarberId, tenant.BarberId);
        Assert.Equal(barber.UserId, tenant.UserId);

        using var verifyScope = factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await verifyDb.ShopMemberships.AnyAsync(x => x.UserId == barber.UserId && x.BarberShopId == owner.BarberShopId && x.BarberId == operationalBarberId && x.Status == ShopMembershipStatus.Active));
    }

'''
if marker not in text:
    raise SystemExit('Test marker missing')
text = text.replace(marker, new_test + marker, 1)
text = text.replace(
    '    private sealed record TeamJoinPayload(Guid Id, Guid UserId);\n',
    '    private sealed record TeamJoinPayload(Guid Id, Guid UserId);\n    private sealed record InvitationPayload(Guid Id, string Email, string Role, DateTimeOffset ExpiresAtUtc, string? DevelopmentAcceptanceUrl);\n')
test.write_text(text)

# Documentation update.
doc = Path('docs/barber-onboarding.md')
text = doc.read_text()
if 'Existing-account invitations' not in text:
    text += '''\n## Existing-account invitations\n\nAn owner/administrator can invite an already-registered independent barber by linking the invitation to an operational barber slot. Acceptance verifies the existing account password, activates the `ShopMembership`, assigns tenant claims, and withdraws any competing pending join requests.\n'''
doc.write_text(text)

# Clean temporary bootstrap artifacts from the product commit.
Path('.github/scripts/stage_d_invitation_finish.py').unlink(missing_ok=True)
Path('.github/workflows/stage-d-invitation-finish.yml').unlink(missing_ok=True)
