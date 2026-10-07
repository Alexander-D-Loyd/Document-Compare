const { app, BrowserWindow, protocol, net, session, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
app.setName('Document Compare');
protocol.registerSchemesAsPrivileged([{ scheme: 'compare', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
async function createWindow() {
  const win = new BrowserWindow({ width: 1360, height: 920, minWidth: 850, minHeight: 650, backgroundColor: '#101722', show: false, autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== 'compare://local/index.html') event.preventDefault(); });
  win.once('ready-to-show', () => { if (process.env.DOCUMENT_COMPARE_QA !== '1') win.show(); });
  await win.loadURL('compare://local/index.html');
}
app.whenReady().then(async () => {
  const root = path.join(__dirname, 'app');
  protocol.handle('compare', async request => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'local') return new Response('Forbidden', { status: 403 });
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
      return await net.fetch(pathToFileURL(file).toString());
    } catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, callback) => callback({ cancel: true }));
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Document Compare', submenu: [{ role: 'quit' }] }, { label: 'Edit', submenu: [{ role: 'copy' }, { role: 'selectAll' }] }, { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] }]));
  await createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
