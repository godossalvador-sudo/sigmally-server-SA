const Gamemode = require("./Gamemode");
const Misc = require("../primitives/Misc");

function getLeaderboardData(player, requesting, index) {
    return {
        name: player.leaderboardName,
        highlighted: requesting.id === player.id,
        cellId: player.ownedCells[0]?.id ?? 0,
        position: 1 + index,
        sub: player.sub,
    };
}

function getGroupTag(name) {
    if (!name) return null;
    const match = name.trim().match(/^([A-Za-z]+[0-9]*)\s+/);
    return match ? match[1].toUpperCase() : null;
}

const groupColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0xFFFFFF];

class FFA extends Gamemode {
    constructor(handle) {
        super(handle);
    }
    static get type() { return 0; }
    static get name() { return "FFA"; }

    onPlayerSpawnRequest(player) {
        if (player.state === 0 || !player.hasWorld) return;
        const size = player.router.type === "minion" ?
             this.handle.settings.minionSpawnSize :
             this.handle.settings.playerSpawnSize;
        const spawnInfo = player.world.getPlayerSpawn(size, player);
        const color = spawnInfo.color || Misc.randomColor();
        const name = player.router.spawningAttributes.name || player.leaderboardName || '';
        player.cellName = player.chatName = player.leaderboardName = name;
        player.cellSkin = player.router.spawningAttributes.skin || '';
        player.chatColor = player.cellColor = color;
        player.clan = player.router.spawningAttributes.clan || '';
        player.sub = !!player.router.spawningAttributes.sub;
        player.world.spawnPlayer(player, spawnInfo.pos, size);
    }

    compileLeaderboard(world) {
        world.leaderboard = world.players.slice(0).filter((v) => !isNaN(v.score)).sort((a, b) => b.score - a.score);

        const groups = {};
        let totalScore = 0;
        for (let i = 0; i < world.players.length; i++) {
            const p = world.players[i];
            if (isNaN(p.score)) continue;
            const tag = getGroupTag(p.leaderboardName) || "Sin equipo";
            if (!groups[tag]) groups[tag] = 0;
            groups[tag] += p.score;
            totalScore += p.score;
        }
        const groupEntries = Object.keys(groups)
            .map((tag) => ({ tag, score: groups[tag] }))
            .sort((a, b) => b.score - a.score);
        world.groupLeaderboard = groupEntries.map((g, i) => ({
            weight: totalScore > 0 ? g.score / totalScore : 0,
            color: groupColors[i % groupColors.length],
            tag: g.tag
        }));
    }

    sendLeaderboard(connection) {
        if (!connection.hasPlayer) return;
        const player = connection.player;
        if (!player.hasWorld) return;
        if (player.world.frozen) return;
        if (player.world.groupLeaderboard && player.world.groupLeaderboard.length > 0) {
            connection.protocol.onLeaderboardUpdate("pie", player.world.groupLeaderboard);
        }
    
}
module.exports = FFA;
const ServerHandle = require("../ServerHandle");
const World = require("../worlds/World");
const Connection = require("../sockets/Connection");
const Player = require("../worlds/Player");
