const { Client } = require('pg');

const connectionString = 'postgresql://postgres:admin@localhost:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

client.connect()
  .then(() => {
    console.log('Successfully connected to PostgreSQL');
    return client.query('SELECT 1');
  })
  .then(() => {
    console.log('Query successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error', err.stack);
    process.exit(1);
  });
