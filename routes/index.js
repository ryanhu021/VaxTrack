const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.render('index');
});

router.get('/login', (req, res) => {
	res.render('login')
});

router.get('/create', (req, res) => {
	res.render('create');
});

module.exports = router;
