import Phaser from 'phaser';
import * as dat from 'dat.gui';
import {SceneMain} from "./scenes/SceneMain"
import PostProcess from './assets/pipelines/PostProcess.js';

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-examples',
    width: 1920,
    height: 1920,
    scale: {
    	mode: Phaser.Scale.ENVELOP,
    	autoCenter: Phaser.Scale.CENTER_BOTH
    },
    autoRound: false,
    scene: SceneMain,
    pipeline: { PostProcess }
};

const game = new Phaser.Game(config);
