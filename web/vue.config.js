const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const isLibrary = process.env.NODE_ENV === 'library'

const WebpackDynamicPublicPathPlugin = require('webpack-dynamic-public-path')

module.exports = {
  publicPath: isDev ? '' : './dist',
  outputDir: '../dist',
  lintOnSave: false,
  productionSourceMap: false,
  filenameHashing: false,
  transpileDependencies: ['yjs', 'lib0', 'quill'],
  chainWebpack: config => {
    // 移除 preload 插件
    config.plugins.delete('preload')
    // 移除 prefetch 插件
    config.plugins.delete('prefetch')
    // 支持运行时设置public path
    if (!isDev) {
      config
        .plugin('dynamicPublicPathPlugin')
        .use(WebpackDynamicPublicPathPlugin, [
          { externalPublicPath: 'window.externalPublicPath' }
        ])
    }
    // 给插入html页面内的js和css添加hash参数
    if (!isLibrary) {
      config.plugin('html').tap(args => {
        args[0].hash = true
        return args
      })
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/')
      }
    }
  },
  devServer: {
    hot: true,
    liveReload: true,
    disableHostCheck: true,
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: false
    },
    proxy: {
      '^/api/v3/': {
        target: 'http://ark.cn-beijing.volces.com',
        changeOrigin: true
      },
      // 通用 AI API 代理 - 通过请求头 X-Target-URL 指定目标地址
      '^/proxy/ai': {
        target: 'http://placeholder.com',
        changeOrigin: true,
        router: function (req) {
          // 从请求头获取真正的目标地址
          const targetUrl = req.headers['x-target-url']
          if (targetUrl) {
            try {
              const url = new URL(targetUrl)
              return url.origin
            } catch (e) {
              console.error('Invalid X-Target-URL:', targetUrl)
            }
          }
          return 'http://placeholder.com'
        },
        pathRewrite: function (path, req) {
          // 从请求头获取目标路径
          const targetUrl = req.headers['x-target-url']
          if (targetUrl) {
            try {
              const url = new URL(targetUrl)
              return url.pathname + url.search
            } catch (e) {
              console.error('Invalid X-Target-URL:', targetUrl)
            }
          }
          return path.replace(/^\/proxy\/ai/, '')
        }
      }
    }
  }
}
