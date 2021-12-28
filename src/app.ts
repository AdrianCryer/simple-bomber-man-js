import { Ticker, Loader } from "pixi.js";
import Game, { GameMode } from "./model/game";
import GameMap from "./model/game-map";
import GameView from "./graphics/game-view";
import EventEmitter from "events";
import UserController from "./controllers/user-controller";
import shortUUID from "short-uuid";
import { Direction, Resources } from "./util/types";
import Match from "./model/gamemodes/match";

/**
 * APP: Combines the Model, View and Controllers (MVC). 
 * With an event emitter being used as a middle man
 * 
 * 
 * MODEL:
 *      GAME
 *          MATCH
 * VIEW
 *      GAMEVIEW
 *          STATSBOARD
 *          GAMEGRID
 *          GAMEOVERMODAL
 *          WIN MODAL
 *          MENU
 * 
 * CONTROLLER
 *      PLAYER CONTROLLER
 */

const TICK_RATE = 64;
const DEFAULT_GAME_SETTINGS = {};

const MAPS = {
    'retro': "../maps/retro.txt",
    'basic': "../maps/basic.txt"
};

/** If this was the server, we can simply use the socket id. */
const THIS_PLAYER_ID = shortUUID.generate();

export default class App {

    root: HTMLElement;
    ticker: Ticker;
    time: number;

    view: GameView;
    model: Game;
    controller: UserController;

    /** Maybe you can see where this is going :)) */
    socket: EventEmitter;

    constructor(root: HTMLElement) {

        this.socket = new EventEmitter();

        this.model = new Game(DEFAULT_GAME_SETTINGS, [THIS_PLAYER_ID]);
        this.view = new GameView(root, THIS_PLAYER_ID, 1920, 1080);
        this.controller = new UserController(this.socket);

        this.setupServer();
        this.setupClient();

        // Handle window resizing
        window.addEventListener('resize', () => this.view.resize());
    }

    /** This method will not touch the view / controller */
    setupServer() {
        this.ticker = new Ticker();
        this.ticker.stop();

        this.socket.on("play", (mode: GameMode) => {
            if (!this.model.hasMatchStarted) {

                if (mode === 'versus') {
                    this.model.startVersusMatch();
                    this.socket.emit("match_ready", this.model.currentMatch);
                }

                // Handle Game Over
                this.model.currentMatch.onGameOver(() => {
                    this.socket.emit("match_over");
                    this.ticker.stop();
                })
                
                // Setup fixed update ticker
                this.ticker.add(() => {
                    let timeNow = (new Date()).getTime();
                    let timeDiff = timeNow - this.time

                    if (timeDiff < Math.round(1000 / TICK_RATE)) {
                        return;
                    }
                    this.time = timeNow;
                    this.model.mutate(timeNow);
                    this.socket.emit("update_match", this.model.currentMatch);
                });
                this.ticker.start();
            }
        });
        // this.socket.on("place_bomb", () => {
        //     if (this.model.hasMatchStarted) {
        //         const player = this.model.currentMatch.getPlayer(THIS_PLAYER_ID);
        //         player.placeBomb();
        //     }
        // });
        // this.socket.on("set_moving", (direction: Direction) => {
        //     const player = this.model.currentMatch.getPlayer(THIS_PLAYER_ID);
        //     player.setMoving(direction);
        // });
        // this.socket.on("stop_moving", (direction: Direction) => {
        //     const player = this.model.currentMatch.getPlayer(THIS_PLAYER_ID);
        //     player.stopMoving(direction);
        // });
    }

    /** This method will not touch the model. */
    setupClient() {
        this.socket.on("ready", () => {
            this.view.initialise();
        });
        this.socket.on("match_ready", (match: Match) => {
            this.view.onMatchReady(match);
        });
        this.socket.on("update_match", (match: Match) => {
            this.view.onMatchUpdate(match);
        });
        this.socket.on("match_over", () => {
            console.log("Game over")
            // this.view.showGameOverScreen();
        });
        this.view.onPlay((mode) => this.socket.emit("play", mode));
        this.controller.setup();
    }

    async loadMaps() {
        const loader = new Loader();
        for (let [name, path] of Object.entries(MAPS)) {
            loader.add(name, path);
        }
        const resources: Resources = await new Promise(resolve => {
            loader.load((_, resources) => resolve(resources))
        });
        for (let resourceName of Object.keys(resources)) {
            const mapData = resources[resourceName].data;
            this.model.addMap(resourceName, GameMap.loadFromFile(mapData));
        }
    }

    async run() {

        await this.view.preloadAssets();
        await this.loadMaps();

        // Test loading
        setTimeout(() => {
            this.socket.emit("ready", this.model);
        }, 250);
    }
}