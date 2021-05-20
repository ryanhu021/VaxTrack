const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Group = require('../models/group');

// root route
router.get('/', (req, res) => {
	res.redirect('/');
});

// new group
router.get('/new', (req, res) => {
	res.render('group/new', { group: new Group(), user: new User() });
});

// create group
router.post('/new', async (req, res) => {
	const group = new Group({
		name: req.body.groupName
	});
	const user = new User({
		group: group,
		role: 'owner',
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
	});
	try {
		const hashedPassword = await bcrypt.hash(req.body.password, 10);
		user.password = hashedPassword;
		await group.save();
		await user.save();
		res.render('user/login');
	} catch (e) {
		console.log(e);
		res.render('group/new', { group: group, user: user });
	}
});

// manage group
router.get('/manage', (req, res) => {
	res.render('group/manage');
});

module.exports = router;
