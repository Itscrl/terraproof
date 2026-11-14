import hashlib

import h5py
import numpy as np

from terraproof.satellite import inspect_hdf5


def test_inventory_is_read_only_and_not_training_approval(tmp_path):
    path = tmp_path / "fixture.h5"
    with h5py.File(path, "w") as source:
        source.create_dataset("science/LSAR/identification/productType", data=np.bytes_("SME2"))
        source.create_dataset("science/LSAR/SME2/grid/soilMoisture", shape=(10, 10), dtype="f4")
    original = path.read_bytes()
    report = inspect_hdf5(path)
    assert report["metadata_readable"] and not report["errors"]
    assert not report["training_ready"]
    assert len(report["datasets"]) == 2
    assert path.read_bytes() == original
    assert inspect_hdf5(path, "0" * 64)["errors"]
    record = {
        "Name": path.name,
        "SizeInBytes": len(original),
        "Checksum": {"Algorithm": "MD5", "Value": hashlib.md5(original).hexdigest()},
    }
    assert inspect_hdf5(path, archive_record=record)["source_checksum_verified"]
    record["Checksum"]["Value"] = "0" * 32
    assert "checksum mismatch" in inspect_hdf5(path, archive_record=record)["errors"][0]


def test_corrupt_input_rejected(tmp_path):
    path = tmp_path / "incomplete.h5"
    path.write_bytes(b"\x00" * 4096)
    result = inspect_hdf5(path)
    assert not result["metadata_readable"]
    assert "signature" in result["errors"][0]


def test_external_raster_is_not_loaded(tmp_path):
    path = tmp_path / "external.h5"
    with h5py.File(path, "w") as source:
        source.create_dataset("external", (10,), external=[("missing.bin", 0, 40)], dtype="f4")
    result = inspect_hdf5(path)
    assert not result["metadata_readable"]
    assert "External/virtual" in result["errors"][0]
