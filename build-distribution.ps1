# Build script for Cyber Trash Press distribution

Write-Host "Starting build process for Cyber Trash Press..." -ForegroundColor Cyan

# 1. Build the web frontend
Write-Host "Building web frontend..." -ForegroundColor Green
npm run build

# 2. Build the Electron application
Write-Host "Packaging Electron app..." -ForegroundColor Green
npm run electron:build

Write-Host "Build complete! Check the 'dist-electron' folder for the installer." -ForegroundColor Cyan
