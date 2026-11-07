const fs = require('fs');
const path = require('path');
const dir = 'C:/VisualStudio/AI Study and Quiz Website';
console.log('Directory exists:', fs.existsSync(dir));
console.log('node_modules exists:', fs.existsSync(path.join(dir, 'node_modules')));
console.log('package.json exists:', fs.existsSync(path.join(dir, 'package.json')));

if (fs.existsSync(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    console.log('Dependencies:', Object.keys(pkg.dependencies).slice(0, 20).join(', '));
    console.log('DevDependencies:', Object.keys(pkg.devDependencies).slice(0, 20).join(', '));
}