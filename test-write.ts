import fs from 'fs';
try {
  fs.writeFileSync('/agenda.json', 'test');
  console.log('Successfully wrote to /agenda.json');
} catch (e) {
  console.error('Failed to write to /agenda.json:', e);
}
