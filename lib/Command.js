const fs = require('fs');
const log4js = require('log4js');
const log = log4js.getLogger();

module.exports = {
    copy,mkdir
}

function copy(commandStr, archive){
    this.commandStr = commandStr;
    let filePaths = this.commandStr.match(/\s*copy\s+\"([^\"]+)\"\s+\"([^\"]+)\"/);
    this.executed = false;
    this.fromPath = filePaths[1];
    this.toPath = filePaths[2];

}

copy.prototype.exec = function(){
    return new Promise((resolve, reject)=>{
        fs.readFile(this.fromPath, (err, data)=>{
             fs.writeFile(this.toPath,data,(err, data)=>{
                 if (err) {
                    log.error('unable to execute command', this.commandStr);
                     reject(err);
                 }
                 resolve();
                 this.executed=true;
             })
        })
    })
}

copy.prototype.backup = function(archive){
    try{
        fs.statSync(this.toPath);
        archive.file(this.toPath,{name:this.toPath.substring(archive.rootDir.length+1)});
    }catch(e){

    }
    
}
/*copy.prototype.undo = function(){
    if (this.executed){
        try{
            fs.writeFileSync(this.fromPath, fs.readFileSync(this.toPath));
            log.info('Undo command: ', this.commandStr, 'success');
        }catch(e){
            throw new Error('Unable to undo command:'+this.commandStr);
        }
    } 
}*/

function mkdir(commandStr){
    this.commandStr = commandStr;
    this.dirName = this.commandStr.match(/\s*mkdir\s+\"([^\"]+)\"/)[1];
    this.executed = false;
}

mkdir.prototype.exec = function(){
    try {
         fs.statSync(this.dirName);
     }catch(e){
         fs.mkdirSync(this.dirName);    
         this.executed = true; 
     }
    return new Promise((resolve, reject)=>resolve());
}
mkdir.prototype.backup = function(archives){
    //do nothing...
}
/*mkdir.prototype.undo = function(){
    if (this.executed){
        try{
            fs.rmdirSync(this.dirName);    
            log.info('Undo command: ', this.commandStr, 'success');
        }catch(e){
            throw new Error('Unable to undo command:'+this.commandStr);
        }
    }
}*/