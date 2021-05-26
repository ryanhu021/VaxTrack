const express = require('express');
const router = express.Router();
const faq = require('../faq');

// index page
router.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		res.render('index', {
			user: req.user,
			auth: true,
			supervisor: isSuper(req)
		});
	} else {
		res.render('index', { user: null, auth: false });
	}
});

// faq page
router.get('/faq', (req, res) => {
	if (req.isAuthenticated()) {
		res.render('faq', {
			auth: true,
			supervisor: isSuper(req),
			faq: faq
		});
	} else {
		res.render('faq', { auth: false, faq: faq });
	}
});

// check if user is supervisor or owner
function isSuper(req) {
	return ['supervisor', 'owner'].includes(req.user.role);
}

module.exports = router;
