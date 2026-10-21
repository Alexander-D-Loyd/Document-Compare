const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('offlineLanguage',Object.freeze({
 review:(id,kind,chunks,options={})=>ipcRenderer.invoke('offline-language:review',{id,kind,chunks,includeLcbReaderReview:options.includeLcbReaderReview===true}),
 cancel:id=>ipcRenderer.invoke('offline-language:cancel',id)
}));
