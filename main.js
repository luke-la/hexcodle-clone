let hexChars = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

// based on code from https://stackoverflow.com/questions/424292/seedable-javascript-random-number-generator
// rng class to generate seeded random value in range
class RNG {
  constructor(seed) {
    // LCG using GCC's constants
    this.m = 0x80000000; // 2**31;
    this.a = 1103515245;
    this.c = 12345;

    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }
  // returns a random number in range
  nextInRange(start, length) {
    this.state = (this.a * this.state + this.c) % this.m;
    // can't modulu state because of weak randomness in lower bits
    const randomUnder1 = this.state / this.m;
    return start + Math.floor(randomUnder1 * (length - start));
  }
}

// game constants and variables
const dayLength = 24 * 60 * 60 * 1000;
const startDate = new Date("2025-03-21");
const maxDay = Math.ceil((Date.now() - startDate) / dayLength);
const maxAttempts = 6;

let day = maxDay;
let target = "";
let guesses = [];
let accuracies = [];
let attempts = 1;
let won = false;

// returns a durration in ms in HH:mm:ss format
function timeFromMilliseconds(ms) {
  const hours = Math.trunc(ms / 1000 / 60 / 60);
  ms -= hours * 1000 * 60 * 60;
  const minutes = Math.trunc(ms / 1000 / 60);
  ms -= minutes * 1000 * 60;
  const seconds = Math.trunc(ms / 1000);

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

// returns the date a set number of days away from the startdate
// uses YYYY-MM-DD fomrat
function dateStringFromDay(days) {
  let result = new Date(startDate.getTime());
  result.setDate(result.getDate() + days);
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, "0");
  const day = String(result.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// loads in gamestate from storage if it exists and readies the page
function load() {
  // read in a gamestate from local storage if it exists
  const gameStateString = localStorage.getItem(dateStringFromDay(day));
  const gameState = JSON.parse(gameStateString);
  if (gameState != null) {
    guesses = gameState.guesses;
    accuracies = gameState.accuracies;
    attempts = gameState.attempts;
    won = gameState.won;
  } else {
    guesses = [];
    accuracies = [];
    attempts = 1;
    won = false;
  }
  updateUI();
}

// updates the elemets of the game after a change in game state
function updateUI(fromLoad = false) {
  // set up header
  document.getElementById("day-counter").innerHTML = day;
  document.getElementById("btn-add-day").disabled = day >= maxDay;
  document.getElementById("btn-sub-day").disabled = day <= 1;

  // get target color
  let dayRNG = new RNG(day);
  target = "";
  for (let i = 0; i < 6; i++) {
    randIndex = dayRNG.nextInRange(0, hexChars.length);
    target += hexChars[randIndex];
  }

  // set up color boxes
  document.getElementById("display-target-color").style.backgroundColor =
    "#" + target;

  if (attempts > 1) {
    document.getElementById("display-guessed-color").style.backgroundColor =
      "#" + guesses[guesses.length - 1];
  } else {
    document.getElementById("display-guessed-color").style.backgroundColor =
      "#888888";
  }

  // set up inputs and output based on gamestate
  document.getElementById("btn-submit").disabled = won || attempts > 6;
  const output = document.getElementById("user-output");
  // if the player has won or is out of attempts enable share
  if (won || attempts > 6) {
    document.getElementById("btn-share").style.display = "block";
    document.getElementById("btn-share").disabled = false;
    // if won, display score
    if (won) {
      let msg = "You guessed the code in ";
      if (attempts == 1) {
        msg += "one try!";
      } else {
        msg += attempts + " tries!";
      }
      msg += " Your score is " + getScore() + "%";
      output.innerHTML = msg;
    }
    // if lost, shame user
    else {
      output.innerHTML = "Wow... You actually ran out of guesses.";
    }
  }
  // if the player has not yet won, disable
  else {
    document.getElementById("btn-share").style.display = "none";
    document.getElementById("btn-share").disabled = true;
    // if player is nearly out of attempts, warn them
    if (attempts == 6) {
      output.innerHTML = "Last chance.";
    }
    // if the player has guessed less, motivate them
    else if (attempts > 1) {
      output.innerHTML = "Nope. Try that again, but better.";
    } else {
      output.innerHTML = "Enter your guess above.";
    }
  }

  // build guess div (does nothing if no game data exists)
  buildGuessDiv(guesses, accuracies);
}

// adjusts the selected day by amount and reloads the gamestate
function changeDay(amt) {
  if (day + amt > 0 && day + amt <= maxDay) {
    day += amt;
    dayRNG = new RNG(day);
    load();
  }
}

// adjusts the day to the most resent and reloads the gamestate
function resetDay() {
  day = maxDay;
  dayRNG = new RNG(day);
  load();
}

// constucts a div containing the guesses color coded and marked
function buildGuessDiv(guesses, accuracies) {
  let guessBox = document.getElementById("guesses");
  guessBox.innerHTML = "";

  // for each set of guesses and accuracies check them and buld a row
  for (let i = guesses.length - 1; i >= 0; i--) {
    let guess = guesses[i];
    let accuracy = accuracies[i];

    let div = document.createElement("div");
    div.className = "guess";

    for (let index in accuracy) {
      let span = document.createElement("span");
      span.innerHTML = guess[index];
      span.className = "guess-digit";

      if (accuracy[index] == 0) span.className += " correct";
      else if (accuracy[index] < 3 && accuracy[index] > -3) {
        span.className += " close";
        span.innerHTML += accuracy[index] > 0 ? "\u2191" : "\u2193";
      } else {
        span.innerHTML += accuracy[index] > 0 ? "\u21C8" : "\u21CA";
      }

      div.append(span);
    }
    guessBox.append(div);
  }
}

// buids a string representation of the accuracy of the guesses
function getGuessesStringArr() {
  let strings = [];
  for (let guess of accuracies) {
    let temp = "";
    for (let digit of guess) {
      if (digit == 0) temp += "\u2714";
      else if (digit < 3 && digit > 0) temp += "\u2191";
      else if (digit > -3 && digit < 0) temp += "\u2193";
      else if (digit > 0) temp += "\u21C8";
      else temp += "\u21CA";
    }
    strings.push(temp);
  }
  return strings;
}

// a variable and function to help update the countdown in the share dialog
let timeLeftInterval;

function updateTimeLeft() {
  const tl = document.getElementById("time-left");
  if (tl == null) return;

  const timeMS = dayLength - ((Date.now() - startDate) % dayLength);
  tl.innerHTML = timeFromMilliseconds(timeMS);
}

// opens and populates the win/share dialog
function showWin() {
  let modal = document.getElementById("win-modal");

  modal.querySelector("#lbl-share-day").innerHTML = day;

  let p = modal.querySelector("#sharable-results");
  p.innerHTML = "";

  const score = "Score: " + getScore() + "%";
  let strings = [...getGuessesStringArr(), score];
  for (let i = strings.length - 1; i >= 0; i--) {
    p.append(strings[i], document.createElement("br"));
  }

  timeLeftInterval = setInterval(updateTimeLeft, 200);

  modal.showModal();
}

// closes the win/share dialog
function unshowWin() {
  clearInterval(timeLeftInterval);
  document.getElementById("win-modal").close();
}

// writes the depicted results to the clipboard in string format
function shareResults() {
  let text = "Score: " + getScore() + "%\n";
  let strings = getGuessesStringArr();
  for (let i = strings.length - 1; i >= 0; i--) {
    text += strings[i] + "\n";
  }
  navigator.clipboard.writeText(text);
}

// calculates a score based on guess accuracy
function getScore() {
  let scoreTotal = 0;

  for (let accuracy of accuracies) {
    for (let index in accuracy) {
      if (accuracy[index] == 0) scoreTotal += 1;
      else if (Math.abs(accuracy[index]) == 1) scoreTotal += 0.5;
      else if (Math.abs(accuracy[index]) == 2) scoreTotal += 0.15;
    }
  }

  return Math.round((scoreTotal / (accuracies.length * 6)) * 100);
}

// handles an entry of a new guess, and updates the gamestate and page with results
function logSubmit(event) {
  event.preventDefault();

  // get inupt and output and reset input
  let userInput = document.getElementById("user-input");
  let userOutput = document.getElementById("user-output");
  let input = userInput.value.toUpperCase();

  // if input is invalid, return
  if (input.length < 6) {
    userOutput.value = "Try using the right number of digits.";
    return;
  }
  
  let invalidChars = false;
  for (let char of input) {
    if (!hexChars.some((ch) => ch == char)) {
      invalidChars = true;
      break;
    }
  }
  if (invalidChars) {
    userOutput.value = "Wrong numbers. (0-9, A-F)";
    return;
  }

  userInput.value = "";

  // update color of guess box
  document.getElementById("display-guessed-color").style.backgroundColor =
    "#" + input;

  // create accuracy entry
  let accuracy = [];

  for (let char in input) {
    let inputIndex, targetIndex;
    for (let index in hexChars) {
      if (hexChars[index] == input[char]) inputIndex = index;
      if (hexChars[index] == target[char]) targetIndex = index;
    }
    accuracy[char] = targetIndex - inputIndex;
  }

  // write guesses and accuracy to thier arrays and to the display
  guesses.push(input);
  accuracies.push(accuracy);
  buildGuessDiv(guesses, accuracies);

  // check if target was guessed
  won = input == target;

  //call UI updates
  if (won) showWin();
  else {
    attempts++;
  }
  updateUI();

  // update gamestate in localstorage
  const gameState = {
    guesses: guesses,
    accuracies: accuracies,
    attempts: attempts,
    won: won,
  };
  const gameStateString = JSON.stringify(gameState);
  localStorage.setItem(dateStringFromDay(day), gameStateString);
}
