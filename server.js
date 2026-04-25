const express = require('express');
const axios = require('axios');
const cors = require('cors');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(cors());
app.use(express.json());

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;
const ORG_ID = "932f51b3-e90b-454b-a838-eb9dec383b9a"; 

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

// 2. STOL HISOBINI (СЧЕТ) OLISH
app.get('/get-bill/:tableNum', async (req, res) => {
    try {
        const tableNum = req.params.tableNum;
        const token = await getIikoToken();

        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/orders/by_table',
            { organizationIds: [ORG_ID] },
            { headers: { Authorization: 'Bearer ' + token } }
        );

        const tableOrder = response.data.orders.find(order => 
            order.tableIds && order.tableIds.includes(tableNum)
        );

        if (!tableOrder) {
            return res.send(`<h2>Stol №${tableNum}: Hozircha ochiq hisob yo'q.</h2>`);
        }

        let itemsHtml = tableOrder.items.map(item => 
            <li>${item.name} x ${item.amount} = ${item.sum} so'm</li>
        ).join('');

        // DIQQAT: Bu yerda backtick belgilari (`) ishlatilgan
        res.send(`
            <div style="font-family: sans-serif; padding: 20px; border: 2px dashed #000; max-width: 350px; margin: auto;">
                <h3 style="text-align: center;">KAMOLON OSH</h3>
                <p><b>Stol raqami:</b> ${tableNum}</p>
                <hr>
                <ul style="list-style: none; padding: 0;">${itemsHtml}</ul>
                <hr>
                <h4 style="text-align: right;">JAMI: ${tableOrder.totalSum} so'm</h4>
                <p style="text-align: center; font-size: 12px;">Xizmatingiz uchun rahmat!</p>
            </div>
        `);

    } catch (error) {
        res.status(500).send("Xatolik: iiko orders API ruxsati yoqilmagan bo'lishi mumkin.");
    }
});

// 3. QR GENERATOR (Endi to'g'ridan-to'g'ri hisobga yo'naltiradi)
app.get('/generate-qr', async (req, res) => {
    try {
        const tableNum = req.query.tableNum || "0";
        const canvas = createCanvas(400, 600);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#004a61';
        ctx.fillRect(0, 0, 400, 600);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('KAMOLON OSH', 200, 50);
        ctx.fillText('STOL - ' + tableNum, 200, 110);

        // QR manzil endi /get-bill endpointiga boradi
        const qrUrl = "https://kamolon-backend.onrender.com/get-bill/" + tableNum;
        const qrImageBuffer = await QRCode.toDataURL(qrUrl);
        const qrImage = await loadImage(qrImageBuffer);

        ctx.drawImage(qrImage, 50, 150, 300, 300);
        ctx.fillText('HISOBNI KO\'RISH', 200, 530);

        const buffer = canvas.toBuffer('image/png');
        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (err) {
        res.status(500).send("Generator xatosi");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('Server ishga tushdi: ' + PORT);
});
