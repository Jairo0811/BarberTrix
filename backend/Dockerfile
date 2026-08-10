FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY backend/src/BarberTurn.Domain/BarberTurn.Domain.csproj backend/src/BarberTurn.Domain/
COPY backend/src/BarberTurn.Application/BarberTurn.Application.csproj backend/src/BarberTurn.Application/
COPY backend/src/BarberTurn.Infrastructure/BarberTurn.Infrastructure.csproj backend/src/BarberTurn.Infrastructure/
COPY backend/src/BarberTurn.Api/BarberTurn.Api.csproj backend/src/BarberTurn.Api/
RUN dotnet restore backend/src/BarberTurn.Api/BarberTurn.Api.csproj

COPY backend backend
RUN dotnet publish backend/src/BarberTurn.Api/BarberTurn.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "BarberTurn.Api.dll"]
