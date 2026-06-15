const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    mode: 'production',

    entry: './src/index.js',



    output: {
        filename: 'analytics.min.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,

        library: {
            name: 'Analytics',   // Имя переменной, которая появится в window (window.Analytics)
            type: 'window',      // Куда именно экспортировать
            export: 'default',   // Что экспортировать (экспорт по умолчанию)
        },
    },

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    keep_classnames: true, // Сохраняет имена классов
                    keep_fnames: true,     // Сохраняет имена функций и методов
                    mangle: true,          // Все остальное (локальные переменные) сжимаем
                },
            }),
        ],
    },
}