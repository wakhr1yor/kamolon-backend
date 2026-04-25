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
// STOL HISOBINI (СЧЕТ) OLISH
app.get('/get-bill/:tableNum', async (req, res) => {
    try {
        const tableNum = req.params.tableNum;
        const token = await getIikoToken();
        const orgId = "932f51b3-e90b-454b-a838-eb9dec383b9a"; // Sizning Org ID

        // 1. Ochiq buyurtmalarni (hisoblarni) qidiramiz
        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/orders/by_table',
            { 
                organizationIds: [orgId],
                tableIds: [] // Bu yerda stol ID kerak bo'ladi, hozircha umumiy so'raymiz
            },
            { headers: { Authorization: 'Bearer ' + token } }
        );

        // 2. Kelgan buyurtmalar ichidan aynan bizning stolni filtrlaymiz
        const tableOrder = response.data.orders.find(order => 
            order.tableIds && order.tableIds.includes(tableNum)
        );

        if (!tableOrder) {
            return res.send(`<h2>Stol №${tableNum}: Hozircha ochiq hisob yo'q.</h2>`);
        }

        // 3. Hisob ma'lumotlarini chiroyli qilib chiqaramiz
        let itemsHtml = tableOrder.items.map(item => 
            <li>${item.name} x ${item.amount} = ${item.sum} so'm</li>
        ).join('');

        res.send(`
            <div style="font-family: sans-serif; padding: 20px; border: 2px dashed #000; max-width: 300px;">
                <h3 style="text-align: center;">KAMOLON OSH</h3>
                <p><b>Stol:</b> ${tableNum}</p>
                <hr>
                <ul style="list-style: none; padding: 0;">${itemsHtml}</ul>
                <hr>
                <h4 style="text-align: right;">JAMI: ${tableOrder.totalSum} so'm</h4>
                <p style="text-align: center; font-size: 12px;">Xizmatingiz uchun rahmat!</p>
            </div>
        `);

    } catch (error) {
        console.error('Xatolik:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Hisobni yuklashda xato", details: error.message });
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
