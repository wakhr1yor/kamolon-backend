// Corrected code for server.js

// Assuming other code remains unchanged

const express = require('express');

const app = express();

// Corrected template literals on specified lines

// Line 37
const message = `This is a message with a dynamic variable: ${dynamicVariable}`;

// Line 51
app.get('/api/data', (req, res) => {
    res.json({ message: `Data fetched successfully at ${new Date().toISOString()}` });
});

// Line 94
console.log(`Server is running on port ${port}.`);

// Rest of the server.js code