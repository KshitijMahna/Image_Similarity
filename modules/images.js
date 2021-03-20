const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const imagesSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    hash_value: {
        type: String,
        required: true
    }

}, {
    timestamps: true
});

const Images = mongoose.model('Image', imagesSchema);
module.exports = Images