using Xunit;

namespace BarberTurn.Api.Tests;

[CollectionDefinition(Name)]
public sealed class ApiIntegrationCollection : ICollectionFixture<BarberTurnFactory>
{
    public const string Name = "API integration";
}
