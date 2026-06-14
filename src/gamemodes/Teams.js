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
    const name = player.router.spawningAttributes.name || player.leaderboardName || '';
    player.cellName = player.chatName = player.leaderboardName = name;
    player.cellSkin = null;
    player.chatColor = player.cellColor = color;
    player.clan = player.router.spawningAttributes.clan || '';
    player.sub = !!player.router.spawningAttributes.sub;
    player.world.spawnPlayer(player, pos, size);
}
