import fs from 'fs';
try {
  fs.writeFileSync('/src/agenda.json', 'test');
  console.log('Successfully wrote to /src/agenda.json');
} catch (e) {
  console.error('Failed to write to /src/agenda.json:', e);
}
