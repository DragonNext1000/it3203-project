/* ==========================================================
   IT 3203 Milestone #2 - Self-assessment quiz
   Topic: Smart Contracts, Layer 1 and Layer 2
   What this file does:
     1. Stores the ten questions in one array (the "data").
     2. Builds the form controls from that array when the quiz starts.
     3. Runs a 10-minute countdown and records the time spent.
     4. Grades the answers on submit and shows the results.
     5. Resets everything so the quiz can be retaken.
   ========================================================== */
"use strict";

/* ----- Settings ----- */
const TIME_LIMIT_SECONDS = 10 * 60;   // quiz time limit: 10 minutes
const PASS_PERCENT = 70;              // 7 out of 10 correct is a pass

/* ----- Question data -----
   type "fill"   : fill in the blank (text input). "answers" lists accepted spellings.
   type "choice" : multiple choice, one correct option. "answer" is the index of the right option.
   type "multi"  : select all that apply. "answers" lists the indexes of all right options.
   Each question is worth 1 point. A multi-select question is all-or-nothing. */
const questions = [
  {
    type: "choice",
    text: "Which programming language is most commonly used to write smart contracts on Ethereum?",
    options: ["Solidity", "Java", "SQL", "HTML"],
    answer: 0,
    explanation: "Solidity is the main language for Ethereum smart contracts. It is compiled to bytecode and deployed to an address."
  },
  {
    type: "fill",
    text: "A ______ is code stored on a blockchain that runs automatically when someone sends it a transaction.",
    answers: ["smart contract", "smart contracts"],
    display: "smart contract",
    explanation: "Every node runs the same contract code, so the result is the same for every user."
  },
  {
    type: "choice",
    text: "What does a gas fee pay for?",
    options: [
      "A license to use the blockchain",
      "Computation and storage on the network",
      "The salary of the contract's author",
      "Moving funds between banks"
    ],
    answer: 1,
    explanation: "Gas pays for the computation and storage a transaction uses. Fees rise when the network is busy."
  },
  {
    type: "choice",
    text: "Ethereum stopped using proof of work and switched to proof of stake in 2022. What was that upgrade called?",
    options: ["The Halving", "The Fork", "The Merge", "The Rollup"],
    answer: 2,
    explanation: "The Merge moved Ethereum to proof of stake, where validators lock up coins instead of mining."
  },
  {
    type: "fill",
    text: "The blockchain trilemma is the challenge of balancing security, decentralization, and ______.",
    answers: ["scalability", "scalable", "scale"],
    display: "scalability",
    explanation: "Raising throughput on a Layer 1 often means higher hardware needs, which can hurt decentralization."
  },
  {
    type: "choice",
    text: "How does an optimistic rollup catch an invalid batch of transactions?",
    options: [
      "A validity proof is posted with every batch",
      "Miners vote on each batch",
      "Anyone can submit a fraud proof during a challenge window",
      "Batches are never checked"
    ],
    answer: 2,
    explanation: "Optimistic rollups assume batches are valid, then allow a challenge window (often about a week) for fraud proofs."
  },
  {
    type: "choice",
    text: "Which type of Layer 2 posts a cryptographic validity proof with each batch?",
    options: ["Optimistic rollup", "ZK rollup", "State channel", "Sidechain"],
    answer: 1,
    explanation: "ZK (zero-knowledge) rollups prove each batch is correct, so withdrawals to Layer 1 can be faster."
  },
  {
    type: "fill",
    text: "In March 2024, Ethereum's Dencun upgrade (EIP-4844) added a cheaper way for rollups to post data, called ______.",
    answers: ["blobs", "blob"],
    display: "blobs",
    explanation: "Blobs lowered the cost of publishing rollup data to Layer 1, which lowered Layer 2 fees."
  },
  {
    type: "multi",
    text: "Select ALL of the following that are Layer 2 networks or rollups.",
    options: ["Arbitrum", "Base", "Bitcoin", "zkSync Era", "Solana"],
    answers: [0, 1, 3],
    explanation: "Arbitrum, Base, and zkSync Era are rollups. Bitcoin and Solana are Layer 1 blockchains."
  },
  {
    type: "multi",
    text: "Select ALL of the following that are limits or tradeoffs of smart contracts.",
    options: [
      "Bugs are costly because deployed code is hard to change",
      "Every action costs gas",
      "They cannot read outside data without an oracle",
      "The author can edit them at any time without anyone noticing"
    ],
    answers: [0, 1, 2],
    explanation: "The first three are real limits. Contract code and history are public, so changes cannot be hidden."
  }
];

