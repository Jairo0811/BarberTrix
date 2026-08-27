IF DB_ID(N'BarberTurnDb') IS NULL
BEGIN
    CREATE DATABASE [BarberTurnDb];
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'barberturn_migrator')
BEGIN
    DECLARE @migratorLoginSql nvarchar(max) =
        N'CREATE LOGIN [barberturn_migrator] WITH PASSWORD = N''$(MIGRATOR_PASSWORD)'', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC sys.sp_executesql @migratorLoginSql;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'barberturn_app')
BEGIN
    DECLARE @appLoginSql nvarchar(max) =
        N'CREATE LOGIN [barberturn_app] WITH PASSWORD = N''$(APP_PASSWORD)'', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC sys.sp_executesql @appLoginSql;
END;
GO

USE [BarberTurnDb];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'barberturn_migrator')
    CREATE USER [barberturn_migrator] FOR LOGIN [barberturn_migrator];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'barberturn_app')
    CREATE USER [barberturn_app] FOR LOGIN [barberturn_app];
GO

IF IS_ROLEMEMBER(N'db_owner', N'barberturn_migrator') <> 1
    ALTER ROLE [db_owner] ADD MEMBER [barberturn_migrator];
GO

IF IS_ROLEMEMBER(N'db_datareader', N'barberturn_app') <> 1
    ALTER ROLE [db_datareader] ADD MEMBER [barberturn_app];
GO

IF IS_ROLEMEMBER(N'db_datawriter', N'barberturn_app') <> 1
    ALTER ROLE [db_datawriter] ADD MEMBER [barberturn_app];
GO

GRANT CONNECT TO [barberturn_app];
GO
