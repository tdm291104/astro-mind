"""FITS image preview: detect a 2-D image HDU and render it to PNG (matplotlib, Agg).

matplotlib is imported lazily inside the render function so importing this module (and the
API) stays light."""
import io
from pathlib import Path

from astropy.io import fits

COLORMAPS = {"magma", "viridis", "gray", "hot", "inferno", "plasma"}
STRETCHES = {"linear", "log", "sqrt"}

_HEADER_KEYS = [
    "OBJECT", "TELESCOP", "INSTRUME", "FILTER", "DATE-OBS",
    "EXPTIME", "RA", "DEC", "NAXIS1", "NAXIS2", "BUNIT", "OBSERVER", "ORIGIN",
]


def _first_image_hdu(hdul) -> object | None:
    for hdu in hdul:
        data = getattr(hdu, "data", None)
        if data is not None and getattr(data, "ndim", 0) == 2:
            return hdu
    return None


def fits_has_image(path: Path) -> bool:
    with fits.open(path) as hdul:
        return _first_image_hdu(hdul) is not None


def fits_header(path: Path) -> dict:
    """Return selected FITS header fields as a plain dict."""
    with fits.open(path) as hdul:
        hdu = _first_image_hdu(hdul) or hdul[0]
        header = hdu.header
    result: dict = {}
    for k in _HEADER_KEYS:
        if k in header:
            val = header[k]
            if isinstance(val, (str, int, float, bool)):
                result[k] = val
    return result


def render_fits_png(path: Path, colormap: str = "magma", stretch: str = "linear") -> bytes | None:
    """Render the first 2-D image HDU to PNG bytes, or None if no image HDU found."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    cmap = colormap if colormap in COLORMAPS else "magma"
    stretch = stretch if stretch in STRETCHES else "linear"

    with fits.open(path) as hdul:
        hdu = _first_image_hdu(hdul)
        if hdu is None:
            return None
        data = np.asarray(hdu.data, dtype=float)

    finite = data[np.isfinite(data)]
    vmin, vmax = (np.percentile(finite, [1, 99]) if finite.size else (0.0, 1.0))
    if vmin == vmax:
        vmax = vmin + 1.0

    norm = None
    if stretch == "log":
        from matplotlib.colors import LogNorm
        shift = max(0.0, -vmin) + 1e-6
        data = data + shift
        norm = LogNorm(vmin=max(vmin + shift, 1e-10), vmax=vmax + shift)
        vmin, vmax = None, None
    elif stretch == "sqrt":
        shift = max(0.0, -vmin)
        data = np.sqrt(np.maximum(data + shift, 0))
        vmin = float(np.sqrt(max(vmin + shift, 0)))
        vmax = float(np.sqrt(vmax + shift))

    fig, ax = plt.subplots(figsize=(6, 6))
    imshow_kw: dict = {"origin": "lower", "cmap": cmap}
    if norm is not None:
        imshow_kw["norm"] = norm
    else:
        imshow_kw["vmin"] = vmin
        imshow_kw["vmax"] = vmax
    ax.imshow(data, **imshow_kw)
    ax.axis("off")
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0, dpi=150)
    plt.close(fig)
    return buf.getvalue()
