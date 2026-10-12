export async function registerOfflineApp(): Promise<void> {
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
  try {const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});void registration.update().catch(()=>{});}catch { /* Browsers may deny service workers; local editing remains available. */ }
}

export async function prepareOfflineApp(): Promise<boolean> {
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return false;
  try {
    const registration=await new Promise<ServiceWorkerRegistration | undefined>(resolve=>{
      const timer=setTimeout(()=>resolve(undefined),1500);
      void navigator.serviceWorker.getRegistration('/').then(value=>{clearTimeout(timer);resolve(value);},()=>{clearTimeout(timer);resolve(undefined);});
    });
    if(registration?.waiting&&navigator.serviceWorker.controller) {
      const changed=await new Promise<boolean>(resolve=>{
        const finished=()=>{clearTimeout(timer);resolve(true);};
        const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',finished);resolve(false);},3000);
        navigator.serviceWorker.addEventListener('controllerchange',finished,{once:true});
        registration.waiting?.postMessage({type:'activate-on-open'});
      });
      if(changed){location.reload();return true;}
    }
    navigator.serviceWorker.controller?.postMessage({type:'cleanup'});
  }catch { /* Installation is optional; denial must not prevent opening projects. */ }
  return false;
}
