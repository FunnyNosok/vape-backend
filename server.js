const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// --- Telegram Bot ---
const TELEGRAM_BOT_TOKEN = '8099602574:AAEZBBLDADQwXVAxovwHQSkx_KfiUqgDGg4';
const COURIERS_CHAT_ID = '-1002598612354';

app.use(cors());
app.use(express.json());

// Получить все товары
app.get('/api/products', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Ошибка чтения файла' });
    res.json(JSON.parse(data || '[]'));
  });
});

// Добавить товар
app.post('/api/products', (req, res) => {
  const product = req.body;
  if (!product.name || !product.price || !product.img) {
    return res.status(400).json({ error: 'Не все поля заполнены' });
  }
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    let products = [];
    if (!err && data) products = JSON.parse(data);
    product.id = Date.now();
    products.push(product);
    fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Ошибка записи файла' });
      res.json(product);
    });
  });
});

// Удалить товар
app.delete('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Ошибка чтения файла' });
    let products = JSON.parse(data || '[]');
    const newProducts = products.filter(p => p.id !== id);
    fs.writeFile(PRODUCTS_FILE, JSON.stringify(newProducts, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Ошибка записи файла' });
      res.json({ success: true });
    });
  });
});

// Получить заказы на дату и место или по user_tg
app.get('/api/orders', (req, res) => {
  const { date, place, user_tg } = req.query;
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = [];
    if (!err && data) orders = JSON.parse(data);
    if (date && place) {
      orders = orders.filter(o => o.date === date && o.place === place);
    } else if (user_tg) {
      orders = orders.filter(o => o.user_tg && o.user_tg.toLowerCase() === user_tg.toLowerCase());
    }
    res.json(orders);
  });
});

// Создать заказ
app.post('/api/orders', async (req, res) => {
  const order = req.body;
  if (!order.date || !order.time || !order.place || !order.user_tg) {
    return res.status(400).json({ error: 'Не все поля заполнены' });
  }
  fs.readFile(ORDERS_FILE, 'utf8', async (err, data) => {
    let orders = [];
    if (!err && data) orders = JSON.parse(data);
    // Проверка: только один заказ на место+дату+время
    const busy = orders.find(o => o.date === order.date && o.place === order.place && o.time === order.time);
    if (busy) return res.status(409).json({ error: 'Это время уже занято' });
    order.id = Date.now();
    order.courier_tg = null;
    orders.push(order);
    fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), async err2 => {
      if (err2) return res.status(500).json({ error: 'Ошибка записи файла' });
      // --- Отправка в Telegram ---
      try {
        console.log('Пробую отправить сообщение в Telegram...');
        const text = `🆕 Новый заказ!\nИмя: ${order.name}\nТелефон: ${order.phone}\nTelegram: ${order.user_tg}\nМесто: ${order.place}\nДата: ${order.date}\nВремя: ${order.time}\nТовары: ${(order.items||[]).map(i=>`${i.name} × ${i.qty}`).join(', ')}\nКомментарий: ${order.comment || '-'}`;
        const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: COURIERS_CHAT_ID, text })
        });
        const data = await resp.json();
        if (!data.ok) {
          console.error('Ошибка Telegram:', data);
        } else {
          console.log('Успешно отправлено в Telegram:', data);
        }
      } catch (e) {
        console.error('Ошибка Telegram:', e);
      }
      res.json({ success: true });
    });
  });
});

// Курьер берёт заказ
app.patch('/api/orders/:id/take', (req, res) => {
  const { id } = req.params;
  const { courier_tg } = req.body;
  if (!courier_tg) return res.status(400).json({ error: 'Не указан Telegram курьера' });
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = [];
    if (!err && data) orders = JSON.parse(data);
    const order = orders.find(o => o.id == id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.courier_tg) return res.status(409).json({ error: 'Order already taken' });
    order.courier_tg = courier_tg;
    fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), err2 => {
      if (err2) return res.status(500).json({ error: 'Ошибка записи файла' });
      res.json(order);
    });
  });
});

app.listen(PORT, () => {
  console.log('Server started on port', PORT);
}); 
