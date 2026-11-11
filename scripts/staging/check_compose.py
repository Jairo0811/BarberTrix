#!/usr/bin/env python3
"""Fail-closed checks for the *resolved* staging Docker Compose config.

Reads JSON from stdin (docker compose ... config --format json).
Never prints environment values or credentials.
"""
import json
import sys


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def is_trusted_nginx_bind(mount: object) -> bool:
    """Verify the resolved Docker bind mount on Linux and Windows hosts.

    Compose emits absolute source paths with forward slashes on Linux but may
    emit backslashes on Windows. Normalize only for validation, never relax the
    expected target, mount type, location or read-only requirement.
    """
    if not isinstance(mount, dict):
        return False
    if mount.get("type") != "bind":
        return False
    if mount.get("target") != "/etc/nginx/conf.d/default.conf":
        return False
    if mount.get("read_only") is not True:
        return False
    source = mount.get("source")
    if not isinstance(source, str):
        return False
    source = source.replace("\\", "/")
    is_absolute = source.startswith("/") or (
        len(source) >= 3 and source[0].isalpha() and source[1:3] == ":/"
    )
    if not is_absolute or ".." in source.split("/"):
        return False
    return source.endswith("/deploy/staging/nginx.conf")


def main() -> int:
    try:
        config = json.load(sys.stdin)
        services = config.get("services", {})
        require(config.get("name") == "barbertrix-staging", "Compose project name must be barbertrix-staging")
        for name in ("sqlserver", "db-init", "migrate", "api", "web"):
            require(name in services, f"Missing service: {name}")
        api = services["api"]
        web = services["web"]
        for name in ("api", "sqlserver"):
            require(not services[name].get("ports"), f"{name} must not publish ports")
        require(api.get("environment", {}).get("PayPal__Sandbox") == "true", "PayPal must be sandbox-only")
        require(api.get("environment", {}).get("Push__Enabled") == "false", "Push must be disabled in staging")
        require(api.get("environment", {}).get("Demo__Enabled") == "false", "Demo must be disabled in staging")
        require(api.get("environment", {}).get("Auth__RequireVerifiedEmail") == "true", "Verified email must be required")
        mounts = web.get("volumes", [])
        nginx_mounts = [
            v for v in mounts
            if isinstance(v, dict) and v.get("target") == "/etc/nginx/conf.d/default.conf"
        ]
        require(
            len(nginx_mounts) == 1 and is_trusted_nginx_bind(nginx_mounts[0]),
            "Staging must use the read-only HTTPS-aware Nginx config",
        )
        ports = web.get("ports", [])
        require(len(ports) == 1, "Staging web must publish exactly one port")
        p = ports[0]
        require(str(p.get("host_ip")) == "127.0.0.1", "Staging must listen on loopback only")
        require(str(p.get("published")) == "8088", "Expected staging host port 8088")
        require(int(p.get("target")) == 80, "Expected staging container port 80")
        require(p.get("protocol", "tcp") == "tcp", "Staging transport must be TCP")
        print("PASS: staging topology, PayPal Sandbox, local-only exposure and isolation checks")
        return 0
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
