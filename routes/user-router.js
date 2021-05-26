if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const express = require('express');
const router = express.Router();
const passport = require('passport');
const generator = require('generate-password');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const cardOCR = require('../scripts/card-ocr');
const User = require('../models/user');
const Group = require('../models/group');

// image file types
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

// setup nodemailer
const transporter = nodemailer.createTransport({
	service: process.env.EMAIL_SERVICE,
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD
	}
});

// temp references
let currPassword = '';
let currGroup;

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
		let pw = await generatePassword();
		currPassword = pw[1];
		req.newUser = new User({
			group: req.user.group,
			password: pw[0]
		});

		let group = await Group.findOne({ _id: req.user.group });
		group.members++;
		currGroup = group;
		await group.save();

		next();
	},
	saveUserAndRedirect('new')
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
	saveUserAndRedirect('edit')
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
	res.redirect('/group/manage');
});

// log out action
router.delete('/', checkAuthenticated, (req, res) => {
	req.logOut();
	res.redirect('/user/login');
});

// view personal status page
router.get('/view', checkAuthenticated, (req, res) => {
	res.render('user/view', {
		user: req.user,
		auth: true,
		supervisor: isSuper(req)
	});
});

// update status page
router.get('/update', checkAuthenticated, (req, res) => {
	res.render('user/update', {
		user: req.user,
		auth: true,
		supervisor: isSuper(req)
	});
});

// update status action
router.put('/update/confirm', checkAuthenticated, async (req, res) => {
	let user = req.user;
	try {
		saveVaccineCard(user, req.body.vaccineCard);
	} catch {
		res.render('user/update', {
			user: user,
			auth: true,
			supervisor: isSuper(req),
			messages: {
				error: 'Invalid file type. File must be an image'
			}
		});
		return;
	}
	const request = {
		image: {
			content: user.vaccineCard
		}
	};
	try {
		const result = await cardOCR.scanVaccineCard(request);
		if (result === false) {
			res.render('user/update', {
				user: user,
				auth: true,
				supervisor: isSuper(req),
				messages: {
					error: 'Error reading vaccine card. Please reupload'
				}
			});
			return;
		}

		// check if names match
		if (
			!result.firstName
				.toLowerCase()
				.includes(user.firstName.toLowerCase()) ||
			!result.lastName.toLowerCase().includes(user.lastName.toLowerCase())
		) {
			res.render('user/update', {
				user: user,
				auth: true,
				supervisor: isSuper(req),
				messages: {
					error: 'Names do not match'
				}
			});
			return;
		}
		user.vaccineType = result.vaccineType;
		user.doses = Math.min(result.doses, 2);
		user.vaccineStatus = User.updateVaccineStatus(user);

		try {
			await user.save();
			res.render('user/confirm', {
				user: req.user,
				auth: true,
				supervisor: isSuper(req)
			});
		} catch (e) {
			console.log(e);
			res.render('user/update', {
				user: user,
				auth: true,
				supervisor: isSuper(req),
				messages: {
					error: 'Error updating status'
				}
			});
		}
	} catch (e) {
		console.log(e);
		res.render('user/update', {
			user: user,
			auth: true,
			supervisor: isSuper(req),
			messages: {
				error: 'Error reading vaccine card. Please reupload'
			}
		});
	}
});

// confirm status update action
router.post('/confirm', checkAuthenticated, async (req, res) => {
	let user = req.user;
	if (req.body.needReview != null) {
		user.needReview = true;
	} else {
		user.needReview = false;
	}
	await user.save();
	res.redirect('/');
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

// check if user is logged in
function checkAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
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

// check if user is supervisor or owner
function isSuper(req) {
	return ['supervisor', 'owner'].includes(req.user.role);
}

// save user
function saveUserAndRedirect(func) {
	return async (req, res) => {
		let user = req.newUser;
		let oldEmail = user.email;
		user.firstName = req.body.firstName;
		user.lastName = req.body.lastName;
		user.email = req.body.email;
		user.role = req.body.role;
		user.vaccineType = req.body.vaccineType;
		user.doses = req.body.doses;
		user.vaccineStatus = User.updateVaccineStatus(user);
		if (req.body.needReview != null) {
			user.needReview = true;
		} else {
			user.needReview = false;
		}

		// check if email already exists
		if (oldEmail !== user.email && (await User.findOne({ email: user.email })) != null) {
			res.render(`user/${func}`, {
				user: user,
				group: await Group.findOne({ _id: req.user.group }),
				auth: true,
				supervisor: true,
				messages: {
					error: 'Email already exists'
				}
			});
			return;
		}

		try {
			user = await user.save();

			// send password email
			if (func === 'new') {
				let mailOptions = {
					from: process.env.EMAIL_USERNAME,
					to: user.email,
					subject: `IMPORTANT - ${currGroup.name} - Invitation to VaxTrack`,
					text: `Dear ${user.firstName} ${user.lastName},

Your employer has invited you to VaxTrack. From here, you can upload a picture of your vaccination card and automatically verify your vaccination status. Please use your email and the password listed below to access your account to begin.

It is important to keep this email’s login information for future use. Consider flagging or starring it, so you don’t lose track of your login information.

${req.user.firstName} ${req.user.lastName} is inviting you to VaxTrack.

Login Website: ${process.env.URL}
Email: ${user.email}
Password: ${currPassword}

If you run into any problems, please reply to this email with any questions.`
				};
				currPassword = '';

				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
			}

			res.redirect('/group/manage');
		} catch (e) {
			console.log(e);
			res.render(`user/${func}`, {
				user: user,
				group: await Group.findOne({ _id: req.user.group }),
				auth: true,
				supervisor: true
			});
		}
	};
}

// save vaccine card
function saveVaccineCard(user, cardEncoded) {
	if (cardEncoded == null) return;
	const card = JSON.parse(cardEncoded);
	if (card != null && imageMimeTypes.includes(card.type)) {
		user.vaccineCard = new Buffer.from(card.data, 'base64');
		user.vaccineCardType = card.type;
	} else {
		throw 'Invalid file type';
	}
}

// generate password
async function generatePassword() {
	let password = generator.generate({ length: 12, numbers: true });
	return [await bcrypt.hash(password, 10), password];
}

module.exports = router;
