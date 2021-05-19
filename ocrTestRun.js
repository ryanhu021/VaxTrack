const cardOCR = require('./scripts/cardOCR');
cardOCR.scanVaccineCard('./cards/evan.jpg').then((result) => console.log(result));