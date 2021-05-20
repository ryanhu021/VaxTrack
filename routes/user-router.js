const express = require('express');
const router = express.Router();
const passport = require('passport');

 // root route
router.get('/', (req, res) => {
	if (req.isAuthenticated()) {
		console.log(req.user);
	}
	res.redirect('/');
});

// login page
router.get('/login', (req, res) => {
	res.render('user/login');
});

// login
router.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/user/login',
		failureFlash: true
	})
);

module.exports = router;
