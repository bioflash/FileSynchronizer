const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    devtool: 'source-map',
    entry:[
        './client/index.js'
    ],
    output:{
        filename: '[name].[hash].bundle.js',
        publicPath: 'http://localhost:8080/'
    },

    plugins:[
        new HtmlWebpackPlugin({
            filename:'index.html',
            template: path.join(__dirname, 'client', 'index.template.html'),
            inject:'body'
        })
    ],

    module:{
        loaders:[{
            test:'/\.js$/',
            loaders:['babel'],
            exclude:'/node_modules/',
            include:__dirname
        },{
            test:'\.css$',
            loaders:['style', 'raw'],
            include:__dirname,
        },{
            test:'/\.(png|gif|jpg|jpeg)$/',
            loaders:['file']
        }]
    },

    devServer:{
        contentBase: path.join(__dirname, '/client'), /* This allow webpack-dev-server to set static source using express.static middleware */
        inline: true, /* same effect as invoking webpack-dev-server --inline*/
        proxy:{
            '/api*':{
                target:'http://localhost:3000'
            }
        }
    }
}