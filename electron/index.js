const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')

let window = null

function createWindow() {
  window = new BrowserWindow({width: 1024, height: 600})

  window.loadURL('http://15.164.158.226:5000')

  //window.webContents.openDevTools()

  window.on('closed', () => {
    window = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (window === null) {
    createWindow()
  }
})