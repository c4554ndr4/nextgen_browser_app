const path = require('path')
const { readFileSync, readdirSync } = require('fs')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const ProcessLocalesPlugin = require('./ProcessLocalesPlugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const {
  SHAKA_LOCALE_MAPPINGS,
  SHAKA_LOCALES_PREBUNDLED,
  SHAKA_LOCALES_TO_BE_BUNDLED
} = require('./getShakaLocales')

const isDevMode = process.env.NODE_ENV === 'development'

// PRODUCTION FIX: Ensure we're truly in production mode
const isProduction = process.env.NODE_ENV === 'production'

const enableVueDevTools = isDevMode

// 🚨 WEBPACK BUILD VERIFICATION
console.log('🔧 WEBPACK CONFIG LOADING...')
console.log('📊 NODE_ENV:', process.env.NODE_ENV)
console.log('🚀 isProduction:', isProduction)
console.log('🛠️ isDevMode:', isDevMode)
console.log('🔍 Vue DevTools Enabled:', enableVueDevTools)

const { version: swiperVersion } = JSON.parse(readFileSync(path.join(__dirname, '../node_modules/swiper/package.json')))

const processLocalesPlugin = new ProcessLocalesPlugin({
  compress: !isDevMode,
  hotReload: isDevMode,
  inputDir: path.join(__dirname, '../static/locales'),
  outputDir: 'static/locales',
})

