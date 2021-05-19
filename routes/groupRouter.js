const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.redirect('/');
});

router.get('/new', (req, res) => {
	res.render('group/new');
});

module.exports = router;
