const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	group: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
	},
	role: { // owner, supervisor, or user
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
	password: {
		type: String,
		required: true
	},
	vaccineType: { // pfizer, modern, or janssen
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
