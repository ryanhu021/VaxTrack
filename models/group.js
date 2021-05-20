const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
    members: {
        type: Number,
        default: 1
    },
    fullVax: {
        type: Number,
        default: 0
    },
    partVax: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Group', groupSchema);
