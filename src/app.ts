import * as PIXI from "pixi.js"
import { Rectangle, SCALE_MODES } from "pixi.js";
import FontFaceObserver from "fontfaceobserver";
import Game from "./game";
import GameMap from "./game-map";
import { GameSettings } from "./types";
import { AbsoluteContainer } from "./graphics/absolute-container";
import Modal from "./graphics/modal";

import basicMap from "../maps/basic.txt";
import retroMap from "../maps/retro.txt";


const assets = {    
    "solid": "../assets/solid-sprite.png",
    "open": "../assets/open-sprite.png",
    "brick": "../assets/brick-sprite.png",
    "bomb": "../assets/bomb-spritesheet.json",
    "explosion": "../assets/explosion-spritesheet.json",
    "skull": "../assets/skull.png"
};

export default class App {

    root: HTMLElement;
    app: PIXI.Application;
    gameTicker: PIXI.Ticker;
    
    screenBounds: PIXI.Rectangle;
    game: Game;
    gameContainer: AbsoluteContainer;
    gameOverModal: Modal;

    constructor(window: any, root: HTMLElement) {
        this.app = new PIXI.Application({
            width: 1920,
            height: 1080,
            antialias: false,
            resizeTo: window
        });
        this.app.stage.sortableChildren = true;

        root.appendChild(this.app.view);

        // Handle window resizing
        window.addEventListener('resize', () => this.resize());

        // PIXI Global settings
        PIXI.settings.SCALE_MODE = SCALE_MODES.NEAREST;
        PIXI.settings.ROUND_PIXELS = true;

        // Load assets
        for (let [name, path] of Object.entries(assets)) {
            this.app.loader.add(name, path);
        }

        const { width, height } = this.app.screen;
        this.screenBounds = new Rectangle(0, 0, width, height);
        
        this.gameContainer = new AbsoluteContainer();
        this.gameContainer.setBounds(this.screenBounds);
        this.gameContainer.sortableChildren = true;

        this.app.renderer.backgroundColor = 0x564dff;
        this.app.stage.addChild(this.gameContainer);

        this.gameTicker = new PIXI.Ticker();
    }

    resize() {
        this.app.renderer.resize(window.innerWidth, window.innerHeight);
        this.screenBounds = new Rectangle(0, 0, this.app.screen.width, this.app.screen.height);

        // Just don't set the scale of the container, instead, set the bounds
        this.gameContainer.setBounds(this.screenBounds);

        if (this.game) {
            this.game.resize();
        }
    }

    onRestart() {
        this.gameTicker.destroy();
        this.gameTicker = new PIXI.Ticker();

        this.setup();
    }

    setupGameOverModal() {

        const texture = this.app.loader.resources['skull'].texture;
        const skull = new PIXI.Sprite(texture);
        skull.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
        skull.width = 120;
        skull.height = 120;
        skull.anchor.set(0.5, 0.5);
        skull.tint = 0x262626;

        this.gameOverModal = new Modal(this.screenBounds, {
            padding: 40,
            title: "You Loose",
            showCancelButton: true,
            cancelButtonText: "Retry",
            confirmButtonText: "Menu",
            darkenBackground: true,
            modalWidthRatio: 0.5,
            modalHeightRatio: 0.5,
            icon: skull,
            onConfirm: () => { console.log("Clicked confirm") },
            onCancel: () => { console.log("Clicked cancel") },
        });
        this.gameOverModal.zIndex = 10;
        this.app.stage.addChild(this.gameOverModal);
        this.gameOverModal.show();
        this.gameOverModal.draw();
    }

    async setup() {

        const font = new FontFaceObserver("oldschool");
        await font.load();

        const mapString = await GameMap.loadMapFile(retroMap);
        const settings: GameSettings = {
            map: GameMap.loadFromFile(mapString),
            bots: 1,
            difficulty: 'easy',
            tickrate: 64,
            brickSpawnChance: 0.3,
            powerupSpawnChance: 1,
            statsSettings: {
                speed: { min: 1, max: 8 },
                explosionRadius: { min: 2, max: 10 },
                explosionDuration: { min: 0.2, max: 1 },
                bombCount: { min: 1, max: 5 },
                bombTimer: { min: 0.2, max: 5 }
            },
            detaultStats: {
                speed: 3,
                explosionDuration: 0.5,
                explosionRadius: 5,
                bombCount: 1,
                bombTimer: 3
            },
            powerups:  [
                { name: 'Speed Up', stat: 'speed', delta: 1, rarity: 1 },
                { name: 'Bomb range up', stat: 'explosionRadius', delta: 1, rarity: 1 },
                { name: 'Bib bombs', stat: 'explosionRadius', delta: 3, rarity: 2 }
            ],
            powerupRarityStepFunction: (maxRarity: number, val: number) => {
                return Math.floor(maxRarity * val**2) + 1;
            },
            statusBoard: {
                alignment: 'left',
                splitRatio: 0.2
            }
        };

        const resources = this.app.loader.resources;

        this.game = new Game(this.gameContainer, this.gameTicker, resources, settings);
        this.game.start();
                
        // this.setupModal();
    }

    async run() {
        this.app.loader.load(() => this.setup());
    }
}