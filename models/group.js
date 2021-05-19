const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
    members: {
        type: Number,
        default: 1
    }
});

module.exports = mongoose.model('Group', groupSchema);
