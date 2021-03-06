const Chart = require("chart.js");
const dayjs = require("dayjs");

// for how long the exchange rate will be considered "fresh"
const INFO_EXPIRY_THRESHOLD_SECONDS = 5;

const currSelectBars = {
  from: document.querySelector("#from-currency-select-bar"),
  to: document.querySelector("#to-currency-select-bar"),
};

const currSelects = {
  from: document.querySelector("#from-currency-select"),
  to: document.querySelector("#to-currency-select"),
};

const inputs = {
  from: document.querySelector("#input-from"),
  to: document.querySelector("#input-to"),
};

const rateCaptions = {
  from: document.querySelector("#from-rate-caption"),
  to: document.querySelector("#to-rate-caption"),
};

const selectBarButtons = {
  from: currSelectBars.from.querySelectorAll("li:not(:last-child)"),
  to: currSelectBars.to.querySelectorAll("li:not(:last-child)"),
};

const swapButton = document.querySelector(".swap-button");

const loadingScreen = document.querySelector(".loading-screen");

let fromCurrency = "RUB";
let toCurrency = "USD";
let curConversionRates = [];
let lastRateFetchTime = Date.now();

initializePage();

function initializePage() {
  getRatesForBase("RUB").then((_) => {
    renderCaptions();
    // fill selects
    for (let convRate in curConversionRates.rates) {
      if (["RUB", "USD", "EUR", "GBP"].includes(convRate)) {
        // skip values that have dedicated buttons
        continue;
      }
      let option = document.createElement("option");
      option.value = convRate;
      option.text = convRate;

      const fromOption = option.cloneNode(true);
      // fromOption.addEventListener("click", changeCurrency_from);
      // option.addEventListener("click", changeCurrency_to);

      currSelects.from.appendChild(fromOption);
      currSelects.to.appendChild(option);
    }
    handleToChange();
  });
  currSelects.from.addEventListener("change", handleChangeCurrency_from);
  currSelects.to.addEventListener("change", handleChangeCurrency_to);

  // add listeners to inputs
  inputs.from.addEventListener("input", handleFromChange);
  inputs.to.addEventListener("input", handleToChange);

  // add listeners to select bar buttons
  selectBarButtons.from.forEach((button) => {
    button.addEventListener("click", handleChangeCurrency_from);
  });
  selectBarButtons.to.forEach((button) => {
    button.addEventListener("click", handleChangeCurrency_to);
  });

  // add a listener to the swap button
  swapButton.addEventListener("click", handleSwap);

  // draw the chart
  drawChart();
}

function handleFetch(fetchURL) {
  const fetchResult = fetch(fetchURL);
  loadingScreen.classList.remove("invisible");

  return fetchResult
    .then((unparsed) => {
      return unparsed.json();
    })
    .then((parsed) => {
      loadingScreen.classList.add("invisible");
      return parsed;
    })
    .catch((error) => {
      loadingScreen.classList.add("invisible");
      alert(`Не удалось выполнить запрос к серверу: ${error}`);
    });
}

function getRatesForBase(baseCur) {
  if (baseCur !== toCurrency) {
    return handleFetch(
      `https://api.ratesapi.io/api/latest?base=${baseCur}`
    ).then((result) => {
      // save the fetch result for future calculations
      curConversionRates = result;
      // refresh the last fetch timestamp
      lastRateFetchTime = Date.now();
      console.log(curConversionRates);
      return result;
    });
  } else {
    return Promise.resolve((_) => curConversionRates);
  }
}

function handleChangeCurrency_from(evt) {
  changeCurrency_from(evt.target);
}

function changeCurrency_from(eventSource) {
  let pressedButton = eventSource;
  // if we pressed the option element - we want its parent (select) to change classes
  if (pressedButton.tagName === "SELECT") {
    fromCurrency = pressedButton.value;
  }
  if (pressedButton.tagName === "LI") {
    fromCurrency = pressedButton.innerText;
  }

  // prepare the rates and change captions
  getRatesForBase(fromCurrency).then((_) => {
    renderCaptions();
    handleFromChange();
  });
  // remove selected from all buttons
  selectBarButtons.from.forEach((button) => {
    button.classList.remove("selected");
  });
  // also remove it from the select
  currSelects.from.classList.remove("selected");

  pressedButton.classList.add("selected");

  // draw chart
  drawChart();
}

function handleChangeCurrency_to(evt) {
  changeCurrency_to(evt.target);
}

function changeCurrency_to(eventSource) {
  let pressedButton = eventSource;
  let newToCurrency = 0;
  // if we pressed the option element - we want its parent (select) to change classes
  if (pressedButton.tagName === "SELECT") {
    newToCurrency = pressedButton.selectedOptions[0].value;
  }
  if (pressedButton.tagName === "LI") {
    newToCurrency = pressedButton.innerText;
  }

  if (fromCurrency === toCurrency && fromCurrency !== newToCurrency) {
    // only connect to the server if we don't have relevant rates already
    toCurrency = newToCurrency;
    getRatesForBase(fromCurrency).then((_) => {
      renderCaptions();
      handleToChange();
    });
  } else {
    toCurrency = newToCurrency;
    // change captions
    renderCaptions();
    handleToChange();
  }

  // remove selected from all buttons
  selectBarButtons.to.forEach((button) => {
    button.classList.remove("selected");
  });
  // also remove it from the select
  currSelects.to.classList.remove("selected");

  pressedButton.classList.add("selected");

  // draw chart
  drawChart();
}

