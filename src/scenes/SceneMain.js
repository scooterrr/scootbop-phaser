/*jshint esversion: 6 */
import Align from "../util/Align";
import * as dat from 'dat.gui';
import {AlignGrid} from "../util/alignGrid";
import { UIBlock } from "../util/UIBlock";
import PostProcess from '../assets/pipelines/PostProcess.js';

export class SceneMain extends Phaser.Scene
{
    constructor()
    {
        super("SceneMain");
    }
    preload()
    {
        this.load.image("background", "src/assets/images/background.jpg");
        this.load.image("grain", "src/assets/images/grain.png");
        this.load.spritesheet("scoot", "src/assets/images/scoot.png", 
        { 
            frameWidth: 600, 
            frameHeight: 600
        });
        this.load.spritesheet("receiver", "src/assets/images/receiver.png", 
        { 
            frameWidth: 505, 
            frameHeight: 310
        });

    }

    create()
    {
        // Game Time variable
        this.gameTime = 0.0;

        // Resolution 

        // Camera
        this.cam = this.cameras.main;
        this.cam.zoom = 1.2;
        this.barrelPower = 0.53;
        this.bloomPower = 1.0;
        this.highFreqShake = 0.049;
        this.medFreqShake = 0.038;
        this.lowFreqShake = 0.06;
        this.filmFadeAmount = 0.0;

        
        // Debug UI
        var gui = new dat.GUI();

        var help = {
            line1: 'Cursors to move',
            line2: 'Q & E to zoom'
        }

        var f1 = gui.addFolder('Camera');
        f1.add(this.cam, 'scrollX').listen();
        f1.add(this.cam, 'scrollY').listen();
        f1.add(this.cam, 'zoom', 0.1, 2).step(0.1).listen();
        f1.add(this, 'filmFadeAmount', 0.0, 1.0).step(0.01).listen(); 
        f1.add(this, 'barrelPower', -2.0, 2.0).step(0.01).listen();
        f1.add(this, 'bloomPower', 0.0, 2.0).step(0.01).listen();
        f1.add(this, 'highFreqShake', 0.0, 0.2).step(0.001).listen();
        f1.add(this, 'medFreqShake', 0.0, 0.2).step(0.001).listen();
        f1.add(this, 'lowFreqShake', 0.0, 0.2).step(0.001).listen();
        f1.open();

        // Animations
        this.anims.create({
            key: "scootBop",
            frames: this.anims.generateFrameNumbers("scoot", { start: 0, end: 31 }),
            frameRate: 12,
            repeat: -1
        });

        this.anims.create({
            key: "receiverDisplayAnim",
            frames: this.anims.generateFrameNumbers("receiver", { start: 0, end: 31 }),
            frameRate: 6,
            repeat: -1
        });

        // Background
        let backgroundScale = 0.5;
        let background = this.add.image(0, 0, "background");
        background.x = background.width/4;
        background.y = background.height/4;
        background.setScale(backgroundScale);

        // Sprites
        let scoot = this.add.sprite(1204, 954, "scoot");
        scoot.setScale(backgroundScale);
        scoot.play("scootBop");

        let receiverDisplay = this.add.sprite(1270, 1082, "receiver");
        receiverDisplay.setScale(backgroundScale);
        receiverDisplay.play("receiverDisplayAnim");

        // Post FX
        this.cameras.main.setPostPipeline(PostProcess);
        this.filmFadeTween = this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 5000
        });

        this.postPipeline = this.cam.getPostPipeline(PostProcess);

    }

    update()
    {
        this.gameTime += 0.01;

        // Film fade
        if (this.filmFadeTween.progress < 1.0)
        {
            this.filmFadeAmount = this.filmFadeTween.progress;
        }


        // Camera shader params
        this.postPipeline.set1f('barrelPower', this.barrelPower);
        this.postPipeline.set1f('bloomPower', this.bloomPower);
        this.postPipeline.set1f('fadeAmount', this.filmFadeAmount); 
        this.postPipeline.set2f('uResolution', this.game.config.width, this.game.config.height);

        // Light camera shake
        this.cameras.main.scrollX += Math.sin(this.gameTime * 0.7) * this.lowFreqShake;
        this.cameras.main.scrollX += Math.sin(this.gameTime * 6.0) * this.medFreqShake;
        this.cameras.main.scrollX += Math.sin(this.gameTime * 48.0) * this.highFreqShake;
        this.cameras.main.scrollY += Math.sin(this.gameTime * 0.4) * this.lowFreqShake;
        this.cameras.main.scrollY += Math.sin(this.gameTime * 8.0) * this.medFreqShake;
        this.cameras.main.scrollY += Math.sin(this.gameTime * 64.0) * this.highFreqShake;
    }
}
export default SceneMain