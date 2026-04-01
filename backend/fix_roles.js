const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'tests');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = content.replace(/role:\s*['"]buyer['"]/g, "role: 'user'");
    content = content.replace(/role:\s*['"]seller['"]/g, "role: 'user'");
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated roles in ${filePath}`);
    }
};

const walkSync = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkSync(filePath);
        } else if (filePath.endsWith('.js')) {
            replaceInFile(filePath);
        }
    }
};

walkSync(directoryPath);
console.log('Role replacement complete.');