function renderCaptions() {
  let fromConverted = convertCurrency(fromCurrency, toCurrency, 1, false);
  let toConverted = convertCurrency(toCurrency, fromCurrency, 1, true);

  rateCaptions.from.innerText = `1 ${fromCurrency} ≈ ${fromConverted} ${toCurrency}`;
  rateCaptions.to.innerText = `1 ${toCurrency} ≈ ${toConverted} ${fromCurrency}`;
}

function convertCurrency(from, to, amount, isReverse) {
  if (from === to) {
    return amount;
  }

  let rate = isReverse
    ? 1 / curConversionRates.rates[from]
    : curConversionRates.rates[to];
  return (amount * rate).toFixed(3);
}

function handleFromChange() {
  let currAmount = inputs.from.value;
  // check if the rates are still fresh
  if (Date.now() - lastRateFetchTime > INFO_EXPIRY_THRESHOLD_SECONDS * 1000) {
    getRatesForBase(fromCurrency).then((_) => {
      inputs.to.value = convertCurrency(
        fromCurrency,
        toCurrency,
        currAmount,
        false
      );
    });
  } else {
    inputs.to.value = convertCurrency(
      fromCurrency,
      toCurrency,
      currAmount,
      false
    );
  }
}

function handleToChange() {
  let currAmount = inputs.to.value;
  if (Date.now() - lastRateFetchTime > INFO_EXPIRY_THRESHOLD_SECONDS * 1000) {
    getRatesForBase(fromCurrency).then((_) => {
      inputs.from.value = convertCurrency(
        toCurrency,
        fromCurrency,
        currAmount,
        true
      );
    });
  } else {
  }
  inputs.from.value = convertCurrency(
    toCurrency,
    fromCurrency,
    currAmount,
    true
  );
}

function handleSwap(evt) {
  evt.preventDefault();

  let oldFrom = fromCurrency;
  let oldTo = toCurrency;

  selectBarButtons.to.forEach((button) => {
    if (button.innerText === oldFrom) button.click();
  });
  currSelects.to.querySelectorAll("option").forEach((option) => {
    if (option.value === oldTo) {
      currSelects.from.value = option.value;
      changeCurrency_from(currSelects.from);
    }
  });

  selectBarButtons.from.forEach((button) => {
    if (button.innerText === oldTo) button.click();
  });
  currSelects.from.querySelectorAll("option").forEach((option) => {
    if (option.value === oldFrom) {
      currSelects.to.value = option.value;
      changeCurrency_to(currSelects.to);
    }
  });
}

// chart drawing logic

let chartContext = document.getElementById("main-chart").getContext("2d");
let chartMain;
function drawChart() {
  let week = getPastWeek();
  let currencyValues = getRatesForDays(week);

  currencyValues.then((rateObjects) => {
    let labelDates = week;
    let finalData = rateObjects.map((elem) => elem.rates[toCurrency]);

    Chart.defaults.global.defaultFontFamily = '"Source Sans Pro", sans-serif';
    
    // Destroy the chart before reusing it, as per chart.js documentation
    if (chartMain !== undefined) chartMain.destroy();
    chartMain = new Chart(chartContext, {
      type: "line",
      data: {
        labels: labelDates,
        datasets: [
          {
            label: fromCurrency,
            data: finalData,
            backgroundColor: "rgba(131, 60, 222, 0.3)",
            borderColor: "#833cde",
            borderWidth: 1,
          },
        ],
      },
      options: {
        title: {
          display: true,
          text: "Курс за последнюю неделю",
          fontSize: 20,
        },
        scales: {
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: toCurrency,
              },
            },
          ],
        },
      },
    });
  });
}

function getPastWeek() {
  let now = dayjs();
  let pastweek = [];
  let curdate = now;
  for (let i = 0; i < 7; i++) {
    pastweek.push(curdate.format("YYYY-MM-DD"));
    curdate = curdate.subtract("1", "day");
  }

  return pastweek.reverse();
}

function getRatesForDays(days) {
  if (fromCurrency === toCurrency) {
    // don't poll server if selected currencies are the same
    let allOnes = [];
    for (const day of days) {
      const ratesObj = {};
      ratesObj[toCurrency] = 1;
      allOnes.push({ rates: ratesObj });
    }
    return Promise.resolve(allOnes);
  }

  let promises = [];
  for (const day of days) {
    let curURL = `https://api.ratesapi.io/api/${day}?base=${fromCurrency}&symbols=${toCurrency}`;
    promises.push(handleFetch(curURL));
  }

  return Promise.all(promises);
}
