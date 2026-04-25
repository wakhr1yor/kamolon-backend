const express = require('express');
const axios = require('axios');
const cors = require('cors');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(cors());
app.use(express.json());

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;

// 1. IIKO TOKEN OLISH
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

// 2. FILIALLARNI OLISH (Organizations)
app.get('/organizations', async (req, res) => {
    try {
        const token = await getIikoToken();
        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/organizations',
            { organizationIds: [] },
            { headers: { Authorization: 'Bearer ' + token } }
        );
        res.json(response.data.organizations);
    } catch (error) {
        res.status(500).json({ error: 'Xatolik', details: error.message });
    }
});

// 3. STOLLARNI OLISH (Aynan o'sha siz so'ragan get-tables)
app.get('/get-tables/:organizationId', async (req, res) => {
    try {
        const orgId = req.params.organizationId;
        const token = await getIikoToken();
        
        // Terminal guruhlarini olamiz (Bu endpoint odatda hamma uchun ochiq)
        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/terminal_groups',
            { organizationIds: [orgId] },
            { headers: { Authorization: 'Bearer ' + token } }
        );

        // Natijani qaytaramiz - bu yerda sizga kerakli terminal va unga bog'liq stollar chiqishi mumkin
        res.json(response.data);

    } catch (error) {
        console.error('Xatolik:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Ma’lumot olishda xato', details: error.message });
    }
});

// 4. QR GENERATOR
app.get('/generate-qr', async (req, res) => {
    try {
        const tableNum = req.query.tableNum || "0";
        const canvas = createCanvas(400, 600);
        const ctx = canvas.getContext('2d');

        // Fon
        ctx.fillStyle = '#004a61';
        ctx.fillRect(0, 0, 400, 600);

        // Matnlar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('KAMOLON OSH', 200, 50);
        ctx.fillText('STOL - ' + tableNum, 200, 110);

        // QR URL
        const qrUrl = "https://kamolon-osh.uz/order?table=" + tableNum;
        const qrImageBuffer = await QRCode.toDataURL(qrUrl);
        const qrImage = await loadImage(qrImageBuffer);

        ctx.drawImage(qrImage, 50, 150, 300, 300);
        ctx.fillText('HISOB SHU YERDA', 200, 530);

        const buffer = canvas.toBuffer('image/png');
        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send("Generator xatosi");
    }
});

// 5. SERVERNI ISHGA TUSHIRISH
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('Server ishga tushdi: ' + PORT);
});
