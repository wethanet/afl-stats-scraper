const puppeteer = require("puppeteer");
const crypto = require("crypto");
const fs = require("fs");

const CATEGORIES = [
  'Key+Stats',
  'Disposals',
  'General+Play',
  'Possessions',
  'Stoppages',
  'Marks',
  'Scoring',
  'Defence'
];

var players = [];

async function parsePage(page) {
  const tableSelector = ('.stats-table__table');

  await page.waitForSelector(tableSelector);

  let loadMore = true;
  while (loadMore) {
    const searchResultSelector = '.stats-table-load-more-button';

    if ((await page.$(searchResultSelector)) !== null) {
      await page.click(searchResultSelector);
    } else {
      loadMore = false;
    }
  }

  await loadPlayerData(page);
}

async function loadPlayerData(page) {
  const playersData = await page.evaluate(() => {
    const PLAYERS_SELECTOR = '.stats-table__table tbody tr';
    var re = /\:\s(.*)\./;

    return [...document.querySelectorAll(PLAYERS_SELECTOR)].map(el => {
      let player = {};
      player.name = el.querySelector('.stats-leaders-table-player__name').textContent;
      player.line = el.querySelector('.stats-leaders-table-player__position span').textContent;
      [...el.querySelectorAll('.stats-table__cell button')].forEach(cell => {
        player[cell.title.match(re)[1].toLowerCase().replaceAll(' ', '_')] = cell.textContent;
      });
      return player;
    });
  });

  if (players.length === 0) {
    players = playersData.slice();
  } else {
    players = players.map(itm => ({
      ...playersData.find((item) => (item.name === itm.name) && item),
      ...itm
    }));
  }
}

function saveToCSV(players) {
  let fileString = '';
  const filename = `output/players-${createHash('players', 6)}.csv`;

  fileString += Object.keys(players[0]).join(',');
  players.forEach((player) => {
    fileString += '\n' + Object.values(player).join(',');
  });

  fs.writeFileSync(filename, fileString, 'utf8');
  console.log(`Saved ${players.length} players with stats to ${filename}`);
}

async function main() {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  for (const category of CATEGORIES) {
    const URL = `https://www.afl.com.au/aflw/stats/leaders?category=${category}&seasonId=61&roundId=-1&roundNumber=0&sortColumn=dreamTeamPoints&sortDirection=descending&positions=All&teams=All&benchmarking=false&dataType=totals&playerOneId=null&playerTwoId=null`;

    await page.goto(URL, { waitUntil: 'networkidle2' });
    await parsePage(page);
  }

  await browser.close();

  saveToCSV(players);
}

function createHash(data, len) {
  return crypto.createHash("shake256", { outputLength: len })
    .update(data)
    .digest("hex");
}

main();