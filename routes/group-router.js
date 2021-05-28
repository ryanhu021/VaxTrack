const express = require('express');
const router = express.Router();
const generator = require('generate-password');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Group = require('../models/group');

// root route
router.get('/', (req, res) => {
	res.redirect('/');
});

// new group
router.get('/new', checkNotAuthenticated, (req, res) => {
	res.render('group/new', {
		group: new Group(),
		user: new User(),
		auth: false
	});
});

// create group
router.post('/new', checkNotAuthenticated, async (req, res) => {
	const group = new Group({
		name: req.body.groupName
	});
	const user = new User({
		group: group,
		role: 'owner',
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email
	});
	let messages = {
		error: 'Error creating group'
	};
	try {
		if ((await User.findOne({ email: user.email })) != null) {
			messages.error = 'Email already exists';
			throw messages.error;
		}
		const hashedPassword = await bcrypt.hash(req.body.password, 10);
		user.password = hashedPassword;
		await group.save();
		await user.save();
		res.render('user/login', { auth: false });
	} catch (e) {
		console.log(e);
		res.render('group/new', {
			group: group,
			user: user,
			messages: messages,
			auth: false
		});
	}
});

// manage group
router.get('/manage', checkSuperAuthenticated, async (req, res) => {
	let users;
	try {
		switch (req.query.sort) {
			case 'email':
				users = await User.find({ group: req.user.group }).sort({
					needReview: 'desc',
					email: 'asc'
				});
				break;
			case 'status':
				users = await User.find({ group: req.user.group }).sort({
					needReview: 'desc',
					vaccineStatus: 'asc'
				});
				break;
			case 'date':
				users = await User.find({ group: req.user.group }).sort({
					needReview: 'desc',
					dateUpdated: 'desc'
				});
				break;
			case 'role':
				users = await User.find({ group: req.user.group }).sort({
					needReview: 'desc',
					role: 'asc'
				});
				break;
			default:
				users = await User.find({ group: req.user.group }).sort({
					needReview: 'desc',
					lastName: 'asc'
				});
		}
	} catch {
		users = [];
	}
	let counts = {
		members: 0,
		fullVax: 0,
		partVax: 0,
		notVax: 0,
		needReview: 0
	};
	users.forEach((user) => {
		counts.members++;
		switch (user.vaccineStatus) {
			case 2:
				counts.fullVax++;
				break;
			case 1:
				counts.partVax++;
				break;
			default:
				counts.notVax++;
		}
		if (user.needReview) {
			counts.needReview++;
		}
	});
	let group;
	try {
		group = await Group.findOne({ _id: req.user.group });
		res.render('group/manage', {
			users: users,
			group: group,
			role: req.user.role,
			auth: true,
			supervisor: true,
			counts: counts
		});
	} catch {
		res.redirect('/');
	}
});

// check if user is supervisor or owner
function checkSuperAuthenticated(req, res, next) {
	if (
		req.isAuthenticated() &&
		['supervisor', 'owner'].includes(req.user.role)
	) {
		return next();
	}

	res.redirect('/user/login');
}

// check if user is not logged in
function checkNotAuthenticated(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}

	res.redirect('/');
}

// generate password
async function generatePassword() {
	let password = generator.generate({ length: 12, numbers: true });
	return [await bcrypt.hash(password, 10), password];
}

module.exports = router;
