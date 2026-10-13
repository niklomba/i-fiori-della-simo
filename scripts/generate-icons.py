#!/usr/bin/env python3
"""Generate mobile PWA PNG icons from the approved text-free gardener mascot."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "icons" / "mascot-source-v041.jpg"
OUT = ROOT / "icons"

with Image.open(SOURCE) as source:
    source = source.convert("RGB")
    for name, size in (
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("apple-touch-icon.png", 180),
        ("icon-192-v041.png", 192),
        ("icon-512-v041.png", 512),
        ("apple-touch-icon-v041.png", 180),
    ):
        filename = OUT / name
        source.resize((size, size), Image.Resampling.LANCZOS).save(
            filename, format="PNG", optimize=True, compress_level=9
        )
        print(f"Built {filename.relative_to(ROOT)} ({size}x{size})")
