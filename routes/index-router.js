const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		res.render('index', { user: req.user, auth: req.isAuthenticated() });
	} else {
		res.render('index', { user: null, auth: req.isAuthenticated() });
	}
});

module.exports = router;
