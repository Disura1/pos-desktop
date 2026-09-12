const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/renderer.js',
  target: 'web',
  output: {
    path: path.resolve(__dirname, '../pos-backend/public'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader' },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|ico|svg|webp)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/web.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/assets/logo.jpg', to: 'favicon.jpg' },
        { from: './src/manifest.json',   to: 'manifest.json' },
        { from: './src/service-worker.js', to: 'service-worker.js' },
        { from: './src/icon-192.png',    to: 'icon-192.png' },
        { from: './src/icon-512.png',    to: 'icon-512.png' },
      ],
    }),
    new webpack.DefinePlugin({
      // Web build always calls relative /api (same origin as backend)
      'process.env.API_URL': JSON.stringify('/api'),
      'process.env.IS_WEB': JSON.stringify('true'),
    }),
  ],
};
