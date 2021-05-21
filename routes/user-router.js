const express = require('express');
const router = express.Router();
const passport = require('passport');
const generator = require('generate-password');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Group = require('../models/group');

// root route
router.get('/', (req, res) => {
	res.redirect('/');
});

// login page
router.get('/login', checkNotAuthenticated, (req, res) => {
	res.render('user/login', { auth: false });
});

// login
router.post(
	'/login',
	checkNotAuthenticated,
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/user/login',
		failureFlash: true
	})
);

// new user page
router.get('/new', checkSuperAuthenticated, async (req, res) => {
	res.render('user/new', { user: new User(), auth: true, supervisor: true });
});

// new user action
router.post(
	'/',
	checkSuperAuthenticated,
	async (req, res, next) => {
		req.newUser = new User({
			group: req.user.group,
			password: await generatePassword()
		});
		let group = await Group.findOne({ _id: req.user.group });
		group.members++;
		await group.save();
		next();
	},
	saveUserAndRedirect()
);

// edit user page
router.get('/edit/:id', checkSuperAuthenticated, async (req, res) => {
	const user = await User.findById(req.params.id);
	res.render('user/edit', { user: user, auth: true, supervisor: true });
});

// edit user action
router.put(
	'/:id',
	checkSuperAuthenticated,
	async (req, res, next) => {
		req.newUser = await User.findById(req.params.id);
		next();
	},
	saveUserAndRedirect()
);

// delete user page
router.get('/delete/:id', checkSuperAuthenticated, async (req, res) => {
	const user = await User.findById(req.params.id);
	res.render('user/delete', { user: user, auth: true, supervisor: true });
});

// delete user action
router.delete('/:id', checkSuperAuthenticated, async (req, res) => {
	await User.findByIdAndDelete(req.params.id);
	let group = await Group.findOne({ _id: req.user.group });
	group.members--;
	await group.save();
	res.redirect(`/group/manage`);
});

// log out action
router.delete('/', checkAuthenticated, (req, res) => {
	req.logOut();
	res.redirect('/user/login');
})

// check if user is supervisor or owner
function checkSuperAuthenticated(req, res, next) {
	if (req.isAuthenticated() && ['supervisor', 'owner'].includes(req.user.role)) {
		return next();
	}

	res.redirect('/user/login');
}

// check if user is logged in
function checkAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect('/');
}

// check if user is not logged in
function checkNotAuthenticated(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}

	res.redirect('/');
}

// save user
function saveUserAndRedirect() {
	return async (req, res) => {
		let user = req.newUser;
		user.firstName = req.body.firstName;
		user.lastName = req.body.lastName;
		user.email = req.body.email;
		user.role = req.body.role;
		(user.vaccineType = req.body.vaccineType), (user.doses = req.body.doses), (user.vaccineStatus = User.updateVaccineStatus(user));
		if (req.body.needReview != null) {
			user.needReview = true;
		} else {
			user.needReview = false;
		}
		try {
			user = await user.save();
			res.redirect(`/group/manage`);
		} catch (e) {
			console.log(e);
			res.render(`user/new`, { user: user, group: await Group.findOne({ _id: req.user.group }), auth: true, supervisor: true });
		}
	};
}

// generate password
async function generatePassword() {
	let password = generator.generate({ length: 12, numbers: true });
	console.log(password);
	return await bcrypt.hash(password, 10);
}

module.exports = router;
