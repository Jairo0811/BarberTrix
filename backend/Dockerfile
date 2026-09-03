FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY backend/src/BarberTrix.Domain/BarberTrix.Domain.csproj backend/src/BarberTrix.Domain/
COPY backend/src/BarberTrix.Application/BarberTrix.Application.csproj backend/src/BarberTrix.Application/
COPY backend/src/BarberTrix.Infrastructure/BarberTrix.Infrastructure.csproj backend/src/BarberTrix.Infrastructure/
COPY backend/src/BarberTrix.Api/BarberTrix.Api.csproj backend/src/BarberTrix.Api/
RUN dotnet restore backend/src/BarberTrix.Api/BarberTrix.Api.csproj

COPY backend backend
RUN dotnet publish backend/src/BarberTrix.Api/BarberTrix.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "BarberTrix.Api.dll"]
