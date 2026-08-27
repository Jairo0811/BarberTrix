#!/usr/bin/env python3
"""Fail CI when selected critical backend types fall below a line threshold."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


def coverage_for(report: Path, assembly: str, class_names: set[str]) -> tuple[int, int]:
    root = ET.parse(report).getroot()
    lines: dict[tuple[str, int], bool] = {}

    for package in root.findall(".//package"):
        package_name = package.attrib.get("name", "")
        if package_name != assembly and not package_name.startswith(f"{assembly}."):
            continue

        for class_node in package.findall(".//class"):
            class_name = class_node.attrib.get("name", "")
            if class_names and class_name not in class_names:
                continue

            filename = class_node.attrib.get("filename", class_name or "unknown")
            for line in class_node.findall("./lines/line"):
                number = int(line.attrib["number"])
                key = (filename, number)
                lines[key] = lines.get(key, False) or int(line.attrib.get("hits", "0")) > 0

    return sum(lines.values()), len(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reports", type=Path, required=True)
    parser.add_argument("--assembly", required=True)
    parser.add_argument("--class-name", action="append", default=[])
    parser.add_argument("--minimum", type=float, required=True)
    args = parser.parse_args()
    class_names = set(args.class_name)

    candidates: list[tuple[float, int, int, Path]] = []
    for report in args.reports.rglob("coverage.cobertura.xml"):
        covered, total = coverage_for(report, args.assembly, class_names)
        if total:
            candidates.append((covered / total * 100, covered, total, report))

    scope = ", ".join(sorted(class_names)) if class_names else args.assembly
    if not candidates:
        print(f"No coverage data found for {scope} under {args.reports}.", file=sys.stderr)
        return 2

    percentage, covered, total, report = max(candidates)
    print(f"{scope} line coverage: {percentage:.2f}% ({covered}/{total}) from {report}")
    if percentage < args.minimum:
        print(f"Required minimum: {args.minimum:.2f}%.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
