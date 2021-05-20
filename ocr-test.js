const cardOCR = require('./scripts/card-ocr');
cardOCR.scanVaccineCard('./cards/evan.jpg').then((result) => console.log(result));