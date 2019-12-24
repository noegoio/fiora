import path from 'path'
import options from '../utils/commandOptions'

/**
 * The file will also be executed in the client environment, and the value will not be obtained by structural assignment.
 * Because the client replaces values based on text matching
 */
// eslint-disable-next-line prefer-destructuring
const env = process.env

function getFirstNotUndefined(...values) {
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== undefined) {
      return values[i]
    }
  }
  return null
}

const now = new Date()
const frontendMonitorVersion = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`

export default {
  commonn: {
    autoPrefix: {
      enable: true,
      options: {
        browsers: ['last 3 versions']
      }
    }
  },
  build: {
    env: {
      NODE_ENV: '"production"',
      frontendMonitorAppId: JSON.stringify(options.frontendMonitorAppId),
      frontendMonitorVersion: JSON.stringify(frontendMonitorVersion)
    },
    index: path.resolve(__dirname, '../dist/index.html'),
    assetsRoot: path.resolve(__dirname, '../dist/fiora'),
    assetsPublicPath: getFirstNotUndefined(options.publicPath, env.PublicPath, '/'),
    productionSourceMap: false,
    productionGzip: false,
    productionGzipExtensions: ['js', 'css'],
    bundleAnalyzerReport: process.env.npm_config_report
  },
  dev: {
    env: {
      NODE_ENV: '"development"'
    },
    host: 'localhost',
    port: 8080,
    autoOpenBrowser: false,
    assetsPublicPath: '/',
    proxyTable: {},
    cssSourceMap: false
  }
}
