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
        
        // 1. Terminal guruhlarini olamiz (Boyagi rasmda chiqqan ma'lumot)
        const terminalResponse = await axios.post(
            'https://api-ru.iiko.services/api/1/terminal_groups',
            { organizationIds: [orgId] },
            { headers: { Authorization: 'Bearer ' + token } }
        );

        const terminalGroups = terminalResponse.data.terminalGroups;

        if (!terminalGroups || terminalGroups.length === 0) {
            return res.status(404).json({ error: "Terminal topilmadi" });
        }

        // 2. Terminal ID-sini avtomatik olamiz
        const terminalGroupId = terminalGroups[0].items[0].id;

        // 3. Muhim: Reserve endpointiga ruxsat bo'lmasa, terminal ma'lumotlarini o'zini qaytaramiz
        // Lekin biz baribir stollarni olishga urinib ko'ramiz (boshqa metod bilan)
        try {
            const layoutResponse = await axios.post(
                'https://api-ru.iiko.services/api/1/reserve/available_sections',
                { 
                    organizationIds: [orgId],
                    terminalGroupIds: [terminalGroupId]
                },
                { headers: { Authorization: 'Bearer ' + token } }
            );
            
            res.json({
                source: "Reserve API",
                terminalName: terminalGroups[0].items[0].name,
                sections: layoutResponse.data.sections
            });
        } catch (innerError) {
            // Agar baribir "Allowed emas" desa, terminal ma'lumotlarini beramiz
            res.json({
                source: "Terminal API (Fallback)",
                message: "Reserve API-ga ruxsat yo'q, lekin terminal bog'langan.",
                terminalInfo: terminalGroups[0].items[0]
            });
        }

    } catch (error) {
        res.status(500).json({ error: 'Xatolik', details: error.message });
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
