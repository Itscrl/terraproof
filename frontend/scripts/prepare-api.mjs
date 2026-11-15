import { cp, copyFile, mkdir, rm, access, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(frontend, "..");
const destination = resolve(frontend, "server_bundle");
await access(resolve(root, "src/terraproof/api.py")).catch(() => {
  throw new Error(
    "Backend source is missing. In Vercel, enable 'Include source files outside the Root Directory in the Build Step' for the frontend project.",
  );
});
if (destination !== resolve(frontend, "server_bundle"))
  throw new Error("Invalid bundle destination");
await rm(destination, { recursive: true, force: true });
await mkdir(resolve(destination, "src"), { recursive: true });
await cp(
  resolve(root, "src/terraproof"),
  resolve(destination, "src/terraproof"),
  {
    recursive: true,
    filter: (path) =>
      !path.split(sep).includes("__pycache__") && !path.endsWith(".pyc"),
  },
);
await mkdir(resolve(destination, "data"), { recursive: true });
await cp(
  resolve(root, "data/reference"),
  resolve(destination, "data/reference"),
  { recursive: true },
);
// Rasterio's manylinux wheel expects Expat from the OS. The Vercel builder has
// it, but the function runtime does not. Include the actual ELF, not its symlink.
if (process.platform === "linux") {
  const multiarch =
    process.arch === "arm64" ? "aarch64-linux-gnu" : "x86_64-linux-gnu";
  const candidates = [
    "/lib64/libexpat.so.1",
    "/usr/lib64/libexpat.so.1",
    `/lib/${multiarch}/libexpat.so.1`,
    `/usr/lib/${multiarch}/libexpat.so.1`,
  ];
  let source;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      source = candidate;
      break;
    } catch {
      /* try the next standard system library location */
    }
  }
  if (!source)
    throw new Error(
      "The Linux builder must provide libexpat.so.1 for the Python function.",
    );
  await mkdir(resolve(destination, "lib"), { recursive: true });
  await copyFile(source, resolve(destination, "lib/libexpat.so.1"));
  // Preserve the upstream MIT licence with the redistributed system library.
  await copyFile(
    resolve(frontend, "licenses/expat-MIT.txt"),
    resolve(destination, "lib/expat-MIT.txt"),
  );
  const elf = await readFile(resolve(destination, "lib/libexpat.so.1"));
  if (elf.subarray(0, 4).toString("hex") !== "7f454c46")
    throw new Error("Bundled Expat is not a Linux ELF library.");
  console.log("Bundled Linux Expat for Rasterio startup.");
}
console.log("Prepared FastAPI source and public reference data for Vercel.");
