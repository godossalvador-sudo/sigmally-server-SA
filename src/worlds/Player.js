const Router = require("../sockets/Router");
const ServerHandle = require("../ServerHandle");
const World = require("./World");
const Cell = require("../cells/Cell");
const PlayerCell = require("../cells/PlayerCell");
const BitGrid = require("../primitives/BitGrid");
const { intersects } = require("../primitives/Misc");

class Player {
    /**
     * @param {ServerHandle} handle
     * @param {number} id
     * @param {Router} router
     */
    constructor(handle, id, router) {
        this.handle = handle;
        this.id = id;
        this.router = router;
        this.exists = true;

        /** @type {string} */
        this.leaderboardName = null;
        /** @type {string} */
        this.cellName = null;
        this.chatName = "Spectator";
        /** @type {string} */
        this.cellSkin = null;
        /** @type {number} */
        this.cellColor = 0x7F7F7F;
        /** @type {number} */
        this.chatColor = 0x7F7F7F;

        this.clan = '';
        this.showClanmates = false;
        this.sub = false;

        /** @type {PlayerState} */
        this.state = -1;
        this.hasWorld = false;
        /** @type {World} */
        this.world = null;
        /** @type {any} */
        this.team = null;
        this.score = NaN;

        /** @type {PlayerCell[]} */
        this.ownedCells = [];
        /** @type {{[cellId: string]: Cell}} */
        this.visibleCells = { };
        /** @type {{[cellId: string]: Cell}} */
        this.lastVisibleCells = { };
        this.visibleCellsTick = NaN;
        /** @type {ViewArea} */
        this.viewArea = {
            x: 0,
            y: 0,
            w: 1920 / 2 * handle.settings.playerViewScaleMult,
            h: 1080 / 2 * handle.settings.playerViewScaleMult,
            s: 1
        };
    }

    get settings() { return this.handle.settings; }

    destroy() {
        if (this.hasWorld) this.world.removePlayer(this);
        this.exists = false;
    }

    /**
     * @param {PlayerState} targetState
     */
    updateState(targetState) {
        if (this.world === null)                            this.state = -1;
        else if (this.ownedCells.length > 0)                this.state = 0;
        else if (targetState === -1)                        this.state = -1;
        else if (this.world.largestPlayer === null)         this.state = 2;
        else if (this.state === 1 && targetState === 2)     this.state = 2;
        else                                                this.state = 1;
    }

    updateViewArea() {
        if (this.world === null) return;
        let s;
        switch (this.state) {
            case -1: this.score = NaN; break;
            case 0:
                let x = 0, y = 0, score = 0; s = 0;
                const l = this.ownedCells.length;
                for (let i = 0; i < l; i++) {
                    const cell = this.ownedCells[i];
                    x += cell.x;
                    y += cell.y;
                    s += cell.size;
                    score += cell.mass;
                }
                this.viewArea.x = x / l;
                this.viewArea.y = y / l;
                this.score = score;
                s = this.viewArea.s = Math.pow(Math.min(64 / s, 1), 0.4);
                this.viewArea.w = 1920 / s / 2 * this.settings.playerViewScaleMult;
                this.viewArea.h = 1080 / s / 2 * this.settings.playerViewScaleMult;
                break;
            case 1:
                this.score = NaN;
                const spectating = this.world.largestPlayer;
                this.viewArea.x = spectating.viewArea.x;
                this.viewArea.y = spectating.viewArea.y;
                this.viewArea.s = spectating.viewArea.s;
                this.viewArea.w = spectating.viewArea.w;
                this.viewArea.h = spectating.viewArea.h;
                break;
            case 2:
                this.score = NaN;
                let dx = this.router.mouseX - this.viewArea.x;
                let dy = this.router.mouseY - this.viewArea.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                const D = Math.min(d, this.settings.playerRoamSpeed);
                if (D < 1) break; dx /= d; dy /= d;
                const border = this.world.border;
                this.viewArea.x = Math.max(border.x - border.w, Math.min(this.viewArea.x + dx * D, border.x + border.w));
                this.viewArea.y = Math.max(border.y - border.h, Math.min(this.viewArea.y + dy * D, border.y + border.h));
                s = this.viewArea.s = this.settings.playerRoamViewScale;
                this.viewArea.w = 1920 / s / 2 * this.settings.playerViewScaleMult;
                this.viewArea.h = 1080 / s / 2 * this.settings.playerViewScaleMult;
                break;
        }
    }

    updateVisibleCells() {
        if (this.world === null) return;
        if (this.handle.tick === this.visibleCellsTick) return;

        delete this.lastVisibleCells;
        this.lastVisibleCells = this.visibleCells;
        let visibleCells = this.visibleCells = { };
        this.visibleCellsTick = this.handle.tick;

        if (this.state === 1 && this.world.largestPlayer && this !== this.world.largestPlayer) {
            this.world.largestPlayer.updateVisibleCells();
            this.visibleCells = this.world.largestPlayer.visibleCells;
            // side effect: clanmates won't be visible, but that's a lot of extra complexity to support
        } else {
            for (let i = 0, l = this.ownedCells.length; i < l; i++) {
                const cell = this.ownedCells[i];
                visibleCells[cell.id] = cell;
            }

            if (this.clan !== "" && this.showClanmates) {
                for (let i = 0, l = this.world.players.length; i < l; i++) {
                    const player = this.world.players[i];
                    if (player.clan === this.clan) {
                        const firstCell = player.ownedCells[0];
                        if (firstCell) visibleCells[firstCell.id] = firstCell;
                    }
                }
            }

            const modifiedViewArea = { ...this.viewArea };
            if (!this.router.isExternal && this !== this.world.largestPlayer) {
                // PlayerBots should use a heavily reduced FOV
                modifiedViewArea.w /= 2;
                modifiedViewArea.h /= 2;
                modifiedViewArea.s /= 2;
            }
            let anyPellets = false;
            this.world.finder.search(modifiedViewArea, (cell) => {
                visibleCells[cell.id] = cell;
                anyPellets ||= cell.type === 1;
            });

            if (!anyPellets && !this.router.isExternal && this !== this.world.largestPlayer) {
                // if PlayerBots can't find any nearby pellets, it's probably strayed off the wrong path
                this.world.finder.search(this.viewArea, (cell) => {
                    visibleCells[cell.id] = cell;
                });
            }
        }
    }

    checkExistence() {
        if (!this.router.disconnected) return;
        if (this.state !== 0) return void this.handle.removePlayer(this.id);
        const disposeDelay = this.settings.worldPlayerDisposeDelay;
        if (disposeDelay > 0 && this.handle.tick - this.router.disconnectionTick >= disposeDelay)
            this.handle.removePlayer(this.id);
    }
}

module.exports = Player;
