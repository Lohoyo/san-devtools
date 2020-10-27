import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Root from '../root/root.js';
import {TargetManager} from './SDKModel.js';
// 源码来自于chrome devtools，所以直接关闭eslint
/* eslint-disable */

export class MainConnection {
    constructor() {
        (this._onMessage = null),
        (this._onDisconnect = null),
        (this._messageBuffer = ''),
        (this._messageSize = 0),
        (this._eventListeners = [
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
                Host.InspectorFrontendHostAPI.Events.DispatchMessage,
                this._dispatchMessage,
                this
            ),
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
                Host.InspectorFrontendHostAPI.Events.DispatchMessageChunk,
                this._dispatchMessageChunk,
                this
            )
        ]);
    }
    setOnMessage(s) {
        this._onMessage = s;
    }
    setOnDisconnect(s) {
        this._onDisconnect = s;
    }
    sendRawMessage(s) {
        this._onMessage && Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(s);
    }
    _dispatchMessage(s) {
        this._onMessage && this._onMessage.call(null, s.data);
    }
    _dispatchMessageChunk(s) {
        const e = s.data.messageChunk;
        const n = s.data.messageSize;
        n && ((this._messageBuffer = ''), (this._messageSize = n)),
        (this._messageBuffer += e),
        this._messageBuffer.length === this._messageSize
                && this._onMessage
                && (this._onMessage.call(null, this._messageBuffer), (this._messageBuffer = ''), (this._messageSize = 0));
    }
    disconnect() {
        const s = this._onDisconnect;
        return (
            Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners),
            (this._onDisconnect = null),
            (this._onMessage = null),
            s && s.call(null, 'force disconnect'),
            Promise.resolve()
        );
    }
}

export class WebSocketConnection {
    constructor(s, e) {

        (this._socket = new WebSocket(s)),
        (this._socket.onerror = this._onError.bind(this)),
        (this._socket.onopen = this._onOpen.bind(this)),
        (this._socket.onmessage = s => {
            this._onMessage && this._onMessage.call(null, s.data);
        }),
        (this._socket.onclose = this._onClose.bind(this)),
        (this._onMessage = null),
        (this._onDisconnect = null),
        (this._onWebSocketDisconnect = e),
        (this._connected = !1),
        (this._messages = []);
    }
    setOnMessage(s) {
        this._onMessage = s;
    }
    setOnDisconnect(s) {
        this._onDisconnect = s;
    }
    _onError() {
        this._onWebSocketDisconnect && this._onWebSocketDisconnect.call(null),
        this._onDisconnect && this._onDisconnect.call(null, 'connection failed'),
        this._close();
    }
    _onOpen() {
        if (((this._connected = !0), this._socket)) {
            this._socket.onerror = console.error;
            for (const s of this._messages) {
                this._socket.send(s);
            }
        }
        this._messages = [];
    }
    _onClose() {
        this._onWebSocketDisconnect && this._onWebSocketDisconnect.call(null),
        this._onDisconnect && this._onDisconnect.call(null, 'websocket closed'),
        this._close();
    }
    _close(s) {
        // 激活backend ws connection 探针
        let timerId;
        const target = query2json(location.search.slice(1).split('?')[1]).target;
        console.log('backend connection 探针激活!', target);
        function heartbeat() {
            if (timerId) {
                clearTimeout(timerId);
            }
            timerId = setTimeout(function () {
                heartbeat();
                if (document.hidden) {
                    return;
                }
                fetch('/alive/' + target)
                    .then(res => res.text())
                    .then(
                        status => {
                            if (status === '1') {
                                location.reload();
                            }
                        },
                        () => {}
                    );
            }, 2e3);
        }
        target && heartbeat();
        this._socket
            && ((this._socket.onerror = null),
            (this._socket.onopen = null),
            (this._socket.onclose = s || null),
            (this._socket.onmessage = null),
            this._socket.close(),
            (this._socket = null)),
        (this._onWebSocketDisconnect = null);
    }
    sendRawMessage(s) {
        this._connected && this._socket ? this._socket.send(s) : this._messages.push(s);
    }
    disconnect() {
        let s;
        const e = new Promise(e => (s = e));
        return (
            this._close(() => {
                this._onDisconnect && this._onDisconnect.call(null, 'force disconnect'), s();
            }),
            e
        );
    }
}
function query2json(url) {
    const locse = url.split('?');

    const search = locse[1] ? locse[1] : locse[0];
    const pairs = search.split('&');
    const result = {};
    pairs.forEach(pair => {
        pair = pair.split('=');
        if (pair[0].length > 0) {
            let resultPair = '';
            try {
                resultPair = decodeURIComponent(pair[1]) || '';
            }
            catch (e) {
                console.log(e);
            }
            result[pair[0]] = resultPair;
        }
    });
    return result;

}
export class StubConnection {
    constructor() {
        (this._onMessage = null), (this._onDisconnect = null);
    }
    setOnMessage(s) {
        this._onMessage = s;
    }
    setOnDisconnect(s) {
        this._onDisconnect = s;
    }
    sendRawMessage(s) {
        setTimeout(this._respondWithError.bind(this, s), 0);
    }
    _respondWithError(s) {
        const e = JSON.parse(s);
        const n = {
            message: 'This is a stub connection, can\'t dispatch message.',
            code: ProtocolClient.InspectorBackend.DevToolsStubErrorCode,
            data: e
        };
        this._onMessage
            && this._onMessage.call(null, {
                id: e.id,
                error: n
            });
    }
    disconnect() {
        return (
            this._onDisconnect && this._onDisconnect.call(null, 'force disconnect'),
            (this._onDisconnect = null),
            (this._onMessage = null),
            Promise.resolve()
        );
    }
}
export class ParallelConnection {
    constructor(s, e) {
        (this._connection = s), (this._sessionId = e), (this._onMessage = null), (this._onDisconnect = null);
    }
    setOnMessage(s) {
        this._onMessage = s;
    }
    setOnDisconnect(s) {
        this._onDisconnect = s;
    }
    sendRawMessage(s) {
        const e = JSON.parse(s);
        e.sessionId || (e.sessionId = this._sessionId), this._connection.sendRawMessage(JSON.stringify(e));
    }
    disconnect() {
        return (
            this._onDisconnect && this._onDisconnect.call(null, 'force disconnect'),
            (this._onDisconnect = null),
            (this._onMessage = null),
            Promise.resolve()
        );
    }
}
export async function initMainConnection(s, e) {
    return (
        ProtocolClient.InspectorBackend.Connection.setFactory(_createMainConnection.bind(null, e)),
        await s(),
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady(),
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
            Host.InspectorFrontendHostAPI.Events.ReattachMainTarget,
            () => {
                const e = TargetManager.instance().mainTarget();
                if (e) {
                    const s = e.router();
                    s && s.connection().disconnect();
                }
                s();
            }
        ),
        Promise.resolve()
    );
}
export function _createMainConnection(s) {
    const e = Root.Runtime.Runtime.queryParam('ws');
    const n = Root.Runtime.Runtime.queryParam('wss');
    if (e || n) {
        return new WebSocketConnection(e ? 'ws://' + e : 'wss://' + n, s);
    }
    return Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()
        ? new StubConnection()
        : new MainConnection();
}
