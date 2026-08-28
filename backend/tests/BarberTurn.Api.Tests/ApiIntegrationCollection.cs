using System.Diagnostics.CodeAnalysis;
using Xunit;

namespace BarberTurn.Api.Tests;

[CollectionDefinition(Name)]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "xUnit collection fixture type intentionally models a test collection.")]
public sealed class ApiIntegrationCollection : ICollectionFixture<BarberTurnFactory>
{
    public const string Name = "API integration";
}
