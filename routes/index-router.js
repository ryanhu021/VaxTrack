const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		res.render('index', { user: req.user, auth: true, supervisor: isSuper(req) });
	} else {
		res.render('index', { user: null, auth: false });
	}
});

// check if user is supervisor or owner
function isSuper(req) {
	return ['supervisor', 'owner'].includes(req.user.role);
}

module.exports = router;
