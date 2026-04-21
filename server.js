const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;

async function getIikoToken() {
    try {
        const response = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
            apiLogin: IIKO_API_LOGIN
        });
        return response.data.token;
    } catch (error) {
        console.error('Token olishda xatolik:', error.message);
        throw error;
    }
}

app.get('/organizations', async (req, res) => {
    try {
        const token = await getIikoToken();
        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/organizations',
            { organizationIds: [] },
            { headers: { Authorization: 'Bearer ${token}' } }
        );
        res.json(response.data.organizations);
    } catch (error) {
        res.status(500).json({ error: 'Xatolik', details: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`);
});
