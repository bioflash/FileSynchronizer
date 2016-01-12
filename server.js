'use strict'
require('babel-register');
const port = 3000;
const express = require('express');
const bodyParser = require('body-parser');

const path = require('path');
const log4js = require('log4js');
const log = log4js.getLogger();

const syncMgr = require('./lib/SyncFileManager');
const comapreFunction = syncMgr.compare.byMd5;

const app = express();
app.use(express.static(path.join(__dirname, 'client')));
app.use(bodyParser.json({limit:1000000}));
app.get('/api/findDifference', (req, resp)=>{
    resp.json(syncMgr.findDifference(req.query.sourceDir, req.query.targetDir, comapreFunction)/*.filter((item)=> item.direction!=='==')*/);
});

app.post('/api/applyChange', (req,resp)=>{
    let result = syncMgr.applyChange(req.body.operations, req.query.sourceDir, req.query.targetDir);

    Promise.all(result.promises).then(
        ()=>{
            resp.json({message:'operation success'});
        },
        (err)=>{
            log.error('synchronize file error', err);
            log.info('start saving backup archive file');

            result.fromArchive.finalize();
            result.fromArchive.pipe(fs.createWriteStream(path.join(req.query.sourceDir, 'backup.zip')));
            result.toArchive.finalize();
            result.toArchive.pipe(fs.createWriteStream(path.join(req.query.targetDir, 'backup.zip')));

            log.info('backup archive saved');

            resp.json({message:'operation error', fromArchive:path.join(req.query.sourceDir, 'backup.zip'), toArchive:path.join(req.query.targetDir, 'backup.zip') })
        }
    )
});
app.listen(port,()=>log.info('server started at port', port));

/*const syncMgr = require('./lib/SyncFileManager.js');
const compareMethod = syncMgr.compare.byMd5;

const log4js = require('log4js');
const fs = require('fs');


const log = log4js.getLogger();

const fromDir = process.argv[2];
const toDir = process.argv[3];



let result =syncMgr.applyChange(syncMgr.findDifference(fromDir,toDir,compareMethod), fromDir, toDir);

Promise.all(result.promises).then(
    ()=>{
        log.info('update success');
    },
    (err)=>{
        log.error('update err', err);
        log.info('saving backup archive file');

        result.fromArchive.finalize();
        result.fromArchive.pipe(fs.createWriteStream(path.join(fromDir, 'backup.zip')));
        result.toArchive.finalize();
        result.toArchive.pipe(fs.createWriteStream(path.join(toDir, 'backup.zip')));
        
        log.info('backup archive saved');
    }
)*/