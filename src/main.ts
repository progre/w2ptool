/// <reference path="../typings/tsd.d.ts"/>
import http = require('http');
import child_process = require('child_process');
var Tray = require('tray');
var Menu = require('menu');
var app = require('app');
var dialog = require('dialog');
var secret = require('./secret.json');

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
        { label: 'Wi-Fi WALKER...', click: openWiFiWalker },
        { label: 'Reconnect', click: reconnect },
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

function openWiFiWalker() {
    child_process.exec('start http://192.168.179.1/', {}, () => { });
}

function reconnect() {
    var data = 'SELECT_PROFILE=1&COM_MODE_SEL=1&BTN_CLICK=profile&DISABLED_CHECKBOX=&CHECK_ACTION_MODE=1&SESSION_ID=5E72DBF8B14C1F326CE9FEBB983D75D8';
    var options = {
        method: 'POST',
        host: '192.168.179.1',
        auth: secret.username + ':' + secret.password,
        path: '/index.cgi/index_contents_local_set',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length
        }
    };

    var req: http.ClientRequest = http.request(options, (res: http.ClientResponse) => {
        dialog.showMessageBox({ message: 'Status code: ' + res.statusCode, buttons: ['OK'] });
    });
    req.write(data);
    req.end();
}

main();
