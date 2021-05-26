// environmental variables
if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

// imports
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const User = require('./models/user');

// routers
const indexRouter = require('./routes/index-router');
const groupRouter = require('./routes/group-router');
const userRouter = require('./routes/user-router');

const users = [];

// setup ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');

// setup express
app.use(expressLayouts);
app.use(express.static('public'));
app.use(express.urlencoded({ limit: '10mb', extended: false }));

// setup mongoose
mongoose.connect(process.env.DATABASE_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Mongoose'));

// setup passport
const initializePassport = require('./scripts/passport-config');
initializePassport(
	passport,
	async (email) => await User.findOne({ email: email }),
	async (id) => await User.findById(id)
);
app.use(flash());
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());

// setup method override
app.use(methodOverride('_method'));

// connect routers
app.use('/', indexRouter);
app.use('/group', groupRouter);
app.use('/user', userRouter);

// start
app.listen(process.env.PORT || 3000);
