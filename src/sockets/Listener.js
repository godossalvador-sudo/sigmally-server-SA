const http = require("http");
const { WebSocket, WebSocketServer } = require("ws");

const Connection = require("./Connection");
const ChatChannel = require("./ChatChannel");
const Misc = require("../primitives/Misc");
const { filterIPAddress } = Misc;

class Listener {
    /**
     * @param {ServerHandle} handle
     */
    constructor(handle) {
        /** @type {WebSocketServer} */
        this.listenerSocket = null;
        this.handle = handle;
        this.globalChat = new ChatChannel(this);

        /** @type {Router[]} */
        this.routers = [];
        /** @type {Connection[]} */
        this.connections = [];
        /** @type {Counter<IPAddress>} */
        this.connectionsByIP = { };
    }

    get settings() { return this.handle.settings; }
    get logger() { return this.handle.logger; }

    open() {
        if (this.listenerSocket !== null) return false;
        this.logger.debug(`listener opening at ${this.settings.listeningPort}`);
        this.httpServer = http.createServer(this.onHttpRequest.bind(this));
        this.listenerSocket = new WebSocketServer({
            server: this.httpServer,
            verifyClient: this.verifyClient.bind(this)
        });
        this.listenerSocket.on("connection", this.onConnection.bind(this));
        this.httpServer.listen(this.settings.listeningPort, this.onOpen.bind(this));
        return true;
    }
    close() {
        if (this.listenerSocket === null) return false;
        this.logger.debug("listener closing");
        this.listenerSocket.close();
        this.httpServer.close();
        this.listenerSocket = null;
        this.httpServer = null;
        return true;
    }

    /**
     * HTTP endpoints the Sigmally web client calls before it lets you press Play
     * @param {import("http").IncomingMessage} req
     * @param {import("http").ServerResponse} res
     */
    onHttpRequest(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
        if (req.method === "OPTIONS") return void res.writeHead(204).end();
        const url = (req.url || "").split("?")[0];
        const json = (body) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(body));
        };
        if (url.endsWith("/serversstats")) {
            return void json({
                status: "success",
                body: {
                    loginRequired: false,
                    serverstats: {
                        name: this.settings.serverName,
                        mode: this.handle.gamemode ? this.handle.gamemode.name : "FFA",
                        players_current: this.connections.length,
                        players_max: this.settings.listenerMaxConnections
                    }
                }
            });
        }
        if (url.endsWith("/recaptcha/v3")) {
            if (req.method === "POST") return void json({ status: "complete" });
            return void json({ version: "none" });
        }
        res.writeHead(426, { "Content-Type": "text/plain" });
        res.end("Upgrade Required");
    }

    /**
     * @param {{req: any, origin: string}} info
     * @param {*} response
     */
    verifyClient(info, response) {
        const forwardedIp = Misc.getForwardedIP(info.req);
        const address = filterIPAddress(forwardedIp || info.req.socket.remoteAddress);
        this.logger.onAccess(`REQUEST FROM ${address}, ${info.secure ? "" : "not "}secure, Origin: ${info.origin}`);
        if (this.connections.length > this.settings.listenerMaxConnections) {
            this.logger.debug("listenerMaxConnections reached, dropping new connections");
            return void response(false, 503, "Service Unavailable");
        }
        const acceptedOrigins = this.settings.listenerAcceptedOrigins;
        if (acceptedOrigins.length > 0 && acceptedOrigins.indexOf(info.origin) === -1) {
            this.logger.debug(`listenerAcceptedOrigins doesn't contain ${info.origin}`);
            return void response(false, 403, "Forbidden");
        }
        if (this.settings.listenerForbiddenIPs.indexOf(address) !== -1) {
            this.logger.debug(`listenerForbiddenIPs contains ${address}, dropping connection`);
            return void response(false, 403, "Forbidden");
        }
        if (this.settings.listenerMaxConnectionsPerIP > 0) {
            const count = this.connectionsByIP[address];
            if (count && count >= this.settings.listenerMaxConnectionsPerIP) {
                this.logger.debug(`listenerMaxConnectionsPerIP reached for '${address}', dropping its new connections`);
                return void response(false, 403, "Forbidden");
            }
        }
        this.logger.debug("client verification passed");
        response(true);
    }
    onOpen() {
        this.logger.inform(`listener open at ${this.settings.listeningPort}`);
    }

    /**
     * @param {Router} router
     */
    addRouter(router) {
        this.routers.push(router);
    }
    /**
     * @param {Router} router
     */
    removeRouter(router) {
        this.routers.splice(this.routers.indexOf(router), 1);
    }

    /**
     * @param {WebSocket} webSocket
     * @param {import("http").IncomingMessage} request
     */
    onConnection(webSocket, request) {
        const newConnection = new Connection(this, webSocket, request);
        this.logger.onAccess(`CONNECTION FROM ${newConnection.remoteAddress}`);
        this.connectionsByIP[newConnection.remoteAddress] =
            this.connectionsByIP[newConnection.remoteAddress] + 1 || 1;
        this.connections.push(newConnection);
    }

    /**
     * @param {Connection} connection
     * @param {number} code
     * @param {string} reason
     */
    onDisconnection(connection, code, reason) {
        this.logger.onAccess(`DISCONNECTION FROM ${connection.remoteAddress} (${code} '${reason}')`);
        if (--this.connectionsByIP[connection.remoteAddress] <= 0)
            delete this.connectionsByIP[connection.remoteAddress];
        this.globalChat.remove(connection);
        this.connections.splice(this.connections.indexOf(connection), 1);
    }

    update() {
        let i, l;
        for (i = 0, l = this.routers.length; i < l; i++) {
            const router = this.routers[i];
            if (!router.shouldClose) continue;
            router.close(); i--; l--;
        }
        for (i = 0; i < l; i++) this.routers[i].update();
        for (i = 0, l = this.connections.length; i < l; i++) {
            const connection = this.connections[i];
            if (this.settings.listenerForbiddenIPs.indexOf(connection.remoteAddress) !== -1)
                connection.closeSocket(1003, "Remote address is forbidden");
            else if (Date.now() - connection.lastActivityTime >= this.settings.listenerMaxClientDormancy)
                connection.closeSocket(1003, "Maximum dormancy time exceeded");
        }
    }
}

module.exports = Listener;

const Router = require("./Router");
const ServerHandle = require("../ServerHandle");
