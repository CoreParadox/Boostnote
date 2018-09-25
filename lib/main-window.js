const electron = require('electron')
const { app, BrowserWindow, Menu, MenuItem, Tray, ipcMain } = electron
const path = require('path')
const Config = require('electron-config')
const config = new Config()
const _ = require('lodash')
const manifest = require('../package.json')
const product = `${manifest.productName} ${manifest.version}`

var menu
var showMenu = process.platform !== 'win32'
const windowSize = config.get('windowsize') || { x: null, y: null, width: 1080, height: 720 }

const mainWindow = new BrowserWindow({
  x: windowSize.x,
  y: windowSize.y,
  width: windowSize.width,
  height: windowSize.height,
  minWidth: 500,
  minHeight: 320,
  autoHideMenuBar: showMenu,
  webPreferences: {
    zoomFactor: 1.0,
    enableBlinkFeatures: 'OverlayScrollbars'
  },
  icon: path.resolve(__dirname, '../resources/app.png')
})

const url = path.resolve(__dirname, './main.html')

mainWindow.loadURL('file://' + url)

mainWindow.webContents.on('new-window', function (e) {
  e.preventDefault()
})

mainWindow.webContents.sendInputEvent({
  type: 'keyDown',
  keyCode: '\u0008'
})

mainWindow.webContents.sendInputEvent({
  type: 'keyUp',
  keyCode: '\u0008'
})

mainWindow.on('close', function (e) {
  if (process.platform === 'darwin' || process.env.DESKTOP_SESSION === 'cinnamon') {    e.preventDefault()
    if (mainWindow.isFullScreen()) {
      mainWindow.once('leave-full-screen', function () {
        mainWindow.hide()
      })
      mainWindow.setFullScreen(false)
    } else {
      mainWindow.hide()
    }
  }
  })

  mainWindow.webContents.send('tray:probe-close')
})

app.on('before-quit', function (e) {
  mainWindow.removeAllListeners()
})

app.on('window-all-closed', function () {
  app.quit()
})


mainWindow.on('resize', _.throttle(storeWindowSize, 500))
mainWindow.on('move', _.throttle(storeWindowSize, 500))

function storeWindowSize () {
  try {
    config.set('windowsize', mainWindow.getBounds())
  } catch (e) {
    // ignore any errors because an error occurs only on update
    // refs: https://github.com/BoostIO/Boostnote/issues/243
  }
}

app.on('activate', function () {
  if (mainWindow == null) return null
  mainWindow.show()
})

ipcMain.on('tray:update', handleTrayUpdate)

ipcMain.on('tray:quit', function (e, notes) {
  ipcMain.removeListener('tray:update', handleTrayUpdate)
  menu = null
  app.quit()
})

function handleTrayUpdate (e, notes) {
  updateTray(notes)
}

function updateTray (notes) {
  const menu = new Menu()

  menu.append(new MenuItem({
    label: `Open ${product}`,
    click: function () {
      mainWindow.show()
    }
  }))

  if (notes && notes.length) {
    menu.append(new MenuItem({type: 'separator'}))
    notes.forEach(note => {
      menu.append(new MenuItem({
        label: note.title,
        click: function () {
          mainWindow.webContents.send('list:jump', `${note.storage}-${note.key}`)
          mainWindow.show()
        }
      }))
    })
    menu.append(new MenuItem({type: 'separator'}))
  }

  menu.append(new MenuItem({
    label: 'Quit',
    click: function () {
      app.quit()
    }
  }))

  tray.setContextMenu(menu)

  return menu
}

const tray = new Tray(path.join(__dirname, '../resources/tray-icon-dark@2x.png'))
menu = updateTray()
tray.setToolTip(product)
tray.on('click', function (e) {
  e.preventDefault()
  tray.popUpContextMenu(menu)
})

module.exports = mainWindow
