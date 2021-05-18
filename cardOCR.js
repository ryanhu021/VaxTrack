if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
	keyFilename: process.env.KEY_FILENAME
});

const vaccineType = {
	PFIZER: 'pfizer',
	MODERNA: 'moderna',
	JANSSEN: 'janssen'
};

/**
 * Scans a COVID-19 vaccine card
 * @param {*} file the image path
 * @returns person object if successful, false if failed
 */
async function scanVaccineCard(file) {
	const result = await client.documentTextDetection(file);
	if (result[0] === undefined || result[0] === null || !result[0].fullTextAnnotation.pages) {
		return false;
	}
	const response = result[0];

	// label bounds and their parent paragraphs
	let lBounds, lParent, rBounds, rParent;
	// vaccine type and number of doses
	let type,
		doses = 0;
	// name references
	let firstName = {
		name: '',
		distance: 99999
	};
	let lastName = {
		name: '',
		distance: 99999
	};

	// find name labels and vaccine type
	response.fullTextAnnotation.pages.forEach((page) => {
		page.blocks.forEach((block) => {
			block.paragraphs.forEach((paragraph) => {
				paragraph.words.forEach((word) => {
					let wordText = '';
					word.symbols.forEach((symbol) => (wordText += symbol.text));
					switch (true) {
						case wordText.includes('Last'):
							lBounds = word.boundingBox;
							lParent = paragraph;
							break;
						case wordText.includes('First'):
							fBounds = word.boundingBox;
							fParent = paragraph;
							break;
						case wordText.toLowerCase().includes(vaccineType.PFIZER):
							type = vaccineType.PFIZER;
							doses++;
							break;
						case wordText.toLowerCase().includes(vaccineType.MODERNA):
							type = vaccineType.MODERNA;
							doses++;
							break;
						case wordText.toLowerCase().includes(vaccineType.JANSSEN):
							type = vaccineType.JANSSEN;
							doses++;
					}
				});
			});
		});
	});

	// if the first and last name labels could not be fonud
	if (lBounds === undefined && lParent === undefined && rBounds === undefined && rParent === undefined) {
		// comma name detection
		response.fullTextAnnotation.pages.forEach((page) => {
			page.blocks.forEach((block) => {
				block.paragraphs.forEach((paragraph) => {
					let paragraphText = '';
					paragraph.words.forEach((word) => {
						word.symbols.forEach((symbol) => (paragraphText += symbol.text));
						paragraphText += ' ';
					});

					if (paragraphText.includes(',')) {
						let commaSplit = paragraphText.split(',');

						// check if the number of words before the comma is less than 4
						// to ignore commas in other places
						if (commaSplit[0].trim().split(' ').length < 4) {
							let last = commaSplit[0].trim();
							let first = commaSplit[1].trim().split(' ')[0].trim();
							lastName.name = last;
							firstName.name = first;
						}
					}
				});
			});
		});
	} else {
		// minimum distance name detection
		response.fullTextAnnotation.pages.forEach((page) => {
			page.blocks.forEach((block) => {
				block.paragraphs.forEach((paragraph) => {
					let lDist = distance(lBounds.vertices[2], paragraph.boundingBox.vertices[3]);
					let fDist = distance(fBounds.vertices[2], paragraph.boundingBox.vertices[3]);

					if (lDist < lastName.distance && paragraph != lParent) {
						let paragraphText = '';
						paragraph.words.forEach((word) => {
							word.symbols.forEach((symbol) => (paragraphText += symbol.text));
							paragraphText += ' ';
						});
						lastName.name = paragraphText.trim();
						lastName.distance = lDist;
					}
					if (fDist < firstName.distance && paragraph != fParent) {
						let paragraphText = '';
						paragraph.words.forEach((word) => {
							word.symbols.forEach((symbol) => (paragraphText += symbol.text));
							paragraphText += ' ';
						});
						firstName.name = paragraphText.trim();
						firstName.distance = fDist;
					}
				});
			});
		});
	}

	let person = {
		firstName: capitalizeFirstLetter(firstName.name.replace(/[^a-zA-Z]/g, '').trim()),
		lastName: capitalizeFirstLetter(lastName.name.replace(/[^a-zA-Z]/g, '').trim()),
		vaccineType: type,
		doses: doses
	};
	return person;
}

function distance(p1, p2) {
	return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function capitalizeFirstLetter(name) {
	let result = '';
	name.split(' ').forEach((str) => {
		result += str.charAt(0).toUpperCase() + str.substring(1).toLowerCase() + ' ';
	});
	return result;
}

module.exports.scanVaccineCard = scanVaccineCard;
