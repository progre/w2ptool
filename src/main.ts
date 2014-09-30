/// <reference path="../typings/tsd.d.ts"/>
import http = require('http');
var Tray = require('tray');
var Menu = require('menu');
var app = require('app');

class ToolTip {
    connection = '';
    private nowSpeed = 0;
    private prevSpeed = 0;

    putSpeed(mbps: number) {
        this.prevSpeed = this.nowSpeed;
        this.nowSpeed = mbps;
    }

    toString() {
        return [
            'Connection: ' + this.connection,
            'Now speed: ' + this.nowSpeed.toFixed(3) + ' Mbps',
            'Prev speed: ' + this.prevSpeed.toFixed(3) + ' Mbps'
        ].join('\n');
    }
}

function main() {
    var tray = new Tray(__dirname + '/img/!.png');
    tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Quit', click: () => { app.quit(); } },
    ]));
    var toolTip = new ToolTip();

    startInterval(() => {
        getStatus()
            .then((statuses: number[]) => {
                switch (statuses[2]) {
                    case 0:
                        toolTip.connection = 'none';
                        tray.setToolTip(toolTip.toString());
                        tray.setImage(__dirname + '/img/!.png');
                        break;
                    case 1:
                        toolTip.connection = 'WiMAX2+';
                        tray.setToolTip(toolTip.toString());
                        tray.setImage(__dirname + '/img/2.png');
                        break;
                    case 2:
                        toolTip.connection = 'WiMAX1';
                        tray.setToolTip(toolTip.toString());
                        tray.setImage(__dirname + '/img/1.png');
                        break;
                }
            })
            .catch(() => {
                toolTip.connection = '?';
                tray.setToolTip(toolTip.toString());
                tray.setImage(__dirname + '/img/!.png');
            });
    }, 60 * 1000);

    startInterval(() => {
        speedTest()
            .then(mbps => {
                toolTip.putSpeed(mbps);
                tray.setToolTip(toolTip.toString());
            })
            .catch(() => {
                toolTip.putSpeed(0);
                tray.setToolTip(toolTip.toString());
            });
    }, 60 * 60 * 1000);
}

function getStatus() {
    return new Promise((resolve, reject) => {
        var url = 'http://192.168.179.1/index.cgi/status_get.xml';
        var req = http.get(url, (res: http.ClientResponse) => {
            var buffer = '';
            res.on('data', (chunk: string) => {
                buffer += chunk;
            });
            res.on('end', () => {
                var match = new RegExp('<status>((?:.|\n)*)</status>').exec(buffer);
                if (match.length > 2) {
                    reject(null);
                    return;
                }
                resolve(match[1].split(/\n?_/).map(x => parseInt(x, 10)));
            });
        });
        req.setTimeout(1000);
        req.on('error', (err: any) => reject(err));
    });
}

function speedTest() {
    var data = 'http://192.168.179.1/common/menu.js';
    var byte = 29943;
    var count = 50;

    var begin = Date.now();
    return forEach(count, () => new Promise((resolve, reject) => {
        var req = http.get(data, (res: http.ClientResponse) => {
            res.on('data', () => { });
            res.on('end', resolve);
        });
        req.setTimeout(1000);
        req.on('error', (err: any) => reject(err));
    }))
        .then(() => {
            var ms = Date.now() - begin;
            return (byte * count * 8) / (ms / 1000) / 1000 / 1000;
        });
}

function forEach(times: number, asyncFunc: () => Promise<{}>) {
    var promise = asyncFunc();
    for (var i = 1; i < times; i++) {
        promise = promise.then(asyncFunc);
    }
    return promise;
}

function startInterval(func: Function, timeout?: any, ...args: any[]) {
    func();
    setInterval(func, timeout, args);
}

main();
