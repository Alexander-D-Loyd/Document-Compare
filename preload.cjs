const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('offlineLanguage',Object.freeze({
 review:(id,kind,chunks)=>ipcRenderer.invoke('offline-language:review',{id,kind,chunks}),
 cancel:id=>ipcRenderer.invoke('offline-language:cancel',id)
}));
