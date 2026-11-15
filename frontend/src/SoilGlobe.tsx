import { useEffect, useRef, useState } from "react";
import * as C from "@cesium/engine";
import type { Cartesian2, Cartographic } from "@cesium/core";
import "cesium/Build/Cesium/Widgets/widgets.css";
import type { Bounds } from "./soil-types";

type Props = {
  bounds: Bounds;
  selecting: boolean;
  focus: number;
  mapStyle: "satellite" | "roads";
  zoom: number;
  onSelect: (b: Bounds) => void;
  onFinish: () => void;
};

export default function SoilGlobe({
  bounds,
  selecting,
  focus,
  mapStyle,
  zoom,
  onSelect,
  onFinish,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<C.CesiumWidget | null>(null);
  const current = useRef({ selecting, onSelect, onFinish, mapStyle });
  const detailLayers = useRef<{
    satellite: C.ImageryLayer;
    roads: C.ImageryLayer;
    labels: C.ImageryLayer;
  } | null>(null);
  const previousZoom = useRef(0);
  const anchor = useRef<Cartographic | null>(null);
  const [error, setError] = useState("");
  const [imageryError, setImageryError] = useState(false);
  const [ready, setReady] = useState(false);
  current.current = { selecting, onSelect, onFinish, mapStyle };

  useEffect(() => {
    if (!container.current) return;
    let app: C.CesiumWidget;
    try {
      app = new C.CesiumWidget(container.current, {
        baseLayer: false,
        terrainProvider: new C.EllipsoidTerrainProvider(),
        skyBox: false,
        skyAtmosphere: false,
        requestRenderMode: true,
        contextOptions: { webgl: { preserveDrawingBuffer: true } },
      });
      viewer.current = app;
      app.scene.backgroundColor = C.Color.fromCssColorString("#101816");
      app.scene.globe.baseColor = C.Color.fromCssColorString("#314b46");
      app.scene.globe.enableLighting = false;
      app.scene.screenSpaceCameraController.minimumZoomDistance = 35;
      const imagery = new C.WebMapTileServiceImageryProvider({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-01-01/GoogleMapsCompatible_Level8/{TileMatrix}/{TileRow}/{TileCol}.jpeg",
        layer: "BlueMarble_ShadedRelief_Bathymetry",
        style: "default",
        format: "image/jpeg",
        tileMatrixSetID: "GoogleMapsCompatible_Level8",
        maximumLevel: 8,
        tileWidth: 256,
        tileHeight: 256,
        tilingScheme: new C.WebMercatorTilingScheme(),
        credit: "NASA GIBS · Blue Marble (static reference imagery)",
      });
      imagery.errorEvent.addEventListener(() => setImageryError(true));
      app.imageryLayers.addImageryProvider(imagery);
      // NASA provides the globe overview; Esri detail/labels help people locate small plots.
      Promise.all([
        C.ArcGisMapServerImageryProvider.fromUrl(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
          { enablePickFeatures: false, maximumLevel: 19 },
        ),
        C.ArcGisMapServerImageryProvider.fromUrl(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
          { enablePickFeatures: false, maximumLevel: 19 },
        ),
        C.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer",
          { enablePickFeatures: false, maximumLevel: 19 },
        ),
      ])
        .then(([satellite, roads, labels]) => {
          if (app.isDestroyed()) return;
          const layers = {
            satellite: new C.ImageryLayer(satellite, {
              minimumTerrainLevel: 6,
            }),
            roads: new C.ImageryLayer(roads),
            labels: new C.ImageryLayer(labels, { minimumTerrainLevel: 5 }),
          };
          detailLayers.current = layers;
          layers.satellite.show = current.current.mapStyle === "satellite";
          layers.labels.show = current.current.mapStyle === "satellite";
          layers.roads.show = current.current.mapStyle === "roads";
          for (const layer of Object.values(layers))
            app.imageryLayers.add(layer);
          app.scene.requestRender();
        })
        .catch(() => {
          if (!app.isDestroyed()) setImageryError(true);
        });
      app.camera.setView({
        destination: C.Cartesian3.fromDegrees(123.75, 13.15, 24000000),
      });
      anchor.current = null;
      const handler = new C.ScreenSpaceEventHandler(app.scene.canvas);
      handler.setInputAction((event: { position: Cartesian2 }) => {
        if (!current.current.selecting) return;
        const point = app.camera.pickEllipsoid(
          event.position,
          app.scene.globe.ellipsoid,
        );
        if (!point) return;
        const corner = C.Cartographic.fromCartesian(point);
        if (!anchor.current) {
          anchor.current = corner;
          return;
        }
        current.current.onSelect({
          west: C.Math.toDegrees(
            Math.min(anchor.current.longitude, corner.longitude),
          ),
          east: C.Math.toDegrees(
            Math.max(anchor.current.longitude, corner.longitude),
          ),
          south: C.Math.toDegrees(
            Math.min(anchor.current.latitude, corner.latitude),
          ),
          north: C.Math.toDegrees(
            Math.max(anchor.current.latitude, corner.latitude),
          ),
        });
        anchor.current = null;
        current.current.onFinish();
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction((event: { endPosition: Cartesian2 }) => {
        if (!current.current.selecting || !anchor.current) {
          anchor.current = null;
          return;
        }
        const point = app.camera.pickEllipsoid(
          event.endPosition,
          app.scene.globe.ellipsoid,
        );
        if (!point) return;
        const corner = C.Cartographic.fromCartesian(point);
        const entity = app.entities.getById("selection-preview");
        if (entity) app.entities.remove(entity);
        app.entities.add({
          id: "selection-preview",
          rectangle: {
            coordinates: new C.Rectangle(
              Math.min(anchor.current.longitude, corner.longitude),
              Math.min(anchor.current.latitude, corner.latitude),
              Math.max(anchor.current.longitude, corner.longitude),
              Math.max(anchor.current.latitude, corner.latitude),
            ),
            material: C.Color.fromCssColorString("#65cbb4").withAlpha(0.25),
            outline: true,
            outlineColor: C.Color.WHITE,
          },
        });
        app.scene.requestRender();
      }, C.ScreenSpaceEventType.MOUSE_MOVE);
      setReady(true);
      return () => {
        handler.destroy();
        app.destroy();
        viewer.current = null;
        detailLayers.current = null;
      };
    } catch (e) {
      setError(
        `The 3D globe could not start. You can still enter coordinates below. ${(e as Error).message}`,
      );
    }
  }, []);

  useEffect(() => {
    const layers = detailLayers.current;
    if (!layers) return;
    layers.satellite.show = mapStyle === "satellite";
    layers.labels.show = mapStyle === "satellite";
    layers.roads.show = mapStyle === "roads";
    viewer.current?.scene.requestRender();
  }, [mapStyle]);

  useEffect(() => {
    const app = viewer.current;
    if (!app || !ready || zoom === previousZoom.current) return;
    const distance = Math.max(
      10,
      app.camera.positionCartographic.height * 0.45,
    );
    if (
      zoom > previousZoom.current &&
      app.camera.positionCartographic.height > 45
    )
      app.camera.zoomIn(distance);
    else if (zoom < previousZoom.current) app.camera.zoomOut(distance);
    previousZoom.current = zoom;
    app.scene.requestRender();
  }, [zoom, ready]);

  useEffect(() => {
    const app = viewer.current;
    if (!app || !ready) return;
    app.scene.screenSpaceCameraController.enableRotate = !selecting;
    app.canvas.style.cursor = selecting ? "crosshair" : "grab";
    if (!selecting) {
      anchor.current = null;
      app.entities.removeById("selection-preview");
    }
  }, [selecting, ready]);

  useEffect(() => {
    const app = viewer.current;
    if (
      !app ||
      !ready ||
      bounds.west >= bounds.east ||
      bounds.south >= bounds.north
    )
      return;
    app.entities.removeById("selected-region");
    app.entities.removeById("selection-outline");
    app.entities.add({
      id: "selected-region",
      rectangle: {
        coordinates: C.Rectangle.fromDegrees(
          bounds.west,
          bounds.south,
          bounds.east,
          bounds.north,
        ),
        material: C.Color.fromCssColorString("#65cbb4").withAlpha(0.3),
        outline: true,
        outlineColor:
          mapStyle === "roads"
            ? C.Color.fromCssColorString("#246c61")
            : C.Color.WHITE,
      },
    });
    const b = bounds;
    app.entities.add({
      id: "selection-outline",
      polyline: {
        positions: C.Cartesian3.fromDegreesArrayHeights([
          b.west,
          b.south,
          50,
          b.east,
          b.south,
          50,
          b.east,
          b.north,
          50,
          b.west,
          b.north,
          50,
          b.west,
          b.south,
          50,
        ]),
        width: 2,
        material:
          mapStyle === "roads"
            ? C.Color.fromCssColorString("#246c61")
            : C.Color.WHITE,
        arcType: C.ArcType.RHUMB,
      },
    });
    app.scene.requestRender();
  }, [bounds, ready, mapStyle]);

  useEffect(() => {
    const app = viewer.current;
    if (!app || !focus) return;
    if (focus < 0) {
      app.camera.flyTo({
        destination: C.Cartesian3.fromDegrees(123.75, 13.15, 24000000),
        duration: 0,
      });
      return;
    }
    const b = bounds;
    if (b.west >= b.east || b.south >= b.north) return;
    // Detailed imagery supports navigation; science resolution stays independent of camera zoom.
    const padLon = Math.max((b.east - b.west) * 0.45, 0.00035);
    const padLat = Math.max((b.north - b.south) * 0.45, 0.00035);
    app.camera.flyTo({
      destination: C.Rectangle.fromDegrees(
        Math.max(-180, b.west - padLon),
        Math.max(-85, b.south - padLat),
        Math.min(180, b.east + padLon),
        Math.min(85, b.north + padLat),
      ),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 1,
    });
    // Focus only when requested; editing coordinates must not move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ready]);

  return (
    <div className="soil-globe-stage">
      <div
        ref={container}
        className="soil-globe-canvas"
        aria-label="Interactive Earth globe. Use region coordinate fields for keyboard selection."
      />
      {error && (
        <p className="globe-failure" role="alert">
          {error}
        </p>
      )}
      {imageryError && !error && (
        <p className="globe-notice" role="status">
          Some map imagery could not load. Try another map view or enter
          coordinates; the soil assessment uses separate numerical sources.
        </p>
      )}
    </div>
  );
}
