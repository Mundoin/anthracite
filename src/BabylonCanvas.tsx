import { useEffect, useRef } from "react";
import type { JSX } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from "@babylonjs/core";

/**
 * BabylonCanvas — V1A placeholder for the command-deck scene.
 * Renders a dark empty scene. No topology yet. Resizes with parent.
 */
export function BabylonCanvas(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.04, 0.05, 0.07, 1);
    scene.ambientColor = new Color3(0.1, 0.1, 0.12);

    const camera = new ArcRotateCamera(
      "deck-cam",
      Math.PI / 2,
      Math.PI / 3,
      14,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.wheelDeltaPercentage = 0.01;

    const light = new HemisphericLight(
      "deck-light",
      new Vector3(0, 1, 0),
      scene,
    );
    light.intensity = 0.4;
    light.groundColor = new Color3(0.02, 0.02, 0.03);

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = (): void => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="babylon-canvas" />;
}
