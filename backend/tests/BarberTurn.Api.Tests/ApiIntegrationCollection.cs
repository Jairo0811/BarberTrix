using Xunit;

namespace BarberTurn.Api.Tests;

[CollectionDefinition(Name)]
public sealed class ApiIntegrationSuite : ICollectionFixture<BarberTurnFactory>
{
    public const string Name = "API integration";
}
