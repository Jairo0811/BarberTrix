from pathlib import Path

test = Path('backend/tests/BarberTurn.Api.Tests/BarberOnboardingTests.cs')
text = test.read_text()
old = '''        invitationResponse.EnsureSuccessStatusCode();
        var invitation = await invitationResponse.Content.ReadFromJsonAsync<InvitationPayload>();
        Assert.NotNull(invitation);
        Assert.False(string.IsNullOrWhiteSpace(invitation.DevelopmentAcceptanceUrl));
        var token = new Uri(invitation.DevelopmentAcceptanceUrl!).Fragment.Split("token=", 2)[1];
        token = Uri.UnescapeDataString(token);

        var acceptResponse = await barberClient.PostAsJsonAsync("/api/auth/accept-invitation", new
'''
new = '''        invitationResponse.EnsureSuccessStatusCode();
        var invitation = await invitationResponse.Content.ReadFromJsonAsync<InvitationPayload>();
        Assert.NotNull(invitation);
        Assert.Null(invitation.DevelopmentAcceptanceUrl);

        const string token = "stage-d-existing-barber-test-token";
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.TeamInvitations.Add(new TeamInvitation(
                owner.BarberShopId!.Value,
                barberEmail,
                $"Invited Barber {suffix}",
                UserRole.Barber,
                operationalBarberId,
                SecureToken.Hash(token),
                DateTimeOffset.UtcNow.AddMinutes(10)));
            await db.SaveChangesAsync();
        }

        var acceptResponse = await barberClient.PostAsJsonAsync("/api/auth/accept-invitation", new
'''
if old not in text:
    raise SystemExit('Invitation test marker missing')
test.write_text(text.replace(old, new, 1))

Path('.github/scripts/stage_d_invitation_test_fix.py').unlink(missing_ok=True)
