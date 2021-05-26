const express = require('express');
const router = express.Router();
const generator = require('generate-password');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const User = require('../models/user');
const Group = require('../models/group');
const upload = multer({
	dest: path.join('public', 'uploads', 'csv'),
	fileFilter: (req, file, callback) => {
		callback(null, file.mimetype === 'application/vnd.ms-excel');
	}
});

// setup nodemailer
const transporter = nodemailer.createTransport({
	service: process.env.EMAIL_SERVICE,
	auth: {
		user: process.env.EMAIL_USERNAME,
		pass: process.env.EMAIL_PASSWORD
	}
});

// email regex
const re = /^[a-zA-Z0-9.!#$%&'+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:.[a-zA-Z0-9-]+)$/;

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

// import csv
router.post(
	'/import',
	checkSuperAuthenticated,
	upload.single('import'),
	(req, res) => {
		if (req.file != null) {
			const readInterface = readline.createInterface({
				input: fs.createReadStream(req.file.path),
				console: false
			});

			readInterface.on('line', async (line) => {
				let columns = line.split(',');
				if (
					columns.length === 3 &&
					re.test(columns[2].trim()) &&
					//check if email exists
					(await User.findOne({ email: columns[2].trim() })) == null
				) {
					let user = new User();
					let pw = await generatePassword();
					let group = await Group.findOne({ _id: req.user.group });
					user.firstName = columns[0].trim();
					user.lastName = columns[1].trim();
					user.email = columns[2].trim();
					user.password = pw[0];
					user.group = req.user.group;
					user.role = 'user';

					try {
						user = await user.save();

						let mailOptions = {
							from: process.env.EMAIL_USERNAME,
							to: user.email,
							subject: `IMPORTANT - ${group.name} - Invitation to VaxTrack`,
							text: `Dear ${user.firstName} ${user.lastName},

Your employer has invited you to VaxTrack. From here, you can upload a picture of your vaccination card and automatically verify your vaccination status. Please use your email and the password listed below to access your account to begin.

It is important to keep this email’s login information for future use. Consider flagging or starring it, so you don’t lose track of your login information.

${req.user.firstName} ${req.user.lastName} is inviting you to VaxTrack.

Login Website: ${process.env.URL}
Email: ${user.email}
Password: ${pw[1]}

If you run into any problems, please reply to this email with any questions.`
						};

						transporter.sendMail(
							mailOptions,
							function (error, info) {
								if (error) {
									console.log(error);
								} else {
									console.log('Email sent: ' + info.response);
								}
							}
						);
					} catch (e) {
						console.log(e);
					}
				}
			});
			fs.unlinkSync(req.file.path);
		}
		res.redirect('/group/manage');
	}
);

// export csv
router.get('/export', checkSuperAuthenticated, async (req, res) => {
	try {
		const users = await User.find({ group: req.user.group }).sort({
			lastName: 'asc'
		});
		let csv =
			'First Name,Last Name,Email Address,Vaccination Status,Vaccine Type,Doses,Date Updated\n';
		users.forEach((user) => {
			csv +=
				user.firstName + ',' + user.lastName + ',' + user.email + ',';
			if (user.vaccineStatus === 1) {
				csv += 'Partially Vaccinated';
			} else if (user.vaccineStatus === 2) {
				csv += 'Fully Vaccinated';
			} else {
				csv += 'Not Vaccinated';
			}
			csv +=
				',' +
				user.vaccineType +
				',' +
				user.doses +
				',' +
				user.dateUpdated.toLocaleDateString() +
				'\n';
		});
		res.status(200);
		res.setHeader('Content-Type', 'text/csv');
		res.attachment('users.csv').send(csv);
	} catch (e) {
		res.status(500);
		res.send(e);
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
