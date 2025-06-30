const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const API_KEY = process.env.API_KEY || 'rZBm5767LxkI5865'; // Change this to a strong password

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// API Key Middleware for write operations
const apiKeyAuth = (req, res, next) => {
    const providedKey = req.query.apiKey || req.headers['x-api-key'];
    
    if (!providedKey || providedKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }
    next();
};

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// Helper function to read data
function readData() {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        console.error('Error reading data file:', err);
        return [];
    }
}

// Helper function to write data
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing data file:', err);
    }
}

// GET all items (public)
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// GET single item by ID (public)
app.get('/api/data/:id', (req, res) => {
    const data = readData();
    const item = data.find(item => item.id === req.params.id);
    if (item) {
        res.json(item);
    } else {
        res.status(404).json({ error: 'Item not found' });
    }
});

// POST new item (protected)
app.post('/api/data', apiKeyAuth, (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is empty' });
    }

    const data = readData();
    const newItem = {
        id: Date.now().toString(), // Simple ID generation
        ...req.body
    };
    data.push(newItem);
    writeData(data);
    res.status(201).json(newItem);
});

// PUT update existing item (protected)
app.put('/api/data/:id', apiKeyAuth, (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Request body is empty' });
    }

    const data = readData();
    const index = data.findIndex(item => item.id === req.params.id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = {
        ...data[index],
        ...req.body,
        id: req.params.id // Ensure ID remains the same
    };

    data[index] = updatedItem;
    writeData(data);
    res.json(updatedItem);
});

// DELETE item (protected)
app.delete('/api/data/:id', apiKeyAuth, (req, res) => {
    const data = readData();
    const initialLength = data.length;
    const filteredData = data.filter(item => item.id !== req.params.id);
    
    if (filteredData.length === initialLength) {
        return res.status(404).json({ error: 'Item not found' });
    }

    writeData(filteredData);
    res.status(204).end();
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API Key: ${API_KEY}`);
});