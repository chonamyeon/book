import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5173;

// build_output 폴더를 static으로 제공
app.use(express.static(path.join(__dirname, '../build_output')));

// SPA 지원: 모든 알 수 없는 경로는 index.html로
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../build_output/index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Production build is being served on http://0.0.0.0:${port}`);
});
