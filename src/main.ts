import './style.css';
import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { SettingsScene } from './scenes/SettingsScene';
import { MainScene } from './scenes/MainScene';
import { SkillTreeScene } from './scenes/SkillTreeScene';
import { AchievementScene } from './scenes/AchievementScene';
import { CraftingScene } from './scenes/CraftingScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { RoguelikeScene } from './scenes/RoguelikeScene';
import { RefineryScene } from './scenes/RefineryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Force WebGL for GPU acceleration (was AUTO)
  width: 1920,
  height: 1080,
  backgroundColor: '#9b9b9bff', // Industrial Slate
  parent: 'app',
  physics: {
    default: 'matter',
    matter: {
      debug: false, // Set to true for debugging physics
      gravity: { x: 0, y: 1 },
      enableSleeping: true, // Bodies that stop moving become inactive - crucial for performance
      // Performance optimizations for handling many objects
      positionIterations: 4, // Default is 6, lower = faster but less accurate
      velocityIterations: 2, // Default is 4, lower = faster but less accurate
      constraintIterations: 1, // Default is 2
    }
  },
  scene: [TitleScene, MainScene, SkillTreeScene, AchievementScene, CraftingScene, SettingsScene, StageSelectScene, RoguelikeScene, RefineryScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // GPU Performance Optimizations
  render: {
    antialias: true, // Enable antialiasing for smoother text/edges
    pixelArt: false,
    roundPixels: false, // Turn off roundPixels for smoother text rendering at high DPR
    resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crispness
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxLights: 10
  },
  fps: {
    target: 60,
    forceSetTimeOut: false // Use requestAnimationFrame
  },
  disableContextMenu: true
};

new Phaser.Game(config);
