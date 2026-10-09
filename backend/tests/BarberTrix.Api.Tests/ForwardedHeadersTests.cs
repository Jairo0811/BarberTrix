using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace BarberTrix.Api.Tests;

[Collection(ApiIntegrationCollection.Name)]
public sealed class ForwardedHeadersTests(BarberTrixFactory factory)
{
    [Fact]
    public async Task TrustedEdgeUsesForwardedClientIpAndScheme()
    {
        using var configuredFactory = factory.WithWebHostBuilder(builder =>
            builder.UseSetting("ReverseProxy:TrustAnyProxy", "true"));
        using var client = configuredFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("http://localhost"),
            AllowAutoRedirect = false
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, "/__tests/edge");
        request.Headers.TryAddWithoutValidation("X-Forwarded-For", "203.0.113.44");
        request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", "https");

        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<EdgeProbe>();

        Assert.NotNull(payload);
        Assert.Equal("203.0.113.44", payload.RemoteIp);
        Assert.Equal("https", payload.Scheme);
    }

    [Fact]
    public void ExplicitProxyAllowlistReplacesFrameworkDefaults()
    {
        using var configuredFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ReverseProxy:TrustAnyProxy", "false");
            builder.UseSetting("ReverseProxy:KnownProxies:0", "198.51.100.10");
        });

        var options = configuredFactory.Services
            .GetRequiredService<IOptions<ForwardedHeadersOptions>>()
            .Value;

        var trustedProxy = Assert.Single(options.KnownProxies);
        Assert.Equal(IPAddress.Parse("198.51.100.10"), trustedProxy);
        Assert.Empty(options.KnownIPNetworks);
        Assert.Equal(1, options.ForwardLimit);
        Assert.Equal(
            ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            options.ForwardedHeaders);
    }

    private sealed record EdgeProbe(string? RemoteIp, string Scheme);
}
