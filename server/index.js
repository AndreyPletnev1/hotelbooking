const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Разрешаем браузеру обращаться к серверу
app.use(bodyParser.json());

// --- НАСТРОЙКИ ПОДКЛЮЧЕНИЯ (ИЗМЕНИ ПАРОЛЬ!) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Andrey13092005!@localhost:5432/hotelbook_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Проверка подключения при запуске
pool.connect((err) => {
    if (err) console.error('Ошибка подключения к БД:', err);
    else console.log('Успешное подключение к PostgreSQL!');
});

// --- API (МАРШРУТЫ) ---

// 1. Вход
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(401).json({ message: 'Неверные данные' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Регистрация
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Проверяем, есть ли такой юзер
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ message: 'Логин занят' });

        // Создаем
        await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, password, 'user']);
        res.json({ message: 'Успешно' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Получить все брони
app.get('/bookings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Добавить бронь
app.post('/bookings', async (req, res) => {
    const { username, roomTitle, price, date } = req.body;
    try {
        await pool.query('INSERT INTO bookings (username, room_title, price, date) VALUES ($1, $2, $3, $4)', 
            [username, roomTitle, price, date]);
        res.json({ message: 'Ок' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Удалить бронь
app.delete('/bookings/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Запуск
const PORT = process.env.PORT || 3000;
// 6. Получить всех пользователей (Только для админки)
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});