const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;

// iiko Token olish funksiyasi
async function getIikoToken() {
    try {
        const response = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
            apiLogin: IIKO_API_LOGIN
        });
        return response.data.token;
    } catch (error) {
        console.error("Token olishda xato:", error.response?.data || error.message);
        throw error;
    }
}

// 1. Tashkilotlarni ko'rish
app.get('/organizations', async (req, res) => {
    try {
        const token = await getIikoToken();
        const response = await axios.get('https://api-ru.iiko.services/api/1/organizations', {
            headers: { 'Authorization': Bearer ${token} }
        });
        res.json(response.data.organizations);
    } catch (error) {
        res.status(500).json({ error: "Token olinmadi", details: error.message });
    }
});

// 2. Stollarni ko'rish
app.get('/get-tables/:organizationId', async (req, res) => {
    try {
        const token = await getIikoToken();
        const response = await axios.post('https://api-ru.iiko.services/api/1/entities/tables', {
            organizationIds: [req.params.organizationId]
        }, {
            headers: { 'Authorization': Bearer ${token} }
        });
        
        const tables = response.data.restaurantSections.flatMap(section => 
            section.tables.map(table => ({ id: table.id, name: table.name }))
        );
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: "Stollarni yuklashda xato" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishlamoqda`);
});
