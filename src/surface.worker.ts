import { prepareSurface } from "./prepareSurface";
self.onmessage = event => {
  try {
    const result=prepareSurface(event.data.settings);
    self.postMessage({id:event.data.id,result},{transfer:result.poses.map(p=>p.buffer)});
  } catch(error) { self.postMessage({id:event.data.id,error:String(error)}); }
};
