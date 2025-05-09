const express = require('express');
const iconv = require('iconv-lite');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Lưu trữ tệp bằng multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    })
});

// Dummy database
let users = [];
let files = [];

// API: Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.json({ message: 'User registered successfully' });
});

// API: Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username }, 'secretkey', { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// API: Xóa tài khoản
app.delete('/api/deleteAccount/:username', (req, res) => {
    const username = req.params.username;
    const userIndex = users.findIndex((u) => u.username === username);
    if (userIndex !== -1) {
        // Xóa tất cả các file liên quan đến tài khoản
        const userFiles = files.filter((file) => file.username === username);
        userFiles.forEach(file => {
            const filePath = path.join(__dirname, '../uploads', file.filename);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                }
            });
        });

        // Xóa các file khỏi danh sách trong bộ nhớ
        files = files.filter((file) => file.username !== username); // Đây là nơi cần thay đổi từ const sang let

        // Xóa tài khoản
        users.splice(userIndex, 1);
        res.json({ message: 'Account and all associated files deleted successfully' });
    } else {
        res.status(404).json({ message: 'Account not found' });
    }
});

// API: Tải tệp lên
app.post('/api/upload', upload.single('file'), (req, res) => {
    const fileData = {
        username: req.body.username,
        filename: req.file.filename,
        path: req.file.path,
    };
    files.push(fileData);
    res.json({ message: 'File uploaded successfully', file: fileData });
});

// API: Lấy danh sách tệp
app.get('/api/files/:username', (req, res) => {
    const userFiles = files.filter((file) => file.username === req.params.username);
    res.json(userFiles);
});

// API: Tải tệp xuống
app.get('/api/download/:filename', (req, res) => {
    const file = files.find((f) => f.filename === req.params.filename);
    if (file) {
        res.download (path.resolve(file.path));
    } else {
        res.status(404).json({ message: 'File not found' });
    }
});

// API: Xóa file
app.delete('/api/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const fileIndex = files.findIndex((f) => f.filename === filename);

    if (fileIndex !== -1) {
        const filePath = path.join(__dirname, '../uploads', filename); // Đường dẫn đến file

        // Xóa file khỏi hệ thống
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                res.status(500).json({ message: 'Failed to delete file from the system' });
            } else {
                files.splice(fileIndex, 1); // Xóa file khỏi danh sách trong bộ nhớ
                res.json({ message: 'File deleted successfully' });
            }
        });
    } else {
        res.status(404).json({ message: 'File not found' });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));