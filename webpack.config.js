const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'production',

    entry: './src/index.js',

    output: {
        filename: 'utils.min.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,

        library: {
            name: 'Analytics',
            type: 'window',
            export: 'default',
        },
    },

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true,
                    mangle: true,
                },
            }),
        ],
    },
}