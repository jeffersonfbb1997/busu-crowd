const fs = require('fs');
const path = './index.html';

let content = fs.readFileSync(path, 'utf8');

// Additional mappings for remaining malformed characters
const replacements = [
    ['gest�o', 'gestão'],
    ['permiss�es', 'permissões'],
    ['Ap�s', 'Após'],
    ['sa�da', 'saída'],
    ['ap�s', 'após'],
];

for (const [wrong, correct] of replacements) {
    content = content.split(wrong).join(correct);
}

// Write back
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced', replacements.length, 'additional patterns');