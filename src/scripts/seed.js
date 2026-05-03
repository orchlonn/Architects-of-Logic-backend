const db = require('../db');

const result = db.seedQuestions({ truncate: true });
console.log(`Seeded ${result.inserted} question rows (truncated existing).`);
process.exit(0);
