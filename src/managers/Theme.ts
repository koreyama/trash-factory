export const Theme = {
    colors: {
        bg: '#2d3436', // Dark Grey background
        text: '#ffffff', // White text
        textSecondary: '#dfe6e9', // Light Grey
        accent: '#0984e3', // Blue accent
        secondary: '#636e72', // Grey secondary
        success: '#00b894', // Green success
        warning: '#fdcb6e', // Yellow/Orange
        danger: '#d63031',  // Red
        panel: '#000000', // Panel background (using low opacity usually)
        panelBorder: '#ffffff'
    },
    fonts: {
        main: '"Orbitron", "Noto Sans JP", sans-serif'
    },
    styles: {
        textMain: { fontFamily: '"Orbitron", "Noto Sans JP", sans-serif', fontSize: '24px', color: '#ffffff' } as Phaser.Types.GameObjects.Text.TextStyle,
        textSmall: { fontFamily: '"Orbitron", "Noto Sans JP", sans-serif', fontSize: '16px', color: '#dfe6e9' } as Phaser.Types.GameObjects.Text.TextStyle,
        buttonText: { fontFamily: '"Orbitron", "Noto Sans JP", sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' } as Phaser.Types.GameObjects.Text.TextStyle
    }
};
