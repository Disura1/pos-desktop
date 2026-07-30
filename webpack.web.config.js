const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
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
    new webpack.DefinePlugin({
      // Web build always calls relative /api (same origin as backend)
      'process.env.API_URL': JSON.stringify('/api'),
      'process.env.IS_WEB': JSON.stringify('true'),
    }),
  ],
};
