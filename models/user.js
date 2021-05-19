const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	group: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
	},
	role: {
		type: String,
		required: true
	},
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	vaccineType: {
		type: String
	},
	doses: {
		type: Number
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	vaccineCard: {
		type: String
	},
	needReview: {
		type: Boolean,
		default: false
	}
});

module.exports = mongoose.model('User', userSchema);
