import 'core-js/stable'
import 'regenerator-runtime/runtime'

import React from 'react'
import ReactDom from 'react-dom'
import { Provider } from 'react-redux'

import App from './App'
import store from './state/store'
import getData from './localStorage'
import setCssVariable from '../utils/setCssVariable'
import config from '../config/client'

// Registered Service Worker
if (window.location.protocol === 'https:' && navigator.serviceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/fiora-sw.js')
  })
}

// If front-end monitoring is configured, dynamically load and start monitoring
if (config.frontendMonitorAppId) {
  // @ts-ignore
  import(/* webpackChunkName: "frontend-monitor" */ 'wpk-reporter').then(module => {
    const WpkReporter = module.default

    const __wpk = new WpkReporter({
      bid: config.frontendMonitorAppId,
      spa: true,
      rel: process.env.frontendMonitorVersion,
      uid: () => localStorage.getItem('username') || '',
      plugins: []
    })

    __wpk.installAll()
  })
}

// Update css variable
const { primaryColor, primaryTextColor } = getData()
setCssVariable(primaryColor, primaryTextColor)

// Request Notification authorization
if (
  window.Notification &&
  (window.Notification.permission === 'default' || window.Notification.permission === 'denied')
) {
  window.Notification.requestPermission()
}

ReactDom.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('app')
)