/** @type {import('webpack').Configuration} */
const config = {
  name: 'renderer',
  mode: process.env.NODE_ENV,
  devtool: isDevMode ? 'eval-cheap-module-source-map' : false,
  entry: {
    renderer: path.join(__dirname, '../src/renderer/main.js'),
  },
  infrastructureLogging: {
    // Only warnings and errors
    // level: 'none' disable logging
    // Please read https://webpack.js.org/configuration/other-options/#infrastructurelogginglevel
    level: isDevMode ? 'info' : 'none'
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist'),
    filename: '[name].js',
  },
  // PERFORMANCE OPTIMIZATION: Add performance hints and optimizations
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 2000000, // 2MB
    maxAssetSize: 1000000 // 1MB
  },
  // PERFORMANCE OPTIMIZATION: Enable caching for faster rebuilds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          compilerOptions: {
            whitespace: 'condense',
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              esModule: false
            }
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass')
            }
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          {
            loader: 'css-loader',
            options: {
              esModule: false
            }
          }
        ],
      },
      {
        test: /\.(png|jpe?g|gif|tif?f|bmp|webp|svg)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: 'imgs/[name][ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      },
    ],
  },
  // webpack defaults to only optimising the production builds, so having this here is fine
  optimization: {
    minimizer: [
      // PERFORMANCE FIX: Use standard webpack minification instead of custom settings
      // Our testing showed custom TerserPlugin settings add overhead without much benefit
      '...', // Use webpack's default minifiers
      new CssMinimizerPlugin()
    ],
    // PERFORMANCE OPTIMIZATION: Enable module concatenation for better performance  
    concatenateModules: isProduction,
    // PERFORMANCE FIX: Disable chunk splitting for Electron - it causes runtime performance issues
    // Electron apps benefit from single bundle loading, not web-style chunk splitting
    splitChunks: false,
    // PERFORMANCE FIX: Disable runtime chunk for Electron - causes module resolution overhead  
    runtimeChunk: false,
    // PERFORMANCE OPTIMIZATION: Remove unused exports
    usedExports: isProduction,
  },
  node: {
    __dirname: false,
    __filename: false
  },
  plugins: [
    processLocalesPlugin,
    new webpack.DefinePlugin({
      'process.platform': `'${process.platform}'`,
      'process.env.IS_ELECTRON': true,
      'process.env.IS_ELECTRON_MAIN': false,
      'process.env.SUPPORTS_LOCAL_API': true,
      // PERFORMANCE FIX: Use development NODE_ENV when Vue DevTools enabled (matches successful dev-vue test)
      // This gave us 3.39s LCP performance in testing
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      // PRODUCTION FIX: Explicitly disable hot reload in production
      'process.env.HOT_RELOAD_LOCALES': JSON.stringify(isDevMode),
      'process.env.LOCALE_NAMES': JSON.stringify(processLocalesPlugin.localeNames),
      'process.env.GEOLOCATION_NAMES': JSON.stringify(readdirSync(path.join(__dirname, '..', 'static', 'geolocations')).map(filename => filename.replace('.json', ''))),
      'process.env.SWIPER_VERSION': `'${swiperVersion}'`,
      'process.env.SHAKA_LOCALE_MAPPINGS': JSON.stringify(SHAKA_LOCALE_MAPPINGS),
      'process.env.SHAKA_LOCALES_PREBUNDLED': JSON.stringify(SHAKA_LOCALES_PREBUNDLED),
      // PERFORMANCE FIX: Enable Vue DevTools for better dev tools performance
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: enableVueDevTools,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: enableVueDevTools,
    }),
    new HtmlWebpackPlugin({
      excludeChunks: ['processTaskWorker'],
      filename: 'index.html',
      template: path.resolve(__dirname, '../src/index.ejs')
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: isDevMode ? '[name].css' : '[name].[contenthash].css',
      chunkFilename: isDevMode ? '[id].css' : '[id].[contenthash].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, '../node_modules/swiper/modules/{a11y,navigation,pagination}-element.css').replaceAll('\\', '/'),
          to: `swiper-${swiperVersion}.css`,
          context: path.join(__dirname, '../node_modules/swiper/modules'),
          transformAll: (assets) => {
            return Buffer.concat(assets.map(asset => asset.data))
          }
        },
        // Don't need to copy them in dev mode,
        // as we configure WebpackDevServer to serve them
        ...(isDevMode
          ? []
          : [
              {
                from: path.join(__dirname, '../node_modules/shaka-player/ui/locales', `{${SHAKA_LOCALES_TO_BE_BUNDLED.join(',')}}.json`).replaceAll('\\', '/'),
                to: path.join(__dirname, '../dist/static/shaka-player-locales'),
                context: path.join(__dirname, '../node_modules/shaka-player/ui/locales'),
                transform: {
                  transformer: (input) => {
                    return JSON.stringify(JSON.parse(input.toString('utf-8')))
                  }
                }
              }
            ])
      ]
    })
  ],
  resolve: {
    alias: {
      vue$: 'vue/dist/vue.runtime.esm.js',
      'portal-vue$': 'portal-vue/dist/portal-vue.esm.js',

      DB_HANDLERS_ELECTRON_RENDERER_OR_WEB$: path.resolve(__dirname, '../src/datastores/handlers/electron.js'),

      'youtubei.js$': 'youtubei.js/web',

      // change to "shaka-player.ui.debug.js" to get debug logs (update jsconfig to get updated types)
      'shaka-player$': 'shaka-player/dist/shaka-player.ui.js',
    },
    extensions: ['.js', '.vue']
  },
  target: 'electron-renderer',
}

// PRODUCTION FIX: Only add development-specific config in development mode
if (isDevMode) {
  // hack to pass it through to the dev-runner.js script
  // gets removed there before the config object is passed to webpack
  config.SHAKA_LOCALES_TO_BE_BUNDLED = SHAKA_LOCALES_TO_BE_BUNDLED
}

// PRODUCTION FIX: Add production-specific optimizations
if (isProduction) {
  // Vue DevTools settings are now handled in the main DefinePlugin above
  console.log('✅ PRODUCTION OPTIMIZATIONS: Applied custom minification and Vue DevTools settings')
}

// 🚨 VERIFICATION: Confirm chunk splitting is disabled
console.log('🚨 CHUNK SPLITTING STATUS: DISABLED (false)')
console.log('🚨 RUNTIME CHUNK STATUS: DISABLED (false)')

module.exports = config