/* ----- Page elements (looked up once) ----- */
const introPanel   = document.getElementById("quiz-intro");
const startButton  = document.getElementById("start-btn");
const timerBar     = document.getElementById("timer-bar");
const timeLeftText = document.getElementById("time-left");
const form         = document.getElementById("quiz-form");
const questionBox  = document.getElementById("questions");
const resetButton  = document.getElementById("reset-btn");
const resultsPanel = document.getElementById("results");
const retakeButton = document.getElementById("retake-btn");

/* ----- State ----- */
let startTime = 0;        // when the quiz began (milliseconds)
let timerId = null;       // id of the countdown interval
let submitted = false;    // true after the quiz is graded

/* ----- Small helpers ----- */

// Turn a number of seconds into m:ss, for example 222 becomes "3:42".
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

// Make an element with optional class name and text in one step.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) { element.className = className; }
  if (text !== undefined) { element.textContent = text; }
  return element;
}

// Lowercase, trim, and collapse spaces so "  Smart   Contract " matches "smart contract".
function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ----- Building the form ----- */

// Fill-in-the-blank: one text input.
function buildFillQuestion(fieldset, index) {
  const label = makeElement("label", "blank-label", "Your answer:");
  label.htmlFor = "q" + index + "-text";
  const input = document.createElement("input");
  input.type = "text";
  input.id = "q" + index + "-text";
  input.name = "q" + index;
  input.className = "blank-input";
  input.maxLength = 40;
  input.autocomplete = "off";
  fieldset.append(label, input);
}

// Multiple choice uses radio buttons (only one can be picked); multi-select uses checkboxes.
function buildOptionQuestion(fieldset, question, index) {
  const inputType = question.type === "choice" ? "radio" : "checkbox";
  question.options.forEach(function (optionText, optionIndex) {
    const label = makeElement("label", "option");
    const input = document.createElement("input");
    input.type = inputType;
    input.name = "q" + index;               // radio buttons share a name so only one stays checked
    input.id = "q" + index + "-opt" + optionIndex;
    input.value = String(optionIndex);
    label.append(input, makeElement("span", "", optionText));
    fieldset.append(label);
  });
}

// Create every question from the data array.
function buildQuestions() {
  questionBox.textContent = "";
  const typeNames = { fill: "Fill in the blank", choice: "Multiple choice", multi: "Select all that apply" };

  questions.forEach(function (question, index) {
    const fieldset = makeElement("fieldset", "question");
    fieldset.id = "question-" + index;

    const legend = makeElement("legend", "", "Question " + (index + 1));
    legend.append(makeElement("span", "question-type", typeNames[question.type]));
    fieldset.append(legend, makeElement("p", "question-text", question.text));

    if (question.type === "fill") {
      buildFillQuestion(fieldset, index);
    } else {
      buildOptionQuestion(fieldset, question, index);
    }

    // Empty paragraph that will hold the feedback after grading.
    const feedback = makeElement("p", "feedback");
    feedback.hidden = true;
    fieldset.append(feedback);

    questionBox.append(fieldset);
  });
}

/* ----- Reading and grading answers ----- */

// Return the indexes of the options the user checked for question number "index".
function getCheckedIndexes(index) {
  const checked = form.querySelectorAll('input[name="q' + index + '"]:checked');
  return Array.from(checked).map(function (input) { return Number(input.value); });
}

// Grade one question. Returns { correct, given } where "given" is the user's answer as text.
function gradeQuestion(question, index) {
  if (question.type === "fill") {
    const typed = document.getElementById("q" + index + "-text").value;
    const isCorrect = question.answers.indexOf(normalize(typed)) !== -1;
    return { correct: isCorrect, given: typed.trim() === "" ? "(no answer)" : typed.trim() };
  }

  const picked = getCheckedIndexes(index);
  const givenText = picked.length === 0
    ? "(no answer)"
    : picked.map(function (i) { return question.options[i]; }).join("; ");

  if (question.type === "choice") {
    return { correct: picked.length === 1 && picked[0] === question.answer, given: givenText };
  }

  // Multi-select: the picked set must match the answer set exactly.
  const sameLength = picked.length === question.answers.length;
  const allRight = picked.every(function (i) { return question.answers.indexOf(i) !== -1; });
  return { correct: sameLength && allRight, given: givenText };
}

// The correct answer as readable text.
function correctAnswerText(question) {
  if (question.type === "fill") { return question.display; }
  if (question.type === "choice") { return question.options[question.answer]; }
  return question.answers.map(function (i) { return question.options[i]; }).join("; ");
}

/* ----- Showing results ----- */

// Color the options of a graded question: green = correct answer, red = wrong pick.
function markOptions(question, index) {
  if (question.type === "fill") { return; }
  const correctIndexes = question.type === "choice" ? [question.answer] : question.answers;

  question.options.forEach(function (optionText, optionIndex) {
    const input = document.getElementById("q" + index + "-opt" + optionIndex);
    const label = input.parentElement;
    if (correctIndexes.indexOf(optionIndex) !== -1) {
      label.classList.add("option-correct");
    } else if (input.checked) {
      label.classList.add("option-wrong");
    }
  });
}

// Put the result under one question and color its box.
function showFeedback(question, index, result) {
  const fieldset = document.getElementById("question-" + index);
  const feedback = fieldset.querySelector(".feedback");
  const point = result.correct ? 1 : 0;

  fieldset.classList.add(result.correct ? "is-correct" : "is-incorrect");
  feedback.textContent = "";
  feedback.append(
    makeElement("strong", "", (result.correct ? "Correct" : "Incorrect") + " (" + point + "/1). "),
    document.createTextNode("Your answer: " + result.given + ". Correct answer: " + correctAnswerText(question) + ". " + question.explanation)
  );
  feedback.hidden = false;
}

// Build the summary table (one row per question).
function buildResultsTable(results) {
  const body = document.getElementById("results-body");
  body.textContent = "";
  results.forEach(function (result, index) {
    const row = document.createElement("tr");
    row.append(
      makeElement("td", "", String(index + 1)),
      makeElement("td", result.correct ? "cell-correct" : "cell-incorrect", result.correct ? "Correct" : "Incorrect"),
      makeElement("td", "", (result.correct ? 1 : 0) + "/1"),
      makeElement("td", "", correctAnswerText(questions[index]))
    );
    body.append(row);
  });
}

// Fill the results panel at the top of the page.
function showResults(score, secondsSpent, timedOut) {
  const percent = Math.round((score / questions.length) * 100);
  const passed = percent >= PASS_PERCENT;

  const banner = document.getElementById("result-banner");
  banner.textContent = passed ? "PASS" : "FAIL";
  banner.className = "result-banner " + (passed ? "pass" : "fail");

  document.getElementById("result-score").textContent = score + " / " + questions.length + " (" + percent + "%)";
  document.getElementById("result-time").textContent =
    formatTime(secondsSpent) + (timedOut ? " (time limit reached)" : "");
  document.getElementById("result-pass-note").textContent =
    "Passing score: " + PASS_PERCENT + "% (" + Math.ceil(questions.length * PASS_PERCENT / 100) + " of " + questions.length + " correct).";

  const fill = document.getElementById("score-fill");
  fill.style.width = percent + "%";
  fill.className = "score-fill " + (passed ? "pass" : "fail");

  resultsPanel.hidden = false;
  resultsPanel.focus();              // move keyboard focus and scroll to the results
}

/* ----- Timer ----- */

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

// Runs four times a second. It compares the clock to the start time, so
// it stays accurate even if the browser slows down a background tab.
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
  timeLeftText.textContent = formatTime(remaining);
  timerBar.classList.toggle("timer-low", remaining <= 60);   // turns red in the last minute
  if (remaining === 0) {
    submitQuiz(true);                                        // time is up: grade what is there
  }
}

/* ----- Main actions ----- */

function startQuiz() {
  submitted = false;
  buildQuestions();
  resultsPanel.hidden = true;
  introPanel.hidden = true;
  form.hidden = false;
  timerBar.hidden = false;
  startTime = Date.now();
  updateTimer();
  timerId = setInterval(updateTimer, 250);
  document.getElementById("question-0").scrollIntoView();
}

function submitQuiz(timedOut) {
  if (submitted) { return; }
  submitted = true;
  stopTimer();

  const secondsSpent = Math.min(TIME_LIMIT_SECONDS, Math.round((Date.now() - startTime) / 1000));
  let score = 0;
  const results = questions.map(function (question, index) {
    const result = gradeQuestion(question, index);
    if (result.correct) { score += 1; }
    showFeedback(question, index, result);
    markOptions(question, index);
    return result;
  });

  // Lock the inputs so answers cannot change after grading.
  form.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
  form.querySelector('button[type="submit"]').disabled = true;
  timerBar.hidden = true;

  buildResultsTable(results);
  showResults(score, secondsSpent, timedOut === true);
}

// Clear all answers and results and go back to the start screen.
function resetQuiz() {
  stopTimer();
  submitted = false;
  questionBox.textContent = "";
  document.getElementById("results-body").textContent = "";
  form.querySelector('button[type="submit"]').disabled = false;
  form.hidden = true;
  resultsPanel.hidden = true;
  timerBar.hidden = true;
  timerBar.classList.remove("timer-low");
  introPanel.hidden = false;
  window.scrollTo(0, 0);
}

/* ----- Event listeners ----- */
startButton.addEventListener("click", startQuiz);
resetButton.addEventListener("click", resetQuiz);
retakeButton.addEventListener("click", resetQuiz);
form.addEventListener("submit", function (event) {
  event.preventDefault();            // stop the browser from reloading the page
  submitQuiz(false);
});
