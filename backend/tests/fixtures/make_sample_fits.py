"""Generate tests/fixtures/sample.fits with known header content.

Run once from the repo root: `uv run python tests/fixtures/make_sample_fits.py`.
The output is committed to git so tests do not regenerate it.
"""
from pathlib import Path

import numpy as np
from astropy.io import fits

HERE = Path(__file__).parent
OUT = HERE / "sample.fits"


def main() -> None:
    # Primary HDU: a 10x10 image with a descriptive observation header.
    image = np.zeros((10, 10), dtype=np.float32)
    primary = fits.PrimaryHDU(data=image)
    primary.header["OBJECT"] = ("M31", "Target object")
    primary.header["TELESCOP"] = ("Hubble", "Telescope")
    primary.header["INSTRUME"] = ("WFC3", "Instrument")
    primary.header["EXPTIME"] = (1200.0, "Exposure time in seconds")
    primary.header["FILTER"] = ("F606W", "Filter")
    primary.header["DATE-OBS"] = ("2024-01-15", "Observation date")

    # Second HDU: a small spectrum table (3 rows, 2 columns).
    col1 = fits.Column(
        name="WAVELENGTH", format="E",
        array=np.array([500.0, 510.0, 520.0], dtype=np.float32),
    )
    col2 = fits.Column(
        name="FLUX", format="E",
        array=np.array([1.0, 0.9, 0.8], dtype=np.float32),
    )
    table = fits.BinTableHDU.from_columns([col1, col2], name="SPECTRUM")

    fits.HDUList([primary, table]).writeto(OUT, overwrite=True)
    print(f"Wrote {OUT} (2 HDUs: PRIMARY image + SPECTRUM table)")


if __name__ == "__main__":
    main()
