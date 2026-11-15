import { cp, mkdir, rm, access } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(frontend, "..");
const destination = resolve(frontend, "server_bundle");
await access(resolve(root, "src/terraproof/api.py")).catch(() => {
  throw new Error("Backend source is missing. In Vercel, enable 'Include source files outside the Root Directory in the Build Step' for the frontend project.");
});
if (destination !== resolve(frontend, "server_bundle")) throw new Error("Invalid bundle destination");
await rm(destination, { recursive: true, force: true });
await mkdir(resolve(destination, "src"), { recursive: true });
await cp(resolve(root, "src/terraproof"), resolve(destination, "src/terraproof"), {
  recursive: true,
  filter: path => !path.split(sep).includes("__pycache__") && !path.endsWith(".pyc"),
});
await mkdir(resolve(destination, "data"), { recursive: true });
await cp(resolve(root, "data/reference"), resolve(destination, "data/reference"), { recursive: true });
console.log("Prepared FastAPI source and public reference data for Vercel.");
