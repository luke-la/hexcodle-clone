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

function timeFromMilliseconds(ms) {
  const hours = Math.trunc(ms / 1000 / 60 / 60)
  ms -= hours * 1000 * 60 * 60
  const minutes = Math.trunc(ms / 1000 / 60)
  ms -= minutes * 1000 * 60
  const seconds = Math.trunc(ms / 1000)

  return String(hours).padStart(2, '0') + ":"
  + String(minutes).padStart(2, '0') + ":"
  + String(seconds).padStart(2, '0');
}

function dateStringFromDay(days) {
  let result = new Date(startDate.getTime());
  result.setDate(result.getDate() + days)
  const year = result.getFullYear();
  const month = String(result.getMonth() + 1).padStart(2, '0');
  const day = String(result.getDate()).padStart(2, '0');
  return year + "-" + month + "-" + day;
}

function load() {
  // load old gamestate if exists
  const gameStateString = localStorage.getItem(dateStringFromDay(day))
  const gameState = JSON.parse(gameStateString);
  if (gameState != null) {
    guesses = gameState.guesses
    accuracies = gameState.accuracies
    attempts = gameState.attempts
    won = gameState.won
  } else {
    guesses = []
    accuracies = []
    attempts = 1
    won = false;
  }
  
  // get target color
  let dayRNG = new RNG(day)
  target = "";
  for (let i = 0; i < 6; i++) {
    randIndex = dayRNG.nextInRange(0, hexChars.length);
    target += hexChars[randIndex];
  }

  // set up sit with new elements
  document.getElementById("day-counter").innerHTML = " #" + day;

  document.getElementById("display-target-color").style.backgroundColor =
    "#" + target;
  document.getElementById("display-guessed-color").style.backgroundColor =
    "#888888";

  document.getElementById("btn-add-day").disabled = (day >= maxDay)
  document.getElementById("btn-sub-day").disabled = (day <= 1)

  document.getElementById("btn-submit").disabled = won || attempts > 6;
  if (won || attempts > 6) {
    document.getElementById("btn-share").style.display = "block";
    document.getElementById("btn-share").disabled = false;
    if (won) {
      let msg = "You guessed the code in ";
      if (attempts == 1) {
        msg += "one try!";
      } else {
        msg += attempts + " tries!";
      }
      msg += " Your score is " + getScore() + "%"
      document.getElementById("user-output").innerHTML = msg;
    }
    else {
      const msg = "Wow... You actually ran out of guesses."
      document.getElementById("user-output").innerHTML = msg;
    }
  }
  else {
    document.getElementById("btn-share").style.display = "none";
    document.getElementById("btn-share").disabled = true;
    if (attempts == 6) {
      const msg = "Last chance."
      document.getElementById("user-output").innerHTML = msg;
    } else {
      const msg = "Enter your guess above."
      document.getElementById("user-output").innerHTML = msg;
    }
  }

  buildGuessDiv(guesses, accuracies);
}

function changeDay(amt) {
  if (day + amt > 0 && day + amt <= maxDay) {
    day += amt;
    dayRNG = new RNG(day);
    load();
  }
}

function resetDay() {
  day = maxDay;
  dayRNG = new RNG(day);
  load();
}

function buildGuessDiv(guesses, accuracies) {
  let guessBox = document.getElementById("guesses");
  guessBox.innerHTML = ""

  for (let i = guesses.length - 1; i >= 0; i--) {
    let guess = guesses[i]
    let accuracy = accuracies[i]

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

let timeLeftInterval;

function updateTimeLeft() {
  const tl = document.getElementById("time-left");
  if (tl == null) return;

  const timeMS = dayLength - (Date.now() - startDate) % dayLength;
  tl.innerHTML = timeFromMilliseconds(timeMS);
}

function showWin() {
  let modal = document.getElementById("win-modal");

  modal.querySelector("#lbl-share-day").innerHTML = day;

  let p = modal.querySelector("#sharable-results");
  p.innerHTML = "";

  const score = "Score: " + getScore() + "%"
  let strings = [...getGuessesStringArr(), score];
  for (let i = strings.length - 1; i >= 0; i--) {
    p.append(strings[i], document.createElement("br"));
  }

  timeLeftInterval = setInterval(updateTimeLeft, 200)
  
  modal.showModal();
}

function unshowWin() {
  clearInterval(timeLeftInterval);
  document.getElementById("win-modal").close();
}

function shareResults() {
  let text = "Score: " + getScore() + "%\n";
  let strings = getGuessesStringArr();
  for (let i = strings.length - 1; i >= 0; i--) {
    text += strings[i] + "\n";
  }
  navigator.clipboard.writeText(text);
}

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


function limitInput(value) {
  let temp = "";
  for (let char of value.toUpperCase()) {
    if (hexChars.some((ch) => ch == char)) temp += char;
  }
  return temp;
}

function logSubmit(event) {
  event.preventDefault();

  let userInput = document.getElementById("user-input");
  let userOutput = document.getElementById("user-output");
  let input = userInput.value;
  userInput.value = "";

  // if input is invalid, return
  if (input.length < 6) {
    userOutput.value = "Try using the right number of digits.";
    return;
  }

  // update color of guess box
  document.getElementById("display-guessed-color").style.backgroundColor =
    "#" + input;

  // check if guess was exactly right
  let guessed = false;
  if (input == target) {
    guessed = true;
    let msg = "You guessed the code in ";
    if (attempts == 1) {
      msg += "one try!";
    } else {
      msg += attempts + " tries!";
    }
    msg += " Your score is " + getScore() + "%"
    userOutput.value = msg;
    document.getElementById("btn-share").style.display = "block";
    document.getElementById("btn-share").disabled = false;
  }

  let accuracy = [];

  for (let char in input) {
    let inputIndex, targetIndex;
    for (let index in hexChars) {
      if (hexChars[index] == input[char]) inputIndex = index;
      if (hexChars[index] == target[char]) targetIndex = index;
    }
    accuracy[char] = targetIndex - inputIndex;
  }

  guesses.push(input);
  accuracies.push(accuracy);

  buildGuessDiv(guesses, accuracies);

  if (!guessed) {
    attempts += 1;
    if (attempts > 6) {
      userOutput.value = "Wow... You actually ran out of guesses.";
      document.getElementById("btn-submit").disabled = true;
    } else if (attempts == 6) userOutput.value = "Last chance.";
    else userOutput.value = "Nope. Do that again, but better.";
  } else {
    showWin();
  }

  const gameState = {
    guesses: guesses,
    accuracies: accuracies,
    attempts: attempts,
    won: guessed
  }

  const gameStateString = JSON.stringify(gameState)

  localStorage.setItem(dateStringFromDay(day), gameStateString)
}
