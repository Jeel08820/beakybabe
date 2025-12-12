const fs = require('fs');
const path = require('path');

const dest = 'public';

// Create public directory
if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
}

// Function to copy file
function copyFile(src, destPath) {
    fs.copyFileSync(src, destPath);
}

// Function to copy directory
function copyDir(src, destPath) {
    if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destFilePath = path.join(destPath, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destFilePath);
        } else {
            copyFile(srcPath, destFilePath);
        }
    }
}

// Files and folders to include
const includedExtensions = ['.html', '.css', '.js', '.json', '.xml', '.txt', '.md'];
const excludedFiles = ['build.js', 'package.json', 'package-lock.json', 'vercel.json', 'netlify.toml', '.gitignore'];
const includedDirs = ['assets', 'api', 'emails'];

// Copy files from root
const files = fs.readdirSync('.');
for (let file of files) {
    if (excludedFiles.includes(file)) continue;

    const ext = path.extname(file);
    const stat = fs.statSync(file);

    if (stat.isFile() && includedExtensions.includes(ext)) {
        copyFile(file, path.join(dest, file));
    } else if (stat.isDirectory() && includedDirs.includes(file)) {
        copyDir(file, path.join(dest, file));
    }
}

console.log('Build completed: files copied to public/');
