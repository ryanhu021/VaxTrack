const cardOCR = require('./scripts/card-ocr');
cardOCR.scanVaccineCard('./cards/carter.jpg').then((result) => console.log(result));