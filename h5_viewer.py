"""Standalone, read-only HDF5 viewer.

Run from this folder (dependencies are isolated from TerraProof):
    .h5-viewer-runtime/bin/streamlit run h5_viewer.py

For a fresh setup with uv installed:
    uvx --python 3.12 --with h5py --with matplotlib streamlit run h5_viewer.py

Then open the local URL printed in the terminal. Stop with Ctrl+C.
"""

from importlib.util import find_spec
from pathlib import Path

import h5py
import matplotlib.pyplot as plt
import numpy as np
import streamlit as st


st.set_page_config(page_title="HDF5 viewer", layout="wide")
st.title("HDF5 viewer")
st.caption("Standalone, read-only viewer · datasets, attributes, tables, and plots")

root = Path(__file__).resolve().parent
files = sorted([*root.glob("*.h5"), *root.glob("*.hdf5")])
choice = st.sidebar.selectbox("File beside this script", [str(p) for p in files] or [""])
filename = st.sidebar.text_input("Or enter a local HDF5 path", value=choice)
if not filename:
    st.info("Enter the path to an .h5 or .hdf5 file.")
    st.stop()


def display_value(value):
    """Keep metadata readable, including byte strings and NumPy values."""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


try:
    with h5py.File(Path(filename).expanduser(), "r") as handle:
        datasets = []

        def collect(name, item):
            if isinstance(item, h5py.Dataset):
                datasets.append(name)

        handle.visititems(collect)
        with st.expander("File and group attributes"):
            groups = ["/"]
            handle.visititems(
                lambda name, item: groups.append(name) if isinstance(item, h5py.Group) else None
            )
            group = st.selectbox("Group", groups)
            st.json({key: display_value(value) for key, value in handle[group].attrs.items()})

        if not datasets:
            st.info("This file contains no datasets.")
            st.stop()
        query = st.sidebar.text_input("Filter dataset paths")
        matches = [name for name in datasets if query.lower() in name.lower()]
        st.sidebar.caption(f"{len(matches)} of {len(datasets)} datasets")
        if not matches:
            st.info("No datasets match the filter.")
            st.stop()
        preferred = "science/LSAR/SME2/grids/soilMoisture"
        selected = st.sidebar.selectbox(
            "Dataset", matches, index=matches.index(preferred) if preferred in matches else 0
        )
        dataset = handle[selected]
        st.subheader("/" + selected)
        st.write(f"Shape: {dataset.shape} · Type: {dataset.dtype}")
        with st.expander("Dataset attributes", expanded=True):
            st.json({key: display_value(value) for key, value in dataset.attrs.items()})

        if dataset.shape is None or dataset.size == 0:
            st.info("This dataset is empty.")
            st.stop()
        if dataset.ndim == 0:
            st.code(display_value(dataset[()]))
            st.stop()

        # Select one plane for multidimensional arrays and read a bounded preview.
        indices = []
        for axis, size in enumerate(dataset.shape[:-2]):
            indices.append(int(st.number_input(f"Axis {axis} index", 0, size - 1, 0)))
        limit = st.select_slider("Maximum preview size per axis", [128, 256, 512, 1024], value=512)
        strides = [max(1, (size + limit - 1) // limit) for size in dataset.shape[-2:]]
        selection = tuple(indices) + tuple(slice(None, None, step) for step in strides)
        data = dataset[selection]
        st.caption(f"Preview shape: {data.shape}. Sampling strides: {strides}. File is unchanged.")

        if np.issubdtype(data.dtype, np.number) and not np.iscomplexobj(data):
            values = data.astype(float)
            for key in ("_FillValue", "missing_value"):
                if key in dataset.attrs:
                    for fill in np.asarray(dataset.attrs[key]).ravel():
                        values[values == fill] = np.nan
            values[~np.isfinite(values)] = np.nan
            st.caption("Plots show stored values; scale_factor/add_offset are not applied.")
            if np.any(np.isfinite(values)):
                col1, col2 = st.columns(2)
                col1.metric("Preview minimum", f"{np.nanmin(values):.6g}")
                col2.metric("Preview maximum", f"{np.nanmax(values):.6g}")
                fig, ax = plt.subplots(figsize=(10, 5))
                if values.ndim == 2:
                    cmap = st.selectbox("Color palette", ["viridis", "terrain", "coolwarm", "gray"])
                    plot = ax.imshow(values, cmap=cmap, interpolation="nearest", aspect="auto")
                    fig.colorbar(plot, ax=ax, label="Stored value")
                    ax.set_xlabel(f"Column (sample stride {strides[-1]})")
                    ax.set_ylabel(f"Row (sample stride {strides[-2]})")
                else:
                    ax.plot(np.arange(values.size) * strides[0], values)
                    ax.set_xlabel("Index")
                    ax.set_ylabel("Stored value")
                st.pyplot(fig)
                plt.close(fig)
            else:
                st.info("The selected preview contains only missing or nonfinite values.")

        with st.expander("Preview values"):
            if data.dtype.kind in "SUO" or find_spec("pyarrow") is None:
                st.text(np.array2string(data, threshold=200))
            else:
                st.dataframe(data, width="stretch")
except (OSError, ValueError, TypeError, KeyError) as exc:
    st.error(f"Unable to display this file or dataset: {exc}")
