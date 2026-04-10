const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;"48fb4cd3-2ef6-4479-bea1-7c92721b988c";

async function getIikoToken() {
    try {
        const response = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
            apiLogin: IIKO_API_LOGIN
        });
        return response.data.token;
    } catch (error) {
        console.error("Token olishda xato:", error.message);
        return null;
    }
}

// ✅ YANGI: Barcha organizatsiyalarni olish
app.get('/organizations', async (req, res) => {
    const token = await getIikoToken();
    if (!token) return res.status(500).json({ error: "Token olinmadi" });

    try {
        const orgs = await axios.get('https://api-ru.iiko.services/api/1/organizations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(orgs.data.organizations);
    } catch (error) {
        res.status(500).json({ error: "Organizatsiyalar olinmadi" });
    }
});

// ✅ YANGI: Filial ID va stol ID bilan hisob olish
app.get('/get-bill/:orgId/:tableId', async (req, res) => {
    const { orgId, tableId } = req.params;
    const token = await getIikoToken();

    if (!token) return res.status(500).json({ error: "Token olinmadi" });

    try {
        const bill = await axios.post(
            'https://api-ru.iiko.services/api/1/order/by_table',
            {
                organizationIds: [orgId], // Kerakli filial
                tableIds: [tableId]
            },
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );
        res.json(bill.data);
    } catch (error) {
        res.status(500).json({ error: "Hisob olinmadi" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ${PORT}-portda yondi`));
