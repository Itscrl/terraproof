"""Read-only HDF5 readiness checks; never deserialize a model from an input file."""

import hashlib
from datetime import UTC, datetime
from pathlib import Path

import h5py


def inspect_hdf5(
    path: Path, expected_sha256: str | None = None, archive_record: dict | None = None
) -> dict:
    """Hash incrementally and inspect dataset metadata without loading raster arrays.

    Readable metadata is not a full raster checksum/quality or training-readiness test.
    Files are opened read-only, and local external links are not traversed.
    """
    before = path.stat()
    digest = hashlib.sha256()
    md5 = hashlib.md5(usedforsecurity=False)  # NASA archive integrity, not authentication.
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
            md5.update(block)
    report = {
        "filename": path.name,
        "bytes": before.st_size,
        "sha256": digest.hexdigest(),
        "md5": md5.hexdigest(),
        "source_checksum_verified": False,
        "inspected_at": datetime.now(UTC).isoformat(),
        "metadata_readable": False,
        "training_ready": False,
        "datasets": [],
        "errors": [],
        "limits": "Metadata inspection only; raster values, quality, labels and pairing unverified",
    }
    if expected_sha256 and digest.hexdigest() != expected_sha256.lower():
        report["errors"].append("SHA-256 does not match the expected source digest")
    if archive_record is not None:
        report["source_archive_record"] = archive_record
        checksum = archive_record.get("Checksum", {})
        algorithm = str(checksum.get("Algorithm", "")).upper().replace("-", "")
        actual = {"MD5": md5.hexdigest(), "SHA256": digest.hexdigest()}.get(algorithm)
        if archive_record.get("Name") != path.name:
            report["errors"].append("Source archive filename does not match")
        elif archive_record.get("SizeInBytes") != before.st_size:
            report["errors"].append("Size differs from source archive record")
        elif actual is None or actual != str(checksum.get("Value", "")).lower():
            report["errors"].append("Source archive checksum mismatch or unsupported algorithm")
        else:
            report["source_checksum_verified"] = True
    try:
        with h5py.File(path, "r") as source:
            # Opening '/' catches corruption that can survive opening the file handle.
            source["/"]

            def visit(name, obj):
                if isinstance(obj, h5py.Dataset):
                    if obj.is_virtual or obj.external:
                        raise ValueError(
                            "External/virtual datasets are unsupported for local audit"
                        )
                    item = {"path": name, "shape": obj.shape, "dtype": str(obj.dtype)}
                    # Only tiny scalar identification fields are read, never image tiles.
                    if (
                        "/identification/" in name
                        and obj.shape == ()
                        and obj.dtype.kind in "SUbiuf"
                        and obj.dtype.itemsize <= 256
                    ):
                        value = obj[()]
                        item["value"] = (
                            value.decode("utf-8", errors="replace")
                            if isinstance(value, bytes)
                            else str(value)
                        )
                    report["datasets"].append(item)

            source.visititems(visit)
            report["metadata_readable"] = True
    except (OSError, KeyError, ValueError, RuntimeError) as exc:
        report["errors"].append(f"HDF5 read failed: {exc}")
    after = path.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        report["errors"].append("File changed during inspection; finish downloading and rerun")
        report["metadata_readable"] = False
    report["next_step"] = (
        "Verify checksum, raster quality, spatial coverage, acquisition dates and labels"
        if report["metadata_readable"] and not report["errors"]
        else "Re-download to a new file via Earthdata/ASF; preserve this input for diagnosis"
    )
    return report
