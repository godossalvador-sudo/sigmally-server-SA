const Gamemode = require("./Gamemode");
const Misc = require("../primitives/Misc");

const highlightBase = 231,
       lowlightBase = 23,
      highlightDiff = 24,
       lowlightDiff = 24;
const teamColors = [
    { r: highlightBase, g: lowlightBase, b: lowlightBase },
    { r: lowlightBase, g: highlightBase, b: lowlightBase },
    { r: lowlightBase, g: lowlightBase, b: highlightBase }
];
const teamColorsInt = [
    0xFF0000,
    0x00FF00,
    0x0000FF
];
const teamCount = teamColors.length;

function getTeamColor(index) {
    const random = Math.random();
    const highlight = highlightBase + ~~(random * highlightDiff);
    const lowlight  =  lowlightBase - ~~(random * lowlightDiff);
    const r = teamColors[index].r === highlightBase ? highlight : lowlight;
    const g = teamColors[index].g === highlightBase ? highlight : lowlight;
    const b = teamColors[index].b === highlightBase ? highlight : lowlight;
    return (r << 16) | (g << 8) | b;
}

class Teams extends Gamemode {
    constructor(handle) {
        super(handle);
    }

    static get name() { return "Teams"; }
    static get type() { return 2; }

    onNewWorld(world) {
        world.teams = { };
        for (let i = 0; i < teamCount; i++)
            world.teams[i] = [];
    }

    onPlayerJoinWorld(player, world) {
        if (!player.router.separateInTeams) return;
        let team = 0;
        for (let i = 0; i < teamCount; i++)
            team = world.teams[i].length < world.teams[team].length ? i : team;
        world.teams[team].push(player);
        player.team = team;
        player.chatColor = getTeamColor(player.team);
    }

    onPlayerLeaveWorld(player, world) {
        if (!player.router.separateInTeams) return;
        world.teams[player.team].splice(world.teams[player.team].indexOf(player), 1);
        player.team = null;
    }

    onPlayerSpawnRequest(player) {
        if (player.state === 0 || !player.hasWorld) return;
        const size = player.router.type === "minion" ?
            this.handle.settings.minionSpawnSize :
            this.handle.settings.playerSpawnSize;
        let pos;
        if (player.team === 0) {
            pos = { 
                x: player.world.border.x + player.world.border.w * 0.25 + Math.random() * player.world.border.w * 0.5, 
                y: player.world.border.y + player.world.border.h * 0.1 + Math.random() * player.world.border.h * 0.15 
            };
        } else if (player.team === 1) {
            pos = { 
                x: player.world.border.x + player.world.border.w * 0.25 + Math.random() * player.world.border.w * 0.5, 
                y: player.world.border.y + player.world.border.h * 0.75 + Math.random() * player.world.border.h * 0.15 
            };
        } else {
            pos = player.world.getSafeSpawnPos(size, player);
        }
        const color = player.router.separateInTeams ? getTeamColor(player.team) : Misc.randomColor();
       console.log("DEBUG spawningAttributes:", JSON.stringify(player.router.spawningAttributes));
const name = player.router.spawningAttributes.name || player.leaderboardName || '';
        player.cellName = player.chatName = player.leaderboardName = name;
        player.cellSkin = null;
        player.chatColor = player.cellColor = color;
        player.clan = player.router.spawningAttributes.clan || '';
        player.sub = !!player.router.spawningAttributes.sub;
        player.world.spawnPlayer(player, pos, size);
    }

    compileLeaderboard(world) {
        const teams = world.leaderboard = [];
        for (let i = 0; i < teamCount; i++)
            teams.push({ weight: 0, color: teamColorsInt[i] });
        let sum = 0;
        for (let i = 0; i < world.playerCells.length; i++) {
            const cell = world.playerCells[i];
            if (cell.owner.team === null) continue;
            teams[cell.owner.team].weight += cell.squareSize;
            sum += cell.squareSize;
        }
        for (let i = 0; i < teamCount; i++)
            teams[i].weight /= sum;
    }

    sendLeaderboard(connection) {
        connection.protocol.onLeaderboardUpdate("pie", connection.player.world.leaderboard);
    }
}

module.exports = Teams;

const ServerHandle = require("../ServerHandle");
const World = require("../worlds/World");
const Connection = require("../sockets/Connection");
const Player = require("../worlds/Player");
