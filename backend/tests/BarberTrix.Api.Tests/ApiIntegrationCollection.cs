using System.Diagnostics.CodeAnalysis;
using Xunit;

namespace BarberTrix.Api.Tests;

[CollectionDefinition(Name)]
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix", Justification = "xUnit collection fixture type intentionally models a test collection.")]
public sealed class ApiIntegrationCollection : ICollectionFixture<BarberTrixFactory>
{
    public const string Name = "API integration";
}
