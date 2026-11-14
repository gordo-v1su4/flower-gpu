import { RenderPipeline, type WebGPURenderer, type Scene, type PerspectiveCamera } from "three/webgpu";
import { mix, pass, uniform, vec3, vec4 } from "three/tsl";
import { dof } from "three/addons/tsl/display/DepthOfFieldNode.js";
import { ao } from "three/addons/tsl/display/GTAONode.js";
import { denoise } from "three/addons/tsl/display/DenoiseNode.js";
import { photographic } from "./petalMaterial";

export const photoSettings={enabled:false,depthOfField:false,contactShading:true,contactStrength:0.4,contactRadius:0.12,
  lighting:'Soft studio',keyStrength:1,rimStrength:1,fillStrength:1,environmentStrength:1,lightAngle:35,lightElevation:50,
  exposure:0.92,focusOffset:0,focusRange:0.75,bokeh:0.7};

export function createPhotography(renderer: WebGPURenderer,scene: Scene,camera: PerspectiveCamera) {
  const pipelines=new Map<string,RenderPipeline>();
  const focus=uniform(6), range=uniform(0.75), bokeh=uniform(0.7);
  const contactStrength=uniform(0.4);
  let scenePass:any, occlusion:any;
  function pipelineFor() {
    const key=`${photoSettings.contactShading}:${photoSettings.depthOfField}`;
    let pipeline=pipelines.get(key);
    if(!pipeline) {
      scenePass??=pass(scene,camera,{samples:0});
      let color=scenePass.getTextureNode();
      if(photoSettings.contactShading) {
        if(!occlusion) {
          occlusion=ao(scenePass.getTextureNode('depth'),null,camera);
          occlusion.resolutionScale=0.5;
          occlusion.thickness.value=0.15;
          occlusion.distanceFallOff.value=0.8;
        }
        const filtered=denoise(occlusion.getTextureNode(),scenePass.getTextureNode('depth'),null,camera);
        color=color.mul(vec4(vec3(mix(1,filtered.r,contactStrength)),1));
      }
      pipeline=new RenderPipeline(renderer);
      pipeline.outputNode=photoSettings.depthOfField?dof(color,scenePass.getViewZNode(),focus,range,bokeh):color;
      pipelines.set(key,pipeline);
    }
    return pipeline;
  }
  function render() {
    photographic.value=photoSettings.enabled?1:0;
    renderer.toneMappingExposure=photoSettings.exposure;
    if(photoSettings.enabled && (photoSettings.depthOfField||photoSettings.contactShading)) {
      const pipeline=pipelineFor();
      // Focus on the head, at (0, .65, 0), along the current perspective view.
      focus.value=Math.hypot(camera.position.x,camera.position.y-0.65,camera.position.z)+photoSettings.focusOffset;
      range.value=photoSettings.focusRange; bokeh.value=photoSettings.bokeh;
      contactStrength.value=photoSettings.contactStrength;
      if(occlusion)occlusion.radius.value=photoSettings.contactRadius;
      pipeline.render();
    } else renderer.render(scene,camera);
  }
  return {render};
}
