import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { PlaylistService } from './services/PlaylistService';
import { EPGService } from './services/EPGService';
import { ChannelService } from './services/ChannelService';
import { StorageService } from './services/StorageService';
import { StreamService } from './services/StreamService';
import { XtreamService } from './services/XtreamService';

// Suppress macOS CoreText font warnings
app.commandLine.appendSwitch('disable-features', 'FontAccessAPI');
// Ignore certificate errors for IPTV streams (many use self-signed certs)
app.commandLine.appendSwitch('ignore-certificate-errors');
// Disable CORS for external streams
app.commandLine.appendSwitch('disable-web-security');
// Disable hardware acceleration if causing issues
// app.commandLine.appendSwitch('disable-gpu');

let mainWindow: BrowserWindow | null = null;
let playlistService: PlaylistService;
let epgService: EPGService;
let channelService: ChannelService;
let storageService: StorageService;
let streamService: StreamService;
let xtreamService: XtreamService;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1f2937',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow CORS for external IPTV streams
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // Try dev server first, fallback to production build
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function initializeServices(): void {
  storageService = new StorageService();
  playlistService = new PlaylistService(storageService);
  epgService = new EPGService(storageService);
  channelService = new ChannelService(storageService, playlistService, epgService);
  streamService = new StreamService();
  xtreamService = new XtreamService(storageService);
}

function setupIpcHandlers(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Playlist management
  ipcMain.handle('playlist:import', async (_, url: string) => {
    // Check if this is an Xtream Codes URL
    if (xtreamService.isXtreamUrl(url)) {
      console.log('Detected Xtream Codes URL, using Xtream API');

      // Set up progress callback to send to renderer
      xtreamService.setProgressCallback((status, percent) => {
        mainWindow?.webContents.send('import:progress', { status, percent });
      });

      const result = await xtreamService.importXtreamPlaylist(url);

      // Clear the callback
      xtreamService.setProgressCallback(null);

      return result;
    }
    // Standard M3U playlist
    return await playlistService.importPlaylist(url);
  });

  ipcMain.handle('playlist:importFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return await playlistService.importPlaylistFromFile(result.filePaths[0]);
    }
    return null;
  });

  ipcMain.handle('playlist:getAll', async () => {
    return await playlistService.getAllPlaylists();
  });

  ipcMain.handle('playlist:delete', async (_, id: string) => {
    return await playlistService.deletePlaylist(id);
  });

  ipcMain.handle('playlist:refresh', async (_, id: string) => {
    return await playlistService.refreshPlaylist(id);
  });

  // Channel management
  ipcMain.handle('channel:getAll', async (_, filters?: { playlistId?: string; group?: string; search?: string }) => {
    return await channelService.getChannels(filters);
  });

  ipcMain.handle('channel:getGroups', async (_, playlistId?: string) => {
    return await channelService.getGroups(playlistId);
  });

  ipcMain.handle('channel:toggleFavorite', async (_, channelId: string) => {
    return await channelService.toggleFavorite(channelId);
  });

  ipcMain.handle('channel:getFavorites', async () => {
    return await channelService.getFavorites();
  });

  // EPG management
  ipcMain.handle('epg:import', async (_, url: string) => {
    return await epgService.importEPG(url);
  });

  ipcMain.handle('epg:getForChannel', async (_, channelId: string) => {
    return await epgService.getProgramsForChannel(channelId);
  });

  ipcMain.handle('epg:getCurrentProgram', async (_, channelId: string) => {
    return await epgService.getCurrentProgram(channelId);
  });

  // Stream testing
  ipcMain.handle('stream:test', async (_, url: string) => {
    return await streamService.testStream(url);
  });

  ipcMain.handle('stream:getInfo', async (_, url: string) => {
    return await streamService.getStreamInfo(url);
  });

  // History
  ipcMain.handle('history:add', async (_, channelId: string) => {
    return await channelService.addToHistory(channelId);
  });

  ipcMain.handle('history:get', async () => {
    return await channelService.getHistory();
  });

  ipcMain.handle('history:clear', async () => {
    return await channelService.clearHistory();
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return storageService.getSettings();
  });

  ipcMain.handle('settings:set', async (_, settings: Record<string, unknown>) => {
    return storageService.setSettings(settings);
  });
}

app.whenReady().then(() => {
  initializeServices();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle certificate errors for streams
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(true);
});
