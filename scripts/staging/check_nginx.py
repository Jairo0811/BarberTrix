#!/usr/bin/env python3
"""Static preflight assertions for Nginx health checks and trusted TLS forwarding."""
import pathlib
import re
import sys


def block(text: str, location: str) -> str:
    match = re.search(r"location\s+=\s+" + re.escape(location) + r"\s*\{([^{}]*)\}", text)
    if not match:
        raise ValueError(f"Missing exact Nginx location: {location}")
    return match.group(1)


def check(path: str, staging: bool) -> None:
    text = pathlib.Path(path).read_text(encoding="utf-8")
    if "location /health {" in text:
        raise ValueError(f"{path}: prefix health route shadows readiness")
    for url in ("/api", "/health/live", "/health/ready"):
        loc = block(text, url)
        if "proxy_pass http://api:8080;" not in loc:
            raise ValueError(f"{path}: {url} is not forwarded to the API")
    health = block(text, "/health")
    if "return 200" not in health:
        raise ValueError(f"{path}: edge /health must remain a lightweight check")
    if "default_type text/plain;" not in health or "add_header" in health.split("#", 1)[0]:
        raise ValueError(f"{path}: /health must preserve inherited security headers")
    if "location /health/ {" not in text or "return 404;" not in text:
        raise ValueError(f"{path}: unknown /health/* must not fall through to the SPA")
    if staging:
        # This file must only be mounted on a loopback-bound service behind trusted HTTPS.
        if text.count("proxy_set_header X-Forwarded-Proto https;") != 5:
            raise ValueError("Staging must pin TLS forwarding for API, hubs and health routes")
        if "proxy_set_header X-Forwarded-Proto $scheme;" in text:
            raise ValueError("Staging would see internal HTTP and could redirect-loop")
    else:
        if "proxy_set_header X-Forwarded-Proto https;" in text:
            raise ValueError("Production configuration must not invent TLS behind public HTTP")
    print(f"PASS: {path}")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 3:
            raise ValueError("Provide production and staging Nginx paths")
        check(sys.argv[1], staging=False)
        check(sys.argv[2], staging=True)
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
