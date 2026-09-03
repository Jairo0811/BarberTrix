IF DB_ID(N'BarberTrixDb') IS NULL
BEGIN
    CREATE DATABASE [BarberTrixDb];
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'barbertrix_migrator')
BEGIN
    DECLARE @migratorLoginSql nvarchar(max) =
        N'CREATE LOGIN [barbertrix_migrator] WITH PASSWORD = N''$(MIGRATOR_PASSWORD)'', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC sys.sp_executesql @migratorLoginSql;
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'barbertrix_app')
BEGIN
    DECLARE @appLoginSql nvarchar(max) =
        N'CREATE LOGIN [barbertrix_app] WITH PASSWORD = N''$(APP_PASSWORD)'', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
    EXEC sys.sp_executesql @appLoginSql;
END;
GO

USE [BarberTrixDb];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'barbertrix_migrator')
    CREATE USER [barbertrix_migrator] FOR LOGIN [barbertrix_migrator];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'barbertrix_app')
    CREATE USER [barbertrix_app] FOR LOGIN [barbertrix_app];
GO

IF IS_ROLEMEMBER(N'db_owner', N'barbertrix_migrator') <> 1
    ALTER ROLE [db_owner] ADD MEMBER [barbertrix_migrator];
GO

IF IS_ROLEMEMBER(N'db_datareader', N'barbertrix_app') <> 1
    ALTER ROLE [db_datareader] ADD MEMBER [barbertrix_app];
GO

IF IS_ROLEMEMBER(N'db_datawriter', N'barbertrix_app') <> 1
    ALTER ROLE [db_datawriter] ADD MEMBER [barbertrix_app];
GO

GRANT CONNECT TO [barbertrix_app];
GO
