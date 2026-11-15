import SoilExplorer from "./SoilExplorer";
export default function RootApp() {
  // Older planning URLs now enter the region-based workflow; no economics calculator is routed.
  return <SoilExplorer />;
}
