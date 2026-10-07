import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: () => ipcRenderer.send('print-receipt'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  isDesktop: true,
});
