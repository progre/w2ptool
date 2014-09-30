/// <reference path="./typings/tsd.d.ts"/>
interface IGulpPlugin {
    (...args: any[]): NodeJS.ReadWriteStream;
}
global.Promise = global.Promise || require('es6-promise').Promise;
import childProcess = require('child_process');
var runSequence = require('run-sequence');
import gulp = require('gulp');
var tsd: IGulpPlugin = require('gulp-tsd');
var typescript: IGulpPlugin = require('gulp-tsc');
var rimraf: IGulpPlugin = require('gulp-rimraf');
var downloadAtomShell: IGulpPlugin = require('gulp-download-atom-shell');

gulp.task('default', ['watch', 'full-build']);

gulp.task('full-build', (callback?) => {
    runSequence(
        ['clean'],
        ['typescript', 'copy', 'download'],
        callback);
});

gulp.task('typescript', (callback?) => {
    runSequence('tsd', 'ts');
});

gulp.task('clean', () =>
    gulp.src(['dist/resources/app/'], { read: false })
        .pipe(rimraf()));

gulp.task('tsd', (callback?) =>
    tsd({ command: 'reinstall', config: './tsd.json' }, callback));

gulp.task('ts', () =>
    gulp.src('src/**/*.ts')
        .pipe(typescript({ noImplicitAny: true, sourcemap: true }))
        .pipe(gulp.dest('dist/resources/app/')));

gulp.task('copy', () =>
    gulp.src(['!*.ts', 'package.json', 'src/**'])
        .pipe(gulp.dest('dist/resources/app/')));

gulp.task('download', (callback?) => {
    downloadAtomShell({
        version: '0.16.3',
        outputDir: 'dist'
    }, callback);
});

gulp.task('watch', () => {
    gulp.watch('src/**/*.ts', ['ts']);
});

function sequence(...callbacks: Array<(resolve, reject) => void>) {
    return callbacks.reduce(
        (promise: Promise<any>, callback: (resolve, reject) => void) =>
            promise.then(() => new Promise(callback)),
        Promise.resolve());
}