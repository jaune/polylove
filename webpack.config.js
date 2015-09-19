module.exports = {
    entry: {
        'polylove.global': './polylove.global.js'
    },
    devtool: 'source-map',
    output: {
        path: './dist',
        filename: '[name].js'
    },
    module: {
        loaders: [
        ]
    },
    externals: {
        'lovefield': 'lf'
    },
    resolve: {
        extensions: ['', '.js']
    }
}

