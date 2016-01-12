const archiver = require('archiver')
const archive = archiver.create('zip');
const fs = require('fs');
const path =require('path')
archive.file('lib/testModule.js');
archive.file('testFile.js');
archive.finalize();

archive.pipe(fs.createWriteStream(path.join(__dirname, 'arch.zip')))

fs.mkdirSync('kkk');

