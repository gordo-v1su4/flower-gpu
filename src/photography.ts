import { RenderPipeline, type WebGPURenderer, type Scene, type PerspectiveCamera } from "three/webgpu";
import { pass, uniform } from "three/tsl";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { photographic } from "./petalMaterial";

export const photoSettings={enabled:false,depthOfField:false,exposure:0.92,focusOffset:0,focusRange:0.75,bokeh:0.7};

export function createPhotography(renderer: WebGPURenderer,scene: Scene,camera: PerspectiveCamera) {
  let pipeline: RenderPipeline | undefined;
  const focus=uniform(6), range=uniform(0.75), bokeh=uniform(0.7);
  function render() {
    photographic.value=photoSettings.enabled?1:0;
    renderer.toneMappingExposure=photoSettings.exposure;
    if(photoSettings.enabled && photoSettings.depthOfField) {
      if(!pipeline) {
        const scenePass=pass(scene,camera);
        pipeline=new RenderPipeline(renderer);
        pipeline.outputNode=dof(scenePass.getTextureNode(),scenePass.getViewZNode(),focus,range,bokeh);
      }
      // Focus on the head, at (0, .65, 0), along the current perspective view.
      focus.value=Math.hypot(camera.position.x,camera.position.y-0.65,camera.position.z)+photoSettings.focusOffset;
      range.value=photoSettings.focusRange; bokeh.value=photoSettings.bokeh;
      pipeline.render();
    } else renderer.render(scene,camera);
  }
  return {render};
}
