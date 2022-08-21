/*
 * This is the JS to implement the UI for pokedex and responds to
 * different user interactions with the main webpage
 */

"use strict";
(function() {
  const POKEDEX = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/";
  const IMG_PATH = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/sprites/";
  const GAME_URL = "https://courses.cs.washington.edu/courses/cse154/webservices/pokedex/game.php";
  const FULL_HEALTH = 100;
  const LOW_HEALTH_PERCENT = 20;
  const CHECK_MOVES = 4;
  const FOUND = ["squirtle", "charmander", "bulbasaur"];
  window.addEventListener("load", init);

  let game = null;
  let player = null;
  let health = null;

  /**
   * Initializes the web application, populating the pokedex with the starter pokemon being found
   */
  function init() {
    let start = id("start-btn");
    start.addEventListener("click", initializeDeck);
    let end = id("endgame");
    end.addEventListener("click", clear);
    let runaway = id("flee-btn");
    runaway.addEventListener("click", flee);
    let all = POKEDEX + "pokedex.php?pokedex=all";

    fetch(all)
      .then(checkStatus)
      .then(resp => resp.text())
      .then(populate)
      .catch(console.error);
  }

  /**
   * Populates the pokedex view with all the pokemon with the "found" default pokemon
   *  visible.
   * @param {String} pokemon - String of all pokemon seperated by line break and in
   *  "Name:shortname" syntax
   */
  function populate(pokemon) {
    let newLine = "\n";
    pokemon = pokemon.split(newLine);
    let allPokemon = pokemon.length;
    let i = 0;
    let deck = id("pokedex-view");
    while (i < allPokemon) {
      let poke = pokemon[i];
      poke = poke.split(":")[1];
      let img = gen("img");
      img.src = IMG_PATH + poke + ".png";
      img.alt = poke + " icon";
      img.id = poke;
      img.classList.add("sprite");
      if (FOUND.includes(poke)) {
        img.classList.add("found");
        img.addEventListener("click", cardView);
      }
      deck.appendChild(img);
      i++;
    }
  }

  /**
   * Initiates a card view format for given selected pokemon.
   */
  function cardView() {
    let onePokemon = POKEDEX + "pokedex.php?pokemon=";
    let currentPokemon = this.id;
    let searchPokemon = onePokemon + currentPokemon;
    fetch(searchPokemon)
      .then(checkStatus)
      .then(resp => resp.json())
      .then(data => fetchInfo(data, "#p1"))
      .catch(console.error);
  }

  /**
   * Updates the card info of the given player id with the given pokeData
   * @param {object} pokeData - Pokedex API Pokemon Information
   * @param {string} playerData - player ID
   */
  function fetchInfo(pokeData, playerData) {
    cardInfo(pokeData, playerData);
    let cardMoves = qsa(playerData + " .moves button");
    let movesLength = pokeData.moves.length;
    let pokeIcons = POKEDEX + "icons/";
    for (let i = 0; i < movesLength; i++) {
      cardMoves[i].classList.remove("hidden");
      cardMoves[i].querySelector(".move").textContent = pokeData.moves[i].name;
      let checkDamage = pokeData.moves[i];
      let damage = checkDamage.dp;
      if (damage !== undefined) {
        cardMoves[i].querySelector(".dp").textContent = damage + " DP";
      } else {
        cardMoves[i].querySelector(".dp").textContent = "";
      }
      cardMoves[i].querySelector("img").src = pokeIcons +
        pokeData.moves[i].type + ".jpg";
    }
    if (movesLength < CHECK_MOVES || movesLength > CHECK_MOVES) {
      let i = movesLength;
      while (i < CHECK_MOVES) {
        cardMoves[i].classList.add("hidden");
        i++;
      }
    }
    checkPlayerHealth(pokeData, playerData);
  }

  /**
   * checks player one's health and allows start
   * @param {object} pokeData - Pokedex API Pokemon Information
   * @param {string} playerData - playerID
   */
  function checkPlayerHealth(pokeData, playerData) {
    if (playerData === "#p1") {
      health = pokeData.hp;
      qs("#p1 #start-btn").classList.remove("hidden");
    }
  }

  /**
   * Adds Pokemon Information
   * @param {object} pokeInfo - Pokedex API JSON information
   * @param {string} playerID - player ID as string
   */
  function cardInfo(pokeInfo, playerID) {
    qs(playerID + " .name").textContent = pokeInfo.name;
    qs(playerID + " .pokepic").src = POKEDEX + pokeInfo.images.photo;
    qs(playerID + " .pokepic").alt = pokeInfo.shortname;
    qs(playerID + " .type").src = POKEDEX + pokeInfo.images.typeIcon;
    qs(playerID + " .type").alt = pokeInfo.info.type;
    qs(playerID + " .weakness").src = POKEDEX + pokeInfo.images.weaknessIcon;
    qs(playerID + " .weakness").alt = pokeInfo.info.weakness;
    qs(playerID + " .hp").textContent = pokeInfo.hp + "HP";
    qs(playerID + " .info").textContent = pokeInfo.info.description;
  }

  /**
   * Initiates battle mode with current selected player one card
   */
  function initializeDeck() {
    qs("h1").textContent = "Pokemon Battle!";
    startDeck();
    moves();
    let params = new FormData();
    params.append("startgame", true);
    params.append("mypokemon", qs("#p1 .pokemon-pic img").alt);

    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(resp => resp.json())
      .then(initiateGame)
      .catch(console.error);
  }

  /**
   * sets the starting view of the poke decks page
   */
  function startDeck() {
    hide(id("pokedex-view"));
    unhide(id("p2"));
    unhide(qs("#p1 .hp-info"));
    unhide(id("p2-turn-results"));
    unhide(qs("#p1 #flee-btn"));
    unhide(id("results-container"));
    unhide(id("p1-turn-results"));
    hide(qs("#p1 #start-btn"));
  }

  /**
   * shows input elements
   * @param {tag} reveal HTML element to show
   */
  function unhide(reveal) {
    reveal.classList.remove("hidden");
  }

  /**
   * hides input elements
   * @param {tag} hideMe HTML element to hide
   */
  function hide(hideMe) {
    hideMe.classList.add("hidden");
  }

  /**
   * allows players to continue making turns until no more moves left
   */
  function moves() {
    let remainingMoves = qsa("#p1 .moves button");
    let i = 0;
    let movesLeft = remainingMoves.length;
    while (i < movesLeft) {
      remainingMoves[i].disabled = false;
      remainingMoves[i].addEventListener('click', move);
      i++;
    }
  }

  /**
   * Initiates a for the current game with selected move
   */
  function move() {
    id("loading").classList.remove("hidden");
    let data = formData();
    let moveName = this.querySelector(".move").textContent.split(' ').join('')
      .toLowerCase();
    data.append("movename", moveName);
    postMove(data);
  }

  /**
   * creates new game and player
   * @returns {FormData} data - returns new game and player data
   */
  function formData() {
    let data = new FormData();
    data.append("guid", game);
    data.append("pid", player);
    return data;
  }

  /**
   * hides pikachu loading animation
   */
  function removeAnimation() {
    id("loading").classList.add("hidden");
  }

  /**
   * Sends post request for game with passed move params FormData
   * @param {object} params - FormData object with appended gameid, playerid, and move name
   */
  function postMove(params) {
    fetch(GAME_URL, {method: "POST", body: params})
      .then(checkStatus)
      .then(resp => resp.json())
      .then(updateGame)
      .then(removeAnimation)
      .catch(console.error);
  }

  /**
   * tracks player health as game progresses, ends game when either player's health
   * is too low
   * @param {object} results - JSON object with game information
   */
  function updateGame(results) {
    updateMoves(results);
    if (results['results']['p2-move'] === null) {
      hide(id("p2-turn-results"));
    }
    let p1Health = results.p1["current-hp"] / results.p1["hp"];
    let onePercent = p1Health * FULL_HEALTH;
    qs("#p1 .health-bar").style.width = (onePercent) + "%";
    checkOneHealth(onePercent);
    let p2Health = results.p2["current-hp"] / results.p2["hp"];
    let twoPercent = p2Health * FULL_HEALTH;
    qs("#p2 .health-bar").style.width = (twoPercent) + "%";
    checkTwoHealth(twoPercent);
    if (results.p1["current-hp"] === 0 || results.p1["current-hp"] < 0 ||
      results.p2["current-hp"] === 0 || results.p2["current-hp"] < 0) {
      endGame(results);
    }
  }

  /**
   * updates game to show each player's move and updated health
   * @param {*} results - JSON object with game information
   */
  function updateMoves(results) {
    let oneMove = "Player 1 played ";
    let twoMove = "Player 2 played ";
    oneMove = oneMove + results["results"]["p1-move"] + " and ";
    twoMove = twoMove + results["results"]["p2-move"] + " and ";
    oneMove = oneMove + results["results"]["p1-result"] + "!";
    twoMove = twoMove + results["results"]["p2-result"] + "!";
    id("p1-turn-results").textContent = oneMove;
    id("p2-turn-results").textContent = twoMove;
    qs("#p1 .hp").textContent = results.p1["current-hp"] + "HP";
    qs("#p2 .hp").textContent = results.p2["current-hp"] + "HP";
  }

  /**
   * Checks if player one's health percentage is low or not
   * @param {Integer} onePercent player one's health percentage
   */
  function checkOneHealth(onePercent) {
    if (onePercent < LOW_HEALTH_PERCENT) {
      qs("#p1 .health-bar").classList.add("low-health");
    } else {
      qs("#p1 .health-bar").classList.remove("low-health");
    }
  }

  /**
   * checks if player two's health percentage is low or not
   * @param {Integer} twoPercent player two's health percentage
   */
  function checkTwoHealth(twoPercent) {
    if (twoPercent < LOW_HEALTH_PERCENT) {
      qs("#p2 .health-bar").classList.add("low-health");
    } else {
      qs("#p2 .health-bar").classList.remove("low-health");
    }
  }

  /**
   * Ends the game displaying relevant end game information, removing functionality of moves,
   * and allows user to return to pokedex view
   * @param {object} results - JSON object with updated game information
   */
  function endGame(results) {
    if (results.p1['current-hp'] === 0) {
      qs("h1").textContent = "You lost!";
    } else {
      qs("h1").textContent = "You won!";
      id(results.p2.shortname).classList.add("found");
      id(results.p2.shortname).addEventListener("click", cardView);
    }
    let playerOneMoves = qsa("#p1 .moves button");
    let i = 0;
    let allMoves = playerOneMoves.length;
    while (i < allMoves) {
      playerOneMoves[i].disabled = true;
      i++;
    }
    removeAnimation();
    hide(id("flee-btn"));
    unhide(id("endgame"));
  }

  /**
   * resets game mode to pokemon deck view
   */
  function clear() {
    qs("h1").textContent = "Your Pokedex";
    hide(id("endgame"));
    hide(id("results-container"));
    hide(qs("#p1 .hp-info"));
    unhide(qs("#p1 #start-btn"));
    qs("#p1 .hp").textContent = health + "HP";
    qs("#p1 .health-bar").style.width = FULL_HEALTH + "%";
    qs("#p2 .health-bar").style.width = FULL_HEALTH + "%";
    qs("#p2 .health-bar").classList.remove("low-health");
    qs("#p1 .health-bar").classList.remove("low-health");
    hide(id("p2"));
    unhide(id("pokedex-view"));
    clearText(id("p1-turn-results"));
    clearText(id("p2-turn-results"));
  }

  /**
   * deletes all text contained inside input
   * @param {tag} empty HTML tag
   */
  function clearText(empty) {
    empty.textContent = "";
  }

  /**
   * Sets the game and player id for a new battle mode generating the player 2 card information
   * @param {object} gameData - JSON object with the game / battle mode information
   */
  function initiateGame(gameData) {
    fetchInfo(gameData.p2, "#p2");
    game = gameData.guid;
    player = gameData.pid;
  }

  /**
   * Ends battle, player loses and returns to pokedex view
   */
  function flee() {
    id("loading").classList.remove("hidden");
    let data = formData();
    data.append("move", "flee");
    postMove(data);
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} response - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  function checkStatus(response) {
    if (!response.ok) {
      throw Error("Error in request: " + response.statusText);
    } else {
      return response;
    }
  }

  /**
   * returns the element with the given id
   * @param {tag} id - HTML tag associated with the element
   * @returns {Element} element associated with given id
   */
  function id(id) {
    return document.getElementById(id);
  }

  /**
   * makes a new element of your chosen type
   * @param {tag} tag - tag type you want to create
   * @returns {tag} - new tag element
   */
  function gen(tag) {
    return document.createElement(tag);
  }

  /**
   * retrieves the first element matched by CSS selector string
   * @param {selector} selector - CSS selector
   * @returns {Element} - first match of the selector
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * returns an array of all elements matched by given selector
   * @param {selector} selector - CSS selector
   * @returns {Array} - array of all elements under the selector
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

})();