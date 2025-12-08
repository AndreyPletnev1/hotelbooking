// --- ДАННЫЕ О НОМЕРАХ ---
const roomsData = [
    { 
        id: 1, 
        title: "Уютный Стандарт", 
        type: "standard", 
        price: 3500, 
        img: "img/room-1.avif", 
        desc: "Отличный выбор для одного гостя. Тишина и комфорт." 
    },
    { 
        id: 2, 
        title: "Семейный Люкс", 
        type: "family", 
        price: 7000, 
        img: "img/room-2.avif", 
        desc: "Просторный номер с зоной отдыха для всей семьи." 
    },
    { 
        id: 3, 
        title: "Президентский Люкс", 
        type: "luxe", 
        price: 15000, 
        img: "img/room-3.avif", 
        desc: "Роскошь высшего класса, панорамный вид и джакузи." 
    },
    { 
        id: 4, 
        title: "Двухместный Стандарт", 
        type: "standard", 
        price: 4500, 
        img: "img/room-4.avif", 
        desc: "Две удобные кровати, рабочий стол и вид на город." 
    }
];

// АДРЕС ТВОЕГО ЗАПУЩЕННОГО СЕРВЕРА
const SERVER_URL = 'http://localhost:3000'; 
const CURRENT_USER_KEY = 'hotel_current_user';

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupModal();

    // Если мы на главной
    if (document.getElementById('roomsContainer')) {
        renderRooms(roomsData);
    }
    
    // Если в личном кабинете
    if (document.getElementById('myBookingsList')) {
        checkProfileAccess();
        loadUserBookings();
    }
    
    // Если в админке
    if (document.getElementById('logsTableBody')) {
        checkAdminAccess();
        loadAllBookingsAdmin();
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// --- API ЗАПРОСЫ К СЕРВЕРУ ---

async function login(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            // Сохраняем "сессию" в браузере, чтобы не вылетало при обновлении
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            checkAuth();
            alert('Добро пожаловать!');
            if (user.role === 'admin') window.location.href = 'admin.html';
        } else {
            alert('Неверный логин или пароль');
        }
    } catch (e) {
        console.error(e);
        alert('Ошибка соединения с сервером (Node.js не запущен?)');
    }
}

async function register(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            alert('Регистрация успешна! Теперь войдите.');
        } else {
            const data = await response.json();
            alert(data.message || 'Ошибка регистрации');
        }
    } catch (e) {
        alert('Ошибка сервера');
    }
}

async function bookRoom(id, title, price) {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    if (!user) {
        alert('Для бронирования необходимо войти!');
        document.getElementById('authModal').style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user.username,
                roomTitle: title,
                price: price,
                date: new Date().toLocaleDateString()
            })
        });
        
        if(response.ok) alert('Успешно забронировано!');
        else alert('Ошибка при бронировании');
    } catch (e) {
        alert('Ошибка сервера');
    }
}

async function loadUserBookings() {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    const list = document.getElementById('myBookingsList');
    
    try {
        // Запрашиваем ВСЕ брони с сервера
        const response = await fetch(`${SERVER_URL}/bookings`);
        const allBookings = await response.json();
        
        // Фильтруем (показываем только мои)
        const myBookings = allBookings.filter(b => b.username === user.username);

        if (myBookings.length === 0) {
            list.innerHTML = '<p>У вас пока нет активных бронирований.</p>';
        } else {
            list.innerHTML = myBookings.map(b => `
                <div class="booking-item">
                    <div>
                        <strong>${b.room_title}</strong><br>
                        <small>${b.date} — ${b.price} ₽</small>
                    </div>
                    <button class="cancel-btn" onclick="cancelBooking(${b.id})">Отменить</button>
                </div>
            `).join('');
        }
    } catch (e) {
        list.innerHTML = '<p>Ошибка загрузки данных с сервера.</p>';
    }
}

