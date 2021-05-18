const cardOCR = require('./scripts/cardOCR');
cardOCR.scanVaccineCard('./cards/daniel.jpg').then((result) => console.log(result));
