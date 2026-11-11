#!/usr/bin/env python3
"""Offline regression checks for resolved Compose bind mount validation."""
import unittest

from check_compose import is_trusted_nginx_bind


TARGET = "/etc/nginx/conf.d/default.conf"


def mount(source: str, *, read_only=True, kind="bind", target=TARGET):
    return {"type": kind, "source": source, "target": target, "read_only": read_only}


class ComposeMountContractTests(unittest.TestCase):
    def test_linux_absolute_bind(self):
        self.assertTrue(is_trusted_nginx_bind(mount("/home/runner/work/BarberTrix/deploy/staging/nginx.conf")))

    def test_windows_absolute_bind_backslashes(self):
        self.assertTrue(is_trusted_nginx_bind(mount(r"C:\Users\jairo\OneDrive\BarberTrix\deploy\staging\nginx.conf")))

    def test_windows_drive_with_forward_slashes(self):
        self.assertTrue(is_trusted_nginx_bind(mount("C:/Users/jairo/BarberTrix/deploy/staging/nginx.conf")))

    def test_wsl_docker_desktop_absolute_bind(self):
        self.assertTrue(is_trusted_nginx_bind(mount("/run/desktop/mnt/host/c/Users/jairo/BarberTrix/deploy/staging/nginx.conf")))

    def test_rejects_writeable_mount(self):
        self.assertFalse(is_trusted_nginx_bind(mount("C:/Users/jairo/BarberTrix/deploy/staging/nginx.conf", read_only=False)))

    def test_rejects_named_volume(self):
        self.assertFalse(is_trusted_nginx_bind(mount("/data/deploy/staging/nginx.conf", kind="volume")))

    def test_rejects_wrong_target(self):
        self.assertFalse(is_trusted_nginx_bind(mount("/data/deploy/staging/nginx.conf", target="/etc/nginx/conf.d/other.conf")))

    def test_rejects_wrong_filename(self):
        self.assertFalse(is_trusted_nginx_bind(mount("/data/deploy/staging/unsafe.conf")))

    def test_rejects_relative_and_traversal_paths(self):
        self.assertFalse(is_trusted_nginx_bind(mount("./deploy/staging/nginx.conf")))
        self.assertFalse(is_trusted_nginx_bind(mount("/tmp/../deploy/staging/nginx.conf")))

    def test_rejects_non_dict(self):
        self.assertFalse(is_trusted_nginx_bind("C:/Users/jairo/BarberTrix/deploy/staging/nginx.conf"))


if __name__ == "__main__":
    unittest.main()