async function cancelBooking(id) {
    if(!confirm('Отменить бронирование?')) return;
    try {
        await fetch(`${SERVER_URL}/bookings/${id}`, { method: 'DELETE' });
        loadUserBookings(); // Обновляем список
    } catch(e) { alert('Ошибка удаления'); }
}

// --- ИНТЕРФЕЙСНЫЕ ФУНКЦИИ ---

function renderRooms(rooms) {
    const container = document.getElementById('roomsContainer');
    if (!container) return;
    container.innerHTML = '';

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `
            <img src="${room.img}" alt="${room.title}" class="room-img">
            <div class="room-info">
                <h3>${room.title}</h3>
                <p>${room.desc}</p>
                <div class="room-price">${room.price} ₽ / ночь</div>
                <button onclick="bookRoom(${room.id}, '${room.title}', ${room.price})">Забронировать</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function applyFilters() {
    const priceInput = document.getElementById('priceFilter').value;
    const typeSelect = document.getElementById('typeFilter').value;

    const filteredRooms = roomsData.filter(room => {
        const matchesPrice = priceInput ? room.price <= priceInput : true;
        const matchesType = typeSelect === 'all' ? true : room.type === typeSelect;
        return matchesPrice && matchesType;
    });

    renderRooms(filteredRooms);
}

function setupModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    const form = document.getElementById('authForm');
    const toggleP = document.getElementById('toggleAuth');
    const authBtn = document.getElementById('authBtn');
    const closeSpan = document.getElementsByClassName('close')[0];
    
    let isLoginMode = true;

    function updateView() {
        document.getElementById('modalTitle').innerText = isLoginMode ? "Вход" : "Регистрация";
        document.getElementById('modalSubmitBtn').innerText = isLoginMode ? "Войти" : "Зарегистрироваться";
        toggleP.innerHTML = isLoginMode 
            ? 'Нет аккаунта? <a href="#" id="swLink">Зарегистрироваться</a>' 
            : 'Уже есть аккаунт? <a href="#" id="swLink">Войти</a>';
            
        document.getElementById('swLink').onclick = (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            updateView();
        };
    }

    if(toggleP) updateView();

    if (authBtn) {
        authBtn.onclick = (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
            if(user) {
                logout();
            } else {
                modal.style.display = 'block';
                isLoginMode = true;
                updateView();
            }
        };
    }
    
    if(closeSpan) closeSpan.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            
            if (isLoginMode) login(u, p);
            else register(u, p);
            
            modal.style.display = 'none';
            form.reset();
        };
    }
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
}

function checkAuth() {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    const btn = document.getElementById('authBtn');
    const link = document.getElementById('profileLink');
    const adminLink = document.getElementById('adminLink');
    const userInfo = document.getElementById('userInfo');

    if(user) {
        if(btn) btn.innerText = "Выйти";
        if(link) link.style.display = 'block';
        if(userInfo) { userInfo.style.display = 'block'; userInfo.innerText = user.username; }
        if(adminLink && user.role === 'admin') adminLink.style.display = 'block';
    } else {
        if(btn) btn.innerText = "Войти";
        if(link) link.style.display = 'none';
        if(userInfo) userInfo.style.display = 'none';
        if(adminLink) adminLink.style.display = 'none';
    }
}

function checkProfileAccess() {
    if(!localStorage.getItem(CURRENT_USER_KEY)) window.location.href = 'index.html';
}

function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    if(!user || user.role !== 'admin') window.location.href = 'index.html';
}

// Загрузка всех броней для админки
async function loadAllBookingsAdmin() {
    const tbody = document.getElementById('logsTableBody');
    try {
        const res = await fetch(`${SERVER_URL}/bookings`);
        const data = await res.json();
        tbody.innerHTML = data.map(b => `
            <tr>
                <td>${b.date}</td>
                <td>${b.username}</td>
                <td>Забронировал: ${b.room_title} (${b.price}₽)</td>
            </tr>
        `).join('');
    } catch(e) {
        console.error(e);
    }
}
function clearLogs() { alert('В базе данных удалять логи нельзя через эту кнопку (для безопасности).'); }