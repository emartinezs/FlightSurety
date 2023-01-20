const path = require('path')
const nodeExternals = require('webpack-node-externals')
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = {
    entry: "./src/server/index",
    watch: true,
    externalsPresets: {
        node: true
    },
    externals: [
        nodeExternals()
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                use: "babel-loader",
                exclude: /node_modules/
            },
        ]
      },
    plugins: [
        new RunScriptWebpackPlugin({
            name: 'server.js',
          }),
    ],
    output: {
        path: path.join(__dirname, 'prod/server'),
        filename: 'server.js'
    },
}