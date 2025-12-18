import './style.css';
import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';
import { SettingsScene } from './scenes/SettingsScene';
import { MainScene } from './scenes/MainScene';
import { SkillTreeScene } from './scenes/SkillTreeScene';
import { AchievementScene } from './scenes/AchievementScene';
import { CraftingScene } from './scenes/CraftingScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  backgroundColor: '#9b9b9bff', // Industrial Slate
  parent: 'app',
  physics: {
    default: 'matter',
    matter: {
      debug: false, // Set to true for debugging physics
      gravity: { x: 0, y: 1 },
      enableSleeping: true
    }
  },
  scene: [TitleScene, MainScene, SkillTreeScene, AchievementScene, CraftingScene, SettingsScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
new Phaser.Game(config);
