const fs = require("fs");
const DefaultSettings = require("../src/Settings");
const ServerHandle = require("../src/ServerHandle");
const { genCommand } = require("../src/commands/CommandList");
const readline = require("readline");

const DefaultCommands = require("../src/commands/DefaultCommands");
const DefaultProtocols = [
    require("../src/protocols/SigmallyProtocol"),
    require("../src/protocols/LegacyProtocol"),
    require("../src/protocols/ModernProtocol"),
];
const DefaultGamemodes = [
    require("../src/gamemodes/FFA"),
    require("../src/gamemodes/Teams"),
    require("../src/gamemodes/LastManStanding")
];

function readSettings() {
    try { return JSON.parse(fs.readFileSync("./settings.json", "utf-8")); }
    catch (e) {
        console.log("caught error while parsing/reading settings.json:", e.stack);
        process.exit(1);
    }
}
function overwriteSettings(settings) {
    fs.writeFileSync("./settings.json", JSON.stringify(settings, null, 4), "utf-8");
}

if (!fs.existsSync("./settings.json"))
    overwriteSettings(DefaultSettings);
let settings = readSettings();

const currentHandle = new ServerHandle(settings);
overwriteSettings(currentHandle.settings);
require("./log-handler")(currentHandle);
const logger = currentHandle.logger;

let commandStreamClosing = false;
const commandStream =
