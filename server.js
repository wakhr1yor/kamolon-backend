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
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');

// QR generator endpoint
app.get('/generate-qr', async (req, res) => {
    try {
        const { tableNum } = req.query;
        if (!tableNum) return res.send("Stol raqamini yozing. Masalan: ?tableNum=5");

        const canvas = createCanvas(400, 600);
        const ctx = canvas.getContext('2d');

        // Orqa fon (Ko'k gradient)
        ctx.fillStyle = '#004a61';
        ctx.fillRect(0, 0, 400, 600);

        // Oq ramka
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`KAMOLON OSH`, 200, 50);
        ctx.fillText(`STOL - ${tableNum}`, 200, 110);

        // QR kod yaratish
        const qrUrl = https://kamolon-osh.uz/order?table=${tableNum};
        const qrImageBuffer = await QRCode.toDataURL(qrUrl);
        const qrImage = await loadImage(qrImageBuffer);

        // QR kodni rasmga chizish
        ctx.drawImage(qrImage, 50, 150, 300, 300);

        // Pastki yozuv
        ctx.font = 'bold 25px Arial';
        ctx.fillText('HISOB SHU YERDA', 200, 530);

        const buffer = canvas.toBuffer('image/png');
        res.set('Content-Type', 'image/png');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).send("Generator xatosi");
    }
});
app.listen(PORT, () => {
    console.log(`Server ishga tushdi: ${PORT}`);
});
