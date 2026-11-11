#!/usr/bin/env python3
"""Read-only, HTTPS-only smoke probe for a non-production BarberTrix staging host.

Never logs response bodies, cookies or authorization headers. Requires an explicitly
staging-labeled hostname, verifies TLS normally, and refuses HTTP redirects.
"""
import argparse
import ipaddress
import json
import os
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_base_url(raw: str) -> str:
    parsed = urlsplit(raw.strip())
    host = parsed.hostname or ""
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise ValueError("A public HTTPS staging hostname is required")
    if parsed.query or parsed.fragment or parsed.path not in ("", "/"):
        raise ValueError("Use the staging origin, without a path, query or fragment")
    if "staging" not in host.lower():
        raise ValueError("The hostname must explicitly contain 'staging' to avoid production")
    if host.lower().endswith((".example.com", ".example.net", ".example.org", ".invalid", ".test")):
        raise ValueError("Replace the placeholder with a real staging hostname")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("Use a staging DNS hostname, not a literal IP address")
    if parsed.port not in (None, 443):
        raise ValueError("Staging must use standard HTTPS port 443")
    return f"https://{host.lower()}"


def probe(base: str, opener, timeout: float) -> list[tuple[str, float]]:
    checks: list[tuple[str, float]] = []
    for path in ("/health", "/health/live", "/health/ready", "/api"):
        request = Request(base + path, method="GET", headers={"Accept": "application/json", "User-Agent": "BarberTrix-Staging-ReadOnly-Smoke/1.0"})
        start = time.monotonic()
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                raise ValueError(f"{path}: expected HTTP 200, received {response.status}")
            if response.headers.get("X-Content-Type-Options", "").lower() != "nosniff":
                raise ValueError(f"{path}: missing X-Content-Type-Options: nosniff")
            if path == "/api":
                payload = json.load(response)
                if payload.get("name") != "BarberTrix API" or payload.get("status") != "ok":
                    raise ValueError("/api: unexpected BarberTrix API identity or status")
        checks.append((path, round((time.monotonic() - start) * 1000, 1)))
    return checks


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Non-destructive BarberTrix staging smoke tests")
    parser.add_argument("--base-url", default=os.environ.get("BARBERTRIX_STAGING_URL", ""))
    parser.add_argument("--timeout", type=float, default=12.0)
    args = parser.parse_args(argv)
    try:
        base = validate_base_url(args.base_url)
        if not 0 < args.timeout <= 60:
            raise ValueError("Timeout must be between 0 and 60 seconds")
        checks = probe(base, build_opener(NoRedirect()), args.timeout)
    except (ValueError, HTTPError, URLError, OSError, json.JSONDecodeError) as error:
        # Never print the URL (which could contain unexpected data) or response bodies.
        if isinstance(error, HTTPError):
            print(f"FAIL: received HTTP {error.code}; investigate the current staging health endpoint", file=sys.stderr)
        elif isinstance(error, URLError):
            print("FAIL: HTTPS staging connection unavailable or TLS validation failed", file=sys.stderr)
        else:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    for path, elapsed in checks:
        print(f"PASS: {path} ({elapsed:.1f} ms)")
    print("PASS: read-only staging smoke complete; business workflows still need manual acceptance")
    return 0


if __name__ == "__main__":
    sys.exit(main())
