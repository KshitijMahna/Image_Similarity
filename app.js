
// Importing Packages
const express = require('express');
const mongoose = require('mongoose');
const path = require('path')
const upload = require('express-fileupload');
const Images = require('./modules/images');
const imghash = require('imghash');
const leven = require('leven');
const { response } = require('express');
require('dotenv/config')


// Creating our express app
const app = express();


// Register View Engine
app.set('view engine', 'ejs');


// Static Directory for Images
app.use(express.static(path.join(__dirname, 'public')))


// Connect to MongoDB
mongoose.connect(process.env.DB_CONNECTION, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
    console.log('Connected to DB');
    // Start Listening to server requests once connected to DB
    app.listen(3000);
});


// Request HOME Page
app.get('/', (req, res) => {
    res.render('index');
});


// Express File-Upload Middleware
app.use(upload());


// Handling the Upload Request
app.use('/', (req, res, next) => {
    if (req.files) {
        let file = req.files.myImage;
        let upload_filename = Date.now().toString() + '.jpg';
        file.mv('./public/uploads/' + upload_filename, (err) => {
            if (err) {
                res.send(err);
            } else {
                console.log(`File ${upload_filename} Uploaded Successfully!`);
                req.filename = upload_filename;
                next();
            }
        });
    }
    else{
        res.render("index", {msg: "No file selected!!"})
    }
});


// Computing the filehash
app.use('/', (req, res, next) => {
    let file_location = path.join(__dirname, 'public', 'uploads', req.filename);
    console.log(file_location);
    imghash
    .hash(file_location)
    .then((hash) => {
        req.inputImageHash = hash;
        req.inputFileName = path.basename(file_location);
        next();
    })
    .catch((err) => console.log(err.message));
});


// Getting the Similar Images from DB
app.use('/', (req, res, next) => {
    // Search for all images in the DB
    Images.find()
    .then((results) => {
        let matchedFiles = [];
        let duplicateFlag = false;

        // Iterate over the results found in DB
        for (i in results) {
            // Check if hash is already present in DB
            if (results[i].hash_value == req.inputImageHash) {
                duplicateFlag = true;
            }
            // Check for levenshtein distance to get the closest matches from DB
            if (leven(results[i].hash_value, req.inputImageHash) < 13) {
                matchedFiles.push({ filename: results[i].filename, similarity: leven(results[i].hash_value, req.inputImageHash) });
            }
        }

        // Matched Filenames
        req.matchedFiles = matchedFiles;
        
        // Dont add to DB in case of duplicate hash
        if (duplicateFlag) {
            console.log("Duplicate Image Uploaded");
            next();
        }
        else {
            // Save the input image to DB (After matching from DB)
            // Create an instance of image object to be stored in MongoDB
            const image = new Images({
                filename: req.inputFileName,
                hash_value: req.inputImageHash
            });
            image.save()
            .then((result) => {
                console.log(result);
            })
            .catch((err) => console.log(err));
            next();
        }
    });
});


// Finally rendering the images
app.post('/', (req, res) => {
    console.log(req.matchedFiles);
    res.render('results', {results: req.matchedFiles});
});