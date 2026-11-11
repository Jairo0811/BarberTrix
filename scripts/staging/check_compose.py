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
        trusted_conf = [
            v for v in mounts
            if v.get("target") == "/etc/nginx/conf.d/default.conf"
            and str(v.get("source", "")).endswith("/deploy/staging/nginx.conf")
            and v.get("read_only") is True
        ]
        require(len(trusted_conf) == 1, "Staging must use the read-only HTTPS-aware Nginx config")
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
