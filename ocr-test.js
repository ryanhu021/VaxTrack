const cardOCR = require('./scripts/card-ocr');
cardOCR.scanVaccineCard('./cards/nathan.jpg').then((result) => console.log(result));