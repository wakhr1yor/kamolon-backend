const express = require('express');
const axios = require('axios');
const cors = require('cors');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');

const app = express();
app.use(cors());
app.use(express.json());

// Muhit o'zgaruvchilari
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

// 2. STOL HISOBINI (СЧЕТ) OLISH ENDPOINTI
app.get('/get-bill/:tableNum', async (req, res) => {
    try {
        const tableNum = req.params.tableNum;
        const token = await getIikoToken();

        const response = await axios.post(
            'https://api-ru.iiko.services/api/1/orders/by_table',
            { organizationIds: [ORG_ID] },
            { headers: { Authorization: Bearer ${token} } }
        );

        // Ochiq buyurtmalar ichidan aynan shu stolni qidiramiz
        const tableOrder = response.data.orders.find(order => 
            order.tableIds && order.tableIds.includes(tableNum)
        );

        if (!tableOrder) {
            return res.send(`<h2>Stol №${tableNum}: Hozircha ochiq hisob topilmadi.</h2>`);
        }

        // Taomlar ro'yxatini shakllantirish (Backtick ishlatilgan)
        let itemsHtml = tableOrder.items.map(item => 
            <li>${item.name} x ${item.amount} = ${item.sum} so'm</li>
        ).join('');

        // Mijozga ko'rinadigan Elektron Chek (Backtick ishlatilgan)
        res.send(`
            <div style="font-family: sans-serif; padding: 20px; border: 2px dashed #000; max-width: 350px; margin: 40px auto; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h3 style="text-align: center; margin-bottom: 5px;">KAMOLON OSH</h3>
                <p style="text-align: center; margin-top: 0; font-size: 14px;">Elektron Hisob</p>
                <p><b>Stol raqami:</b> ${tableNum}</p>
                <hr style="border-top: 1px dashed #000;">
                <ul style="list-style: none; padding: 0; line-height: 1.6;">${itemsHtml}</ul>
                <hr style="border-top: 1px dashed #000;">
                <h4 style="text-align: right;">JAMI: ${tableOrder.totalSum} so'm</h4>
                <br>
                <p style="text-align: center; font-size: 12px; color: #666;">Xizmatingiz uchun rahmat!</p>
            </div>
        `);

    } catch (error) {
        console.error('Xatolik:', error.response ? error.response.data : error.message);
        res.status(500).send(`<h2>Xatolik: iiko API ruxsat bermadi yoki ulanishda xato bor.</h2>`);
    }
});

// 3. QR GENERATOR
app.get('/generate-qr', async (req, res) => {
    try {
        const tableNum = req.query.tableNum || "0";
        const canvas = createCanvas(400, 600);
        const ctx = canvas.getContext('2d');

        // Fon rangini chizish
        ctx.fillStyle = '#004a61';
        ctx.fillRect(0, 0, 400, 600);

        // Matnlarni chizish
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('KAMOLON OSH', 200, 50);
        ctx.fillText('STOL - ' + tableNum, 200, 110);

        // QR manzil (Backtick ishlatilgan)
        const qrUrl = https://kamolon-backend.onrender.com/get-bill/${tableNum};
        const qrImageBuffer = await QRCode.toDataURL(qrUrl);
        const qrImage = await loadImage(qrImageBuffer);

        ctx.drawImage(qrImage, 50, 150, 300, 300);
        ctx.fillText('HISOBNI KO\'RISH', 200, 530);

        const buffer = canvas.toBuffer('image/png');
        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send("QR Generator ishlamay qoldi");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`);
});
