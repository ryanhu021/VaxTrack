// environmental variables
if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

// imports
const express = require('express');
const app = express();
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');

// routers
const indexRouter = require('./routes/index-router');
const groupRouter = require('./routes/group-router');
const userRouter = require('./routes/user-router');

// setup ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');

// setup express
app.use(expressLayouts);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// connect db
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Mongoose'));

// connect routers
app.use('/', indexRouter);
app.use('/group', groupRouter);
app.use('/user', userRouter);

// start
app.listen(process.env.PORT || 3000);
