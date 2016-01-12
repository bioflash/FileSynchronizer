const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports={
    entry:[
        './client/index.js'        
    ],

    output:{
        path: path.join(__dirname, 'client'),
        filename: '[name].bundle.js'
    },

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

    plugins:[
        new HtmlWebpackPlugin({
            filename:'index.html',
            template: path.join(__dirname, 'client', 'index.template.html'),
            inject:'body'
        })
    ]
}