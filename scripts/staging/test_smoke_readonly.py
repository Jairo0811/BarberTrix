#!/usr/bin/env python3
"""Network-free contract tests for staging smoke safety and failure handling."""
import io
import unittest
from urllib.error import HTTPError

import smoke_readonly as smoke


class FakeResponse(io.BytesIO):
    def __init__(self, body: bytes = b"Healthy", status: int = 200, headers=None):
        super().__init__(body)
        self.status = status
        self.headers = headers if headers is not None else {"X-Content-Type-Options": "nosniff"}


class FakeOpener:
    def __init__(self, status_by_path=None, header_by_path=None):
        self.status_by_path = status_by_path or {}
        self.header_by_path = header_by_path or {}
        self.paths = []

    def open(self, request, timeout):
        path = request.full_url.split(".example.org.invalid")[-1]
        self.paths.append(path)
        status = self.status_by_path.get(path, 200)
        if status >= 400:
            raise HTTPError(request.full_url, status, "synthetic failure", {}, None)
        body = b'{"name":"BarberTrix API","status":"ok"}' if path == "/api" else b"Healthy"
        return FakeResponse(body, status, self.header_by_path.get(path))


class StagingSmokeTests(unittest.TestCase):
    def test_refuses_production_http_and_placeholders(self):
        for url in (
            "https://barbertrix.com", "http://staging.barbertrix.com", "https://staging.example.com",
            "https://staging.example.test", "https://staging.barbertrix.com/path",
            "https://user:secret@staging.barbertrix.com", "https://staging.barbertrix.com:8443",
            "https://staging.barbertrix.com?debug=1",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                smoke.validate_base_url(url)

    def test_uses_staging_only_origin(self):
        self.assertEqual(smoke.validate_base_url("https://STAGING.barbertrix.com/"), "https://staging.barbertrix.com")

    def test_all_readonly_probe_paths(self):
        opener = FakeOpener()
        result = smoke.probe("https://staging.example.org.invalid", opener, 2.0)
        self.assertEqual(opener.paths, ["/health", "/health/live", "/health/ready", "/api"])
        self.assertEqual(len(result), 4)

    def test_fails_if_db_readiness_unhealthy(self):
        opener = FakeOpener(status_by_path={"/health/ready": 503})
        with self.assertRaises(HTTPError):
            smoke.probe("https://staging.example.org.invalid", opener, 2.0)

    def test_redirects_are_rejected(self):
        self.assertIsNone(smoke.NoRedirect().redirect_request(None, None, 302, "Moved", {}, "https://staging.barbertrix.com/other"))

    def test_fails_when_security_header_missing(self):
        opener = FakeOpener(header_by_path={"/health/live": {}})
        with self.assertRaisesRegex(ValueError, "X-Content-Type-Options"):
            smoke.probe("https://staging.example.org.invalid", opener, 2.0)


if __name__ == "__main__":
    unittest.main()
