'use strict'
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const log = log4js.getLogger();
const archiver = require('archiver');
const md5 = require('md5');
const Command = require('./Command');


let compare = {
    bySize: function(fromStat, toStat){
        return (fromStat.size===toStat.size);
    },
    byMd5:function(fromStat, toStat){
        let fromMd5 = md5(fs.readFileSync(fromStat.path));
        let toMd5 = md5(fs.readFileSync(toStat.path));

        return fromMd5===toMd5;
    }
}


module.exports = {
    findDifference,
    applyChange,
    compare
}

function applyChange(operations, fromRootDir, toRootDir){
    let fromArchive = archiver.create('zip');
    fromArchive.rootDir = fromRootDir;
    let toArchive = archiver.create('zip');
    toArchive.rootDir = toRootDir;

    let promises = operations.map((oper)=>{
       if(oper.command.startsWith('mkdir')){
            let command = new Command.mkdir(oper.command);
            //command.backup({fromArchive:fromArchive, toArchive:toArchive});
            return command.exec();
       }else if(oper.command.startsWith('copy')){
            let command = new Command.copy(oper.command);
            if (oper.direction==='>>'){
                command.backup(toArchive);
            }else if(oper.direction==='<<'){
                command.backup(fromArchive);
            }
            return command.exec();
       }   
    });
    return {promises, fromArchive, toArchive};
}


function findDifference(fromDir, toDir, compareFunction){
    fs.accessSync(fromDir);
    fs.accessSync(toDir);

    var statsFrom = _fileStatesUnderDir(fromDir);
    var statsTo = _fileStatesUnderDir(toDir);

    var statsAll = {};
    Object.keys(statsFrom).forEach((file)=>statsAll[file]=1);
    Object.keys(statsTo).forEach((file)=>statsAll[file]=1);

    return Object.keys(statsAll).sort((a,b)=>{return (a.length<b.length)?-1:(a.length==b.length)?0:1}).map((file)=>{
        var commands = {
            COPY_SOURCE_TO_TARGET: `copy "${path.join(fromDir, file)}" "${path.join(toDir, file)}"`,
            COPY_TARGET_TO_SOURCE: `copy "${path.join(toDir, file)}" "${path.join(fromDir, file)}"`,
            MKDIR_SOURCE: `mkdir "${path.join(fromDir, file)}"`,
            MKDIR_TARGET: `mkdir "${path.join(toDir, file)}"`,
            COPY_NONE:`echo "No need to copy"`
        }

        if (!statsFrom[file]){
            if (statsTo[file].type==='DIR'){
                return {
                    direction:'<<',
                    command: commands.MKDIR_SOURCE,
                    sourceName:null,
                    sourceTime:null,
                    sourceSize:0,
                    targetName:path.join(toDir,file),
                    targetTime:statsTo[file].mtime,                
                    targetSize:statsTo[file].size,
                    file:file,
                    type:'DIR'
                }
            }else{
                return {
                    direction:'<<',
                    command: commands.COPY_TARGET_TO_SOURCE,
                    sourceName:null,
                    sourceTime:null,
                    sourceSize:0,
                    targetName: path.join(toDir, file),
                    targetTime:statsTo[file].mtime,                           
                    targetSize:statsTo[file].size,
                    file:file,
                    type:'FILE'
                }    
            }
            
        }else if(!statsTo[file]){
            if (statsFrom[file].type==='DIR'){
                return{
                    direction:">>",
                    command:commands.MKDIR_TARGET,
                    sourceName: path.join(fromDir, file),
                    sourceTime:statsFrom[file].mtime,                    
                    sourceSize:statsFrom[file].size,
                    targetName: null,
                    targetTime:null,
                    targetSize:0,
                    file:file,
                    type:'DIR'
                }
            }else{
                return{
                    direction:">>",
                    command:commands.COPY_SOURCE_TO_TARGET,
                    sourceName:path.join(fromDir, file),
                    sourceTime:statsFrom[file].mtime,                    
                    sourceSize:statsFrom[file].size,
                    targetName: null,
                    targetSize:0,
                    targetTime:null,
                    file:file,
                    type:'FILE'
                }    
            }            
        }else{
            var result = {
                sourceName:path.join(fromDir, file),
                sourceTime:statsFrom[file].mtime,
                sourceSize:statsFrom[file].size,
                targetName:path.join(toDir, file),
                targetTime:statsTo[file].mtime,
                targetSize:statsTo[file].size, 
                file:file,
                type:'FILE'
            }
            if (statsFrom[file].type===statsTo[file].type&&statsFrom[file].type==='DIR'){
                return Object.assign(result,{direction:'==', command:commands.COPY_NONE, type:'DIR'});//Overwrite type to DIR
            }else{
               if (typeof compareFunction==='function'){
                    if (!compareFunction(statsFrom[file], statsTo[file])){
                        if (statsFrom[file].mtime>statsTo[file].mtime){
                            return Object.assign(result,{direction:">>", command: commands.COPY_SOURCE_TO_TARGET});
                        }else if(statsFrom[file].mtime<statsTo[file].mtime){
                            return Object.assign(result,{direction:"<<", command: commands.COPY_TARGET_TO_SOURCE});
                        }
                    }else{
                        return Object.assign(result,{direction:"==", command:commands.COPY_NONE});
                    }
                }else{
                    if(!compare.bySize(statsFrom[file], statsTo[file])){
                        if (statsFrom[file].mtime>statsTo[file].mtime){
                            return Object.assign(result,{direction:">>", command: commands.COPY_SOURCE_TO_TARGET});
                        }else if(statsFrom[file].mtime<statsTo[file].mtime){
                            return Object.assign(result,{direction:"<<", command: commands.COPY_TARGET_TO_SOURCE});
                        }
                    }else{
                        return Object.assign(result,{direction:"==", command:commands.COPY_NONE});
                    }
                }
            }        
        }
    });
}


function _fileStatesUnderDir(dir){
    fs.accessSync(dir);

    var pathObj = {};
    f(dir,dir,pathObj);
    return pathObj;

    function f(pathStr,rootDir, obj){
        //var fullPath = path.join(pth.dir, pth.base);
        if (pathStr.indexOf(rootDir)<0) throw new Error('pathStr:['+pathStr+'] does not contain rootDir:['+rootDir+']');
        var relativePath = pathStr.substring(rootDir.length+1);

        var stat = fs.statSync(pathStr);
        
        var pathObj = Object.assign(stat, {type:(stat.isFile())?'FILE':(stat.isDirectory())?'DIR':'UNKNOWN', path:pathStr})

        switch(pathObj.type){
            case 'FILE':
                //do nothing
                break;
            case 'DIR':
                var files = fs.readdirSync(pathStr);

                for (var i=0; i<files.length; i++){
                    f(path.join(pathStr, files[i]),rootDir,obj);
                }            
                break;
            default:
                throw new Error('The type of the file is unknown');
        }

        if (relativePath.length>0){
            obj[relativePath]=pathObj
        }
    }
}