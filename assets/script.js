var postsData = "";
var currentFilters = {
    categories: new Set(),
};

var wave_values = {
    1: 72,
    2: 84,
    3: 90
};

var unit_leak_dictionary = {
    "Crab": 6,
    "Wale": 7,
    "Hopper": 5,
    "Snail": 6,
    "Dragon Turtle": 12,
    "Lizard": 12,
    "Brute": 15,
    "Fiend": 18,
    "Hermit": 20,
    "Dino": 24
};

const postsContainer = document.querySelector("#posts-container");
const categoriesContainer = document.querySelector("#post-categories");
const postCount = document.querySelector("#post-count");
const noResults = document.querySelector("#no-results");
const baseWidth = 40;

var css = `img { width: ${baseWidth}px;}

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
    "https://proleak.wilsonteng.com/assets/date_utc.json"
).then(async (response) => {
    date_utc = await response.json();
    dateCreated = document.querySelector("#date-created");
    dateCreated.innerText = date_utc;
});


fetch(
    "https://proleak.wilsonteng.com/assets/unit_dictionary.json"
).then(async (response) => {
    unitDictionary = await response.json();
    fetch(
        "https://proleak.wilsonteng.com/assets/data.json"
    ).then(async (response) => {
        postsData = await response.json();

        categoriesData = [
            ...new Set(
                postsData
                .map((post) => post.categories)
                .reduce((acc, curVal) => acc.concat(curVal), [])
            )
        ];

        createClearButton();
        categoriesData.map((category) => createFilter("categories", category, categoriesContainer));

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
        categories
    } = postData;

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <h3>Game ID: ${game_id}</h3>
      <p>${playerName} // ${queueType} // ${legion} // ${date} // Version ${version} </p>
  `;

    leakPercentages = calculateLeakPercentage(leaksPerWave);
    totalAverageLeak = Math.round(leakPercentages.reduce((a, b) => a + b, 0) / leakPercentages.length);
    row.append(Object.assign(document.createElement('p'), {
        className: "leakpercent",
        innerHTML: `Total Average Leak: <span>${totalAverageLeak}%</span>`
    }));

    for (let waveNumber = 0; waveNumber < buildPerWave.length; waveNumber++) {
        column = document.createElement("div");
        column.className = "column";
        board = document.createElement("div");
        board.className = "board";
        
        for (var unit of buildPerWave[waveNumber]) {
            image = document.createElement("img");

            [unitUrl, x, y, upgrades] = parse_unit_string_to_plot(unit);
            image.src = unitUrl;
            image.alt = unit;
            image.style = `bottom:${y}px; left:${x}px;>`;

            board.append(image);

            column.append(board);
        }

        columnText = document.createElement("div")
        columnText.className = "columnText"
        columnText.append(Object.assign(document.createElement('p'), {
            className: "leakpercent",
            innerHTML: `Wave ${waveNumber + 1}: <span>${totalAverageLeak}%</span>`
        }));


        sends = document.createElement("div");
        sends.className = "sends";
        sends.append(Object.assign(document.createElement('p'), {
            innerHTML: "Sends Received:"
        }));
        for (var send of mercenariesReceivedPerWave[waveNumber]) {
            sendImage = get_unit_image(send);
            sends.append(Object.assign(document.createElement('img'), {
                alt: send,
                src: sendImage
            }));
        }
        columnText.append(sends);

        leaks = document.createElement("div");
        leaks.className = "leaks";
        leaks.append(Object.assign(document.createElement('p'), {
            innerHTML: "Leaks:"
        }));
        for (var leak of leaksPerWave[waveNumber]) {
            leakImage = get_unit_image(leak);
            leaks.append(Object.assign(document.createElement('img'), {
                alt: leak,
                src: leakImage
            }));
        }
        columnText.append(leaks);
        column.append(columnText)

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
    allButtons = document.getElementById('post-categories').children;

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

function checkFilter(post) {
    if (currentFilters.categories.size === 0) {
        return true;
    }

    for (var filterUnit of currentFilters.categories) {
        if (!post.categories.includes(filterUnit)) {
            return false;
        }
    }
    return true;

}

function refreshPosts() {

    const filteredPosts = [];
    postsData.map((post) => {
        if (checkFilter(post)) {
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

    iconpath = unitDictionary[input].iconPath;
    let unit_image = `https://cdn.legiontd2.com/${iconpath}`;
    return unit_image;
}

function parse_unit_string_to_plot(input) {
    // Takes an input string and outputs unitName, x, y as tuple. Calculates positioning of units on grid

    first = input.split(":");
    unitName = first[0];
    upgrades = first[2];
    second = first[1].split("|");
    x = second[0];
    y = second[1];

    x = x * baseWidth - (baseWidth / 2);
    y = y * baseWidth - (baseWidth / 2);

    unitUrl = get_unit_image(unitName);

    return [unitUrl, x, y, upgrades];
}

function calculateLeakPercentage(input) {
    leakPercentages = [];

    for (let waveNumber = 0; waveNumber < input.length; waveNumber++) {
        waveLeakValue = 0;
        for (var leakedUnit of input[waveNumber]) {
            waveLeakValue += unit_leak_dictionary[leakedUnit];
            waveLeakPercent = Math.round(waveLeakValue * 100 / wave_values[waveNumber + 1]);
        }
        leakPercentages.push(waveLeakPercent);

    }
    return leakPercentages;
}