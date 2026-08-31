from pathlib import Path

service = Path('backend/src/BarberTurn.Infrastructure/Onboarding/BarberOnboardingService.cs')
text = service.read_text()
old = '''    public Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        QueryBarberRequests(userId).ToListAsync(cancellationToken).ContinueWith<IReadOnlyList<BarberJoinRequestResponse>>(
            task => task.Result,
            cancellationToken,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);
'''
new = '''    public async Task<IReadOnlyList<BarberJoinRequestResponse>> GetMyJoinRequestsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await QueryBarberRequests(userId).ToListAsync(cancellationToken);
'''
if old not in text:
    raise SystemExit('Onboarding service list marker missing')
text = text.replace(old, new, 1)

old = '''        await dbContext.SaveChangesAsync(cancellationToken);
        return await QueryBarberRequests(userId).SingleAsync(x => x.Id == request.Id, cancellationToken);
'''
new = '''        await dbContext.SaveChangesAsync(cancellationToken);
        return await (from joinRequest in dbContext.BarberJoinRequests.AsNoTracking()
                      join shop in dbContext.BarberShops.AsNoTracking() on joinRequest.BarberShopId equals shop.Id
                      where joinRequest.UserId == userId && joinRequest.Id == request.Id
                      select new BarberJoinRequestResponse(
                          joinRequest.Id,
                          joinRequest.BarberShopId,
                          shop.Name,
                          joinRequest.Status,
                          joinRequest.CreatedAtUtc,
                          joinRequest.ReviewedAtUtc,
                          joinRequest.ReviewNote))
            .SingleAsync(cancellationToken);
'''
if old not in text:
    raise SystemExit('Onboarding service request lookup marker missing')
service.write_text(text.replace(old, new, 1))

test = Path('backend/tests/BarberTurn.Api.Tests/BarberOnboardingTests.cs')
text = test.read_text()
text = text.replace('Assert.Single(shops!.Where(x => x.Id == owner.BarberShopId))', 'Assert.Single(shops!, x => x.Id == owner.BarberShopId)')
text = text.replace('Assert.Single(pending!.Where(x => x.Id == join.Id))', 'Assert.Single(pending!, x => x.Id == join.Id)')
test.write_text(text)

Path('.github/scripts/stage_d_validation_fix.py').unlink(missing_ok=True)
