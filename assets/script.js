var postsData = "";
var currentFilters = {
	categories: new Set(),
	wavesToFilterFor: 3
};

const postsContainer = document.querySelector("#posts-container");
const categoriesContainer = document.querySelector("#post-categories");
const postCount = document.querySelector("#post-count");
const noResults = document.querySelector("#no-results");
const baseWidth = 40;

var css = `img { width: ${baseWidth}px;}
    .imageWrapper { width: ${baseWidth}px; height: ${baseWidth}px; }
    .board {
    height: ${14 * baseWidth + 1}px;
    width: ${9 * baseWidth + 1}px;
    background-size: ${baseWidth}px ${baseWidth}px;
  }
  `,
	head = document.head || document.getElementsByTagName('head')[0],
	style = document.createElement('style');

head.appendChild(style);
style.appendChild(document.createTextNode(css));

fetch(
	"https://proleak.wilsonteng.com/assets/date_created.json"
).then(async (response) => {
	var date_utc = await response.json();
	var dateCreated = document.querySelector("#date-created");

	const link = document.createElement("a");
	link.setAttribute('href', `https://wilsonteng.com/`);
	link.textContent = 'Wilson Teng';

	dateCreated.innerText = `Data Last Collected On ${date_utc} by `;
	dateCreated.appendChild(link);
});


fetch(
	"https://proleak.wilsonteng.com/assets/unit_dictionary.json"
).then(async (response) => {
	unitDictionary = await response.json();
	fetch(
		"https://proleak.wilsonteng.com/assets/data.json"
	).then(async (response) => {
		postsData = await response.json();
		
		categoriesData = new Set();

		postsData.forEach((buildData) => {
			buildData.buildPerWave.forEach((totalBuildArray) => {
				totalBuildArray.forEach((unit) => {
					categoriesData.add(unit.split(":")[0])
				});
			});
		});

		categoriesData = Array.from(categoriesData)

		createClearButton();
		categoriesData.map((category) => createFilter("categories", category, categoriesContainer));
		createSlider(categoriesContainer);
		refreshPosts();
	});
});

const createPost = (postData) => {
	const {
		game_id,
		version,
		date,
		queueType,
		playerName,
		legion,
		buildPerWave,
		mercenariesReceivedPerWave,
		leaksPerWave,
		leakPercentages
	} = postData;

	const row = document.createElement("div");
	row.className = "row";
	row.innerHTML = `
      <h3>Game ID: ${game_id}</h3>
      <p>${playerName} // ${queueType} // ${legion} // ${date} // Version ${version} </p>
  `;

	var totalAverageLeak = Math.round(leakPercentages.reduce((a, b) => a + b, 0) / leakPercentages.length);
	row.append(Object.assign(document.createElement('p'), {
		className: "leakpercent",
		innerHTML: `Total Average Leak: <span>${totalAverageLeak}%</span>`
	}));

	for (let waveNumber = 0; waveNumber < buildPerWave.length; waveNumber++) {
		let column = document.createElement("div");
		column.className = "column";
		let board = document.createElement("div");
		board.className = "board";

		for (var unit of buildPerWave[waveNumber]) {

			let [unitUrl, x, y, upgrades] = parse_unit_string_to_plot(unit);

			let imageWrapper = document.createElement("div");
			imageWrapper.className = "imageWrapper";
			let image = document.createElement("img");

			image.src = unitUrl;
			image.alt = unit;
			imageWrapper.style = `bottom:${y}px; left:${x}px;>`;
			imageWrapper.append(image);

			// append upgrade number if unit is any of these
			const upgradeableUnits = new Set(["nekomata", "infiltrator",
				"treant", "peewee", "veteran"
			]);

			if (upgradeableUnits.has(unit.split("_")[0])) {
				let upgradeText = document.createElement("span");
				upgradeText.innerText = upgrades;
				imageWrapper.append(upgradeText);
			}

			board.append(imageWrapper);

			column.append(board);
		}

		let columnText = document.createElement("div");
		columnText.className = "columnText";
		columnText.append(Object.assign(document.createElement('p'), {
			className: "leakpercent",
			innerHTML: `Wave ${waveNumber + 1}: <span>${leakPercentages[waveNumber]}%</span>`
		}));


		let sends = document.createElement("div");
		sends.className = "sends";
		sends.append(Object.assign(document.createElement('p'), {
			innerHTML: "Sends Received:"
		}));
		for (var send of mercenariesReceivedPerWave[waveNumber]) {
			let sendImage = get_unit_image(send);
			sends.append(Object.assign(document.createElement('img'), {
				alt: send,
				src: sendImage
			}));
		}
		columnText.append(sends);

		let leaks = document.createElement("div");
		leaks.className = "leaks";
		leaks.append(Object.assign(document.createElement('p'), {
			innerHTML: "Leaks:"
		}));
		for (var leak of leaksPerWave[waveNumber]) {
			let leakImageSrc = get_unit_image(leak);
			leaks.append(Object.assign(document.createElement('img'), {
				alt: leak,
				src: leakImageSrc
			}));
		}
		columnText.append(leaks);
		column.append(columnText);

		row.append(column);

	}

	postsContainer.append(row);
};

const createClearButton = () => {
	const filterButton = document.createElement("button");
	filterButton.className = "all filter-button";
	filterButton.innerText = "Clear";
	filterButton.setAttribute("data-state", "inactive");
	filterButton.addEventListener("click", (e) =>
		clearFilters()
	);

	categoriesContainer.append(filterButton);
};

const createFilter = (key, param, container) => {
	const filterButton = document.createElement("img");

	filterButton.src = get_unit_image(param);
	filterButton.alt = param;

	filterButton.className = "filter-button";
	filterButton.setAttribute("data-state", "inactive");
	filterButton.addEventListener("click", (e) =>
		handleButtonClick(e, key, param, container)
	);

	container.append(filterButton);
};

const handleButtonClick = (e, key, param, container) => {

	const button = e.target;
	const buttonState = button.getAttribute("data-state");
	if (buttonState == "inactive") {
		button.classList.add("is-active");
		button.setAttribute("data-state", "active");
		currentFilters[key].add(param);
	} else {
		button.classList.remove("is-active");
		button.setAttribute("data-state", "inactive");
		currentFilters[key].delete(param);
	}
	refreshPosts();
};

const clearFilters = () => {
	// turn off all the buttons
	let allButtons = document.getElementById('post-categories').children;

	for (var button of allButtons) {
		if (button.getAttribute("data-state") == "active") {
			button.classList.remove("is-active");
			button.setAttribute("data-state", "inactive");
		}
	}

	// clear the keys and rebuild list
	currentFilters.categories.clear();
	refreshPosts();
};

const createSlider = (container) => {
	// Creates Slider Element which causes filters to only check up until specified wave number
	var sliderContainer = document.createElement("div");
	sliderContainer.className = "sliderContainer";

	var sliderValueText = document.createElement("p");
	sliderValueText.className = "sliderValueText";
	sliderContainer.append(sliderValueText);

	var slider = document.createElement("input");
	slider.setAttribute("type", "range");
	slider.setAttribute("min", 1);
	slider.setAttribute("max", 3);
	slider.setAttribute("id", "wavesToFilter");
	slider.setAttribute("value", 3);
	sliderValueText.innerHTML = `Waves to Check Filters For: ${slider.value}`;

	sliderContainer.append(slider);
	container.append(sliderContainer);

	slider.oninput = function() {
		sliderValueText.innerHTML = `Waves to Check Filters For: ${this.value}`;
		currentFilters.wavesToFilterFor = parseInt(this.value);
		refreshPosts();
	};

};

function checkFilter(post, wavesToCheck) {
	// have to write the logic for the new filters here

	// TO DO: has to check # of waves based on slider
	// Will have to use parse_build_array_to_set function and check filters against this set
	if (currentFilters.categories.size === 0) {
		return true;
	}

	// iterate across the array x # of times

	for (var i = 0; i < currentFilters.wavesToFilterFor; i++) {
		var waveBuildData = parse_build_array_to_set(post.buildPerWave[i])
		for (var filterUnit of currentFilters.categories) {
			if (waveBuildData.has(filterUnit)) {
				return true;
			}
		}
	}
	return false;

}

function refreshPosts() {

	const filteredPosts = [];
	postsData.map((post) => {
		if (checkFilter(post, 3)) {
			filteredPosts.push(post);
		}
	});

	postCount.innerText = filteredPosts.length;
	postsContainer.innerHTML = "";
	filteredPosts.map((post) => createPost(post));

	if (filteredPosts.length == 0) {
		noResults.innerText = "No results found with current search parameters.";
	} else {
		noResults.innerText = "";
	}
}

function get_unit_image(input) {
	// returns the image path of a unit from legiontd2's cdn

	let iconpath = unitDictionary[input].iconPath;
	let unit_image = `https://cdn.legiontd2.com/${iconpath}`;
	return unit_image;
}

function parse_unit_string_to_plot(input) {
	// Takes an input string and outputs unitName, x, y as tuple. Calculates positioning of units on grid

	let first = input.split(":");
	let unitName = first[0];
	let upgrades = first[2];
	let second = first[1].split("|");
	let x = second[0];
	let y = second[1];

	x = x * baseWidth - (baseWidth / 2);
	y = y * baseWidth - (baseWidth / 2);

	let unitUrl = get_unit_image(unitName);

	return [unitUrl, x, y, upgrades];
}

// need function that turns an array of units into a set of units with simple unit nmaes

function parse_build_array_to_set(input) {
	let newSet = new Set();

	for (var unit of input) {
		newSet.add(unit.split(":")[0]);
	}
	return newSet;
}

// need filter function to check ths set of units against the condition
// condition is inclusve or exclusive