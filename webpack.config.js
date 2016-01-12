module.exports = (function(){
    if (process.argv[1].match(/webpack-dev-server\.js$/)){
        return require('./webpack.config.dev')
    }//Build mode
     else{
        return require('./webpack.config.build')
    }
}())