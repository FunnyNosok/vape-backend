const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

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

app.listen(PORT, () => {
  console.log('Server started on port', PORT);
}); 