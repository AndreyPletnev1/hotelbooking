const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Настройки БД (Ваши настройки)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Andrey13092005!@localhost:5432/hotelbook_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ЛОГИРОВАНИЯ ---
async function saveLog(username, action, details = '') {
    try {
        // Записываем время сервера (можно использовать NOW() в SQL, но так нагляднее)
        await pool.query(
            'INSERT INTO logs (username, action, details) VALUES ($1, $2, $3)', 
            [username, action, details]
        );
        console.log(`LOG: [${username}] - ${action} (${details})`);
    } catch (e) {
        console.error('Ошибка записи лога:', e);
    }
}

// --- API ---

// 1. Вход
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            // ЛОГ: Успешный вход
            await saveLog(username, 'Вход в систему', 'Авторизация успешна');
            res.json(result.rows[0]);
        } else {
            // ЛОГ: Неудачная попытка (опционально, можно не писать)
            await saveLog(username, 'Неудачный вход', 'Неверный пароль'); 
            res.status(401).json({ message: 'Неверные данные' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Регистрация
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ message: 'Логин занят' });

        await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, password, 'user']);
        
        // ЛОГ: Регистрация
        await saveLog(username, 'Регистрация', 'Создан новый аккаунт');
        
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
            
        // ЛОГ: Создание брони
        await saveLog(username, 'Бронирование', `Номер: ${roomTitle}, Сумма: ${price}`);
        
        res.json({ message: 'Ок' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Удалить бронь
app.delete('/bookings/:id', async (req, res) => {
    // В идеале нужно получать username того, кто удаляет, но пока возьмем 'System' или передадим через query
    // Для простоты, пока просто логируем ID.
    try {
        await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
        
        // ЛОГ: Отмена (здесь мы не знаем точно КТО удалил без токенов, запишем как Admin/User action)
        await saveLog('System/User', 'Удаление брони', `ID брони: ${req.params.id}`);
        
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Получить пользователей
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. НОВЫЙ МАРШРУТ: Получить логи (системный журнал)
app.get('/logs', async (req, res) => {
    try {
        // Выводим последние 100 действий
        const result = await pool.query("SELECT id, username, action, details, to_char(timestamp, 'DD.MM.YYYY HH24:MI:SS') as time FROM logs ORDER BY id DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});