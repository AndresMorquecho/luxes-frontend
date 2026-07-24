const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'navigation', 'infrastructure', 'ui', 'Sidebar.jsx');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Lines are 1-indexed. We want to extract 506-588.
// Array indices: 505 to 587 inclusive.
const finanzasBlock = lines.slice(505, 588);

// Remove the block
lines.splice(505, 83); // removes 83 lines starting from index 505

// Insert at line 254 (index 253)
lines.splice(253, 0, ...finanzasBlock);

// Add an empty line between Finanzas and Nomina
lines.splice(253 + 83, 0, '');

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Sidebar reordered');
