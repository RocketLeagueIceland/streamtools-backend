
const TwitchPoll = require('./twitchPoll.js');
const express = require('express')
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const axios = require("axios");
const cheerio = require("cheerio");

// Create Express app
const app = express()
app.use(cors());
app.use(express.json());

app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/teamlogos')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.originalname)
  }
});

const twitchPoll = new TwitchPoll(46, 'LAVA', 98, 'BB')

const upload = multer({ storage: storage });

const timerData = 'timer.json'
const currentGameData = 'currentGame.json';
const currentStandingData = 'currentStanding.json';
const nextGameData = 'nextGame.json';
const allTeamsData = 'teams.json';
const scoreboardData = 'scoreboard.json';
const weekNumberData = 'weekNumber.json';
const gamesOnStreamData = 'gamesOnStream.json';
const playoffsData = 'playoffs.json';

// the order of the array: WB1.1, WB1.2, ..., WBFinals, LB1.1, LB1.2, LB2.2, LBFinals, GrandFinals.
const doubleElimData = 'doubleElim.json';
const tvBeforeGameData = 'tvBeforeGame.json';
const tvAfterGameData = 'tvAfterGame.json';

// Initialize the countdown
setInterval(() => {
  let rawdata = fs.readFileSync(timerData);
  let timer = JSON.parse(rawdata);
  if (!timer || !timer.timer || timer.timer <= 0) return;
  timer.timer -= 1;
  fs.writeFile(timerData, JSON.stringify(timer), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
}, 1000);

// A sample route
app.get('/', (req, res) => {
  // return timer from timer file.
  let rawdata = fs.readFileSync(timerData);
  let timer = JSON.parse(rawdata);
  return res.json(timer);
});

app.post('/', (req, res) => {
  // save to timer file
  console.log(req.body);
  timer = {
    "timer": req.body.timer
  }
  fs.writeFile(timerData, JSON.stringify(timer), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('new timer saved!');
  });
  return res.sendStatus(200);
});

app.post('/logs', (req, res) => {
  // save log to file
  console.log(req.body)
  fs.appendFile('logger.txt', JSON.stringify(req.body) + ",", (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
  });
  return res.sendStatus(201);
});

app.get('/current-game', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team1 = allTeams.find(x => x.id === currentGame.teams[0].id);
  let team2 = allTeams.find(x => x.id === currentGame.teams[1].id);
  currentGame.teams[0].name = team1.name
  currentGame.teams[0].logo = team1.logo
  currentGame.teams[1].name = team2.name
  currentGame.teams[1].logo = team2.logo
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);
  return res.json(currentGame);
});

app.get('/team-one-logo', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team1 = allTeams.find(x => x.id === currentGame.teams[0].id);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);
  return res.json(team1.logo);
});

app.get('/team-two-logo', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team2 = allTeams.find(x => x.id === currentGame.teams[1].id);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);
  return res.json(team2.logo);
});

app.put('/current-game', (req, res) => {
  console.log('put current-game', req.body)
  let currentGame = req.body;
  currentGame.lastUpdated = Date.now()
  if (!currentGame || !currentGame.bestOf || currentGame.bestOf <= 0) return res.sendStatus(501);
  if (!currentGame || !currentGame.gameNr || currentGame.gameNr <= 0) return res.sendStatus(502);
  if (!currentGame || !currentGame.teams || currentGame.teams.length <= 1) return res.sendStatus(503);
  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current game updated');
  });
  return res.sendStatus(200);
});

app.get('/team-one-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams || !currentGame.teams[0]) return res.sendStatus(500);
  return res.json(currentGame.teams[0].gamesWon);
});

app.get('/team-two-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams || !currentGame.teams[1]) return res.sendStatus(500);
  return res.json(currentGame.teams[1].gamesWon);
});

app.put('/team-one-increase-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);

  if (currentGame.gameNr > currentGame.bestOf || currentGame.teams[0].gamesWon === (currentGame.bestOf+1)/2 ) return res.sendStatus(200);
  currentGame.teams[0].gamesWon += 1
  currentGame.gameNr += 1
  currentGame.lastUpdated = Date.now()

  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.put('/team-two-increase-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);

  if (currentGame.gameNr > currentGame.bestOf || currentGame.teams[1].gamesWon === (currentGame.bestOf+1)/2 ) return res.sendStatus(200);
  currentGame.teams[1].gamesWon += 1
  currentGame.gameNr += 1
  currentGame.lastUpdated = Date.now()

  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.put('/team-one-decrease-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);

  if (currentGame.teams[0].gamesWon === 0) return res.sendStatus(200);
  currentGame.teams[0].gamesWon -= 1
  currentGame.gameNr -= 1
  currentGame.lastUpdated = Date.now()

  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.put('/team-two-decrease-wins', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);

  if (currentGame.teams[1].gamesWon === 0) return res.sendStatus(200);
  currentGame.teams[1].gamesWon -= 1
  currentGame.gameNr -= 1
  currentGame.lastUpdated = Date.now()

  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});



app.post('/swap-current-teams', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentTeams = JSON.parse(rawdata);
  if (!currentTeams || !currentTeams.teams) return res.sendStatus(500);
  currentTeams.teams.reverse();
  fs.writeFile(currentGameData, JSON.stringify(currentTeams), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.get('/next-game', (req, res) => {
  let rawdata = fs.readFileSync(nextGameData);
  let nextGame = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team1 = allTeams.find(x => x.id === nextGame.teams[0].id);
  let team2 = allTeams.find(x => x.id === nextGame.teams[1].id);
  nextGame.teams[0].name = team1.name
  nextGame.teams[0].logo = team1.logo
  nextGame.teams[1].name = team2.name
  nextGame.teams[1].logo = team2.logo
  if (!nextGame || !nextGame.teams) return res.sendStatus(500);
  return res.json(nextGame);
});


app.put('/next-game', (req, res) => {
  let nextGame = req.body;
  if (!nextGame || !nextGame.bestOf || nextGame.bestOf <= 0) return res.sendStatus(501);
  if (!nextGame || !nextGame.teams || nextGame.teams.length <= 1) return res.sendStatus(503);
  fs.writeFile(nextGameData, JSON.stringify(nextGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current game updated');
  });
  return res.sendStatus(200);
});

app.post('/swap-next-game', (req, res) => {
  let rawdata = fs.readFileSync(nextGameData);
  let nextTeams = JSON.parse(rawdata);
  if (!nextTeams || !nextTeams.teams) return res.sendStatus(500);
  nextTeams.teams.reverse();
  fs.writeFile(nextGameData, JSON.stringify(nextTeams), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.get('/teams', (req, res) => {
  let rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata);
  if (!allTeams || !allTeams.teams) return res.sendStatus(500);
  return res.json(allTeams);
});

app.post('/teams', (req, res) => {
  let newTeam = req.body;
  console.log(newTeam)
  // fs.writeFile(nextGameData, JSON.stringify(nextGame), (err) => {
  //   // throws an error, you could also catch it here
  //   if (err) throw err;

  //   // success case, the file was saved
  //   console.log('current game updated');
  // });
  return res.sendStatus(200);
});

app.get('/scoreboard2', (req, res) => {
  let rawdata = fs.readFileSync(scoreboardData);
  let scoreboard = JSON.parse(rawdata);
  if (!scoreboard) return res.sendStatus(500);

  let scoreboardTemp = {
    blueTeamImageUrl: 'breidablik.png',
    redTeamImageUrl: 'top/TopReworked/ÞórAkureyri.png',
    blueScore: 3,
    redScore: 2,
    bluePossession: 250,
    redPossession: 180,

    players: [
      {
        name: 'pepsicola.coca',
        goals: 0,
        assists: 2,
        saves: 1,
        shots: 3,
        demos: 3,
        totalBoost: 2136
      }, {
        name: 'emilvald',
        goals: 2,
        assists: 1,
        saves: 3,
        shots: 5,
        demos: 1,
        totalBoost: 2650
      }, {
        name: 'paxole',
        goals: 1,
        assists: 0,
        saves: 1,
        shots: 2,
        demos: 1,
        totalBoost: 2230
      }, {
        name: 'hemmigumm',
        goals: 0,
        assists: 0,
        saves: 3,
        shots: 3,
        demos: 3,
        totalBoost: 2205
      }, {
        name: 'ousic',
        goals: 1,
        assists: 1,
        saves: 2,
        shots: 2,
        demos: 4,
        totalBoost: 2430
      }, {
        name: 'steb',
        goals: 1,
        assists: 0,
        saves: 2,
        shots: 3,
        demos: 3,
        totalBoost: 2320
      }
    ]
  }

  return res.json(scoreboard);
});

// adds a game to current scoreboard
app.put('/scoreboard', (req, res) => {
  let gameinfo = req.body;
  let players = gameinfo.players;
  const fieldDomination = gameinfo.fieldDomination;
  console.log(gameinfo);

  let ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''));
  console.log('put scoreboard request came in');

  let rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;

  ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''));
  console.log('all teams fetched');

  rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);

  ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''))
  console.log('current game data fetched')

  const blueId = currentGame.teams[0].id
  const redId = currentGame.teams[1].id
  const blueTeam = allTeams.find(x => x.id === blueId)
  const redTeam = allTeams.find(x => x.id === redId)
  const blueScore = players[0].goals + players[1].goals + players[2].goals
  const redScore = players[3].goals + players[4].goals + players[5].goals
  const bluePossession = players[0].touches + players[1].touches + players[2].touches
  const redPossession = players[3].touches + players[4].touches + players[5].touches

  ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''))
  console.log('calculated stuff')

  let sc = {
    blueTeamImageUrl: blueTeam.logo,
    redTeamImageUrl: redTeam.logo,
    blueScore: blueScore,
    redScore: redScore,
    bluePossession: bluePossession,
    redPossession: redPossession,
    fieldDomination: fieldDomination,

    players: players
  }

  ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''))
  console.log('object created, writing to file')

  fs.writeFile(scoreboardData, JSON.stringify(sc), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current scoreboard updated');
  });

  ts = new Date();
  console.log(ts.toISOString().split('.')[0].replace(/:/g, ''))
  console.log('writing to file done')

  return res.sendStatus(200);
});

app.post('/create-team', upload.single('file'), (req, res) => {
  // req.file is the name of your file in the form above, here 'uploaded_file'
  // req.body will hold the text fields, if there were any 
  console.log(req.file, req.body)

  let rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata);
  console.log(allTeams)
  let newId = allTeams.teams[allTeams.teams.length - 1].id + 1
  let fileName = req.file.originalname
  let teamName = req.body.teamName
  let acro = req.body.acro
  let team = {
    id: newId,
    name: teamName,
    acro: acro,
    logo: fileName
  };
  allTeams.teams.push(team)

  fs.writeFile(allTeamsData, JSON.stringify(allTeams), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  return res.sendStatus(200);
});

app.post('/reset-scoreboard', (req, res) => {
  let rawdata = fs.readFileSync(scoreboardData);
  let scoreboard = JSON.parse(rawdata);
  if (!scoreboard) return res.sendStatus(500);
  let ts = new Date();
  fs.writeFile('old_games/blabla.json', JSON.stringify(scoreboard), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });
  let filename = 'old_games/' + ts.toISOString().split('.')[0].replace(/:/g, '') + '.json';
  fs.writeFile(filename, JSON.stringify(scoreboard), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });

  scoreboard.scoreboard = []
  fs.writeFile(scoreboardData, JSON.stringify(scoreboard), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;
  });

  return res.sendStatus(200);
});

app.get('/current-week-number', (req, res) => {
  let rawdata = fs.readFileSync(weekNumberData);
  let weekNumber = JSON.parse(rawdata);

  return res.json(weekNumber);
});

app.put('/current-week-number', (req, res) => {
  console.log(req.body)
  let weekNumber = req.body;
  if (!weekNumber) return res.sendStatus(401);
  fs.writeFile(weekNumberData, JSON.stringify(weekNumber), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current week number updated');
  });
  return res.sendStatus(200);
});

app.get('/current-standing', (req, res) => {
  let rawdata = fs.readFileSync(currentStandingData);
  let currentStandings = JSON.parse(rawdata).currentStanding;
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;

  for (i = 0; i < currentStandings.length; i++) {
    let team = allTeams.find(x => x.id === currentStandings[i].id)
    currentStandings[i].name = team.name
    currentStandings[i].logo = team.logo
  }

  if (!currentStandings || currentStandings.length != 8) return res.sendStatus(500);
  return res.json(currentStandings);
});

app.put('/current-standing', (req, res) => {
  console.log(req.body)
  let currentstandings = req.body;
  if (!currentstandings) return res.sendStatus(401);
  fs.writeFile(currentStandingData, JSON.stringify(currentstandings), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current standings updated');
  });
  return res.sendStatus(200);
});

app.get('/toornament-current-standing', async (req, res) => {
  try {

    rawdata = fs.readFileSync(allTeamsData);
    let allTeams = JSON.parse(rawdata).teams;

    //scrape toornament site for info.
    const { data } = await axios.get('https://play.toornament.com/en_US/tournaments/7015421821342982144/stages/7026587216347217920/groups/7067667760943693824/');
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);

    const overallStandings = $('.ranking-item');
    // console.log(overallStandings)

    let toornamentStandingsArray = []

    overallStandings.each((i, el) => {
      // console.log($(el).children)
      let rank = parseInt($(el).children('div:nth-child(1)').text().trim(), 10)
      let logo = $(el).children('div:nth-child(2)').text().trim()
      let name = $(el).children('div:nth-child(3)').text().trim()
      let played = parseInt($(el).children('div:nth-child(4)').text().trim(), 10)
      let won = parseInt($(el).children('div:nth-child(5)').text().trim(), 10)
      let draw = parseInt($(el).children('div:nth-child(6)').text().trim(), 10)
      let lost = parseInt($(el).children('div:nth-child(7)').text().trim(), 10)
      let forfeit = parseInt($(el).children('div:nth-child(8)').text().trim(), 10)
      let gameswon = parseInt($(el).children('div:nth-child(9)').text().trim(), 10)
      let gameslost = parseInt($(el).children('div:nth-child(10)').text().trim(), 10)
      let plusminus = parseInt($(el).children('div:nth-child(11)').text().trim(), 10)
      let points = parseInt($(el).children('div:nth-child(12)').text().trim(), 10)
      if (!points) {
        points = 0;
      }
      toornamentStandingsArray.push({ name, played, won, lost, gameswon, gameslost, plusminus, points })
    });
    //connect info with correct teams in current standings
    console.log(toornamentStandingsArray)
    for (i = 0; i < toornamentStandingsArray.length; i++) {
      let team = allTeams.find(x => x.name === toornamentStandingsArray[i].name)
      console.log(toornamentStandingsArray[i].name)
      console.log(toornamentStandingsArray[i])
      console.log(team)
      toornamentStandingsArray[i].id = team.id
      toornamentStandingsArray[i].logo = team.logo
    }

    //return info as json in nice format.
    return res.json(toornamentStandingsArray);
  } catch (error) {
    console.log(error)
  }
});

app.get('/toornament-current-standing-first', async (req, res) => {
  try {

    rawdata = fs.readFileSync(allTeamsData);
    let allTeams = JSON.parse(rawdata).teams;

    //scrape toornament site for info.
    const { data } = await axios.get('https://play.toornament.com/en_GB/tournaments/4866403712109051904/stages/4905062485454495744/groups/4954169936141074432/');
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data);

    const overallStandings = $('.ranking-item');
    // console.log(overallStandings)

    let toornamentStandingsArray = []

    overallStandings.each((i, el) => {
      // console.log($(el).children)
      let rank = parseInt($(el).children('div:nth-child(1)').text().trim(), 10)
      let logo = $(el).children('div:nth-child(2)').text().trim()
      let name = $(el).children('div:nth-child(3)').text().trim()
      let played = parseInt($(el).children('div:nth-child(4)').text().trim(), 10)
      let won = parseInt($(el).children('div:nth-child(5)').text().trim(), 10)
      let draw = parseInt($(el).children('div:nth-child(6)').text().trim(), 10)
      let lost = parseInt($(el).children('div:nth-child(7)').text().trim(), 10)
      let forfeit = parseInt($(el).children('div:nth-child(8)').text().trim(), 10)
      let gameswon = parseInt($(el).children('div:nth-child(9)').text().trim(), 10)
      let gameslost = parseInt($(el).children('div:nth-child(10)').text().trim(), 10)
      let plusminus = parseInt($(el).children('div:nth-child(11)').text().trim(), 10)
      let points = parseInt($(el).children('div:nth-child(12)').text().trim(), 10)
      toornamentStandingsArray.push({ name, played, won, lost, gameswon, gameslost, points })
    });
    //connect info with correct teams in current standings
    for (i = 0; i < toornamentStandingsArray.length; i++) {
      let team = allTeams.find(x => x.name === toornamentStandingsArray[i].name)
      toornamentStandingsArray[i].id = team ? team.id : null
      toornamentStandingsArray[i].logo = team ? team.logo : ''
    }

    //return info as json in nice format.
    return res.json(toornamentStandingsArray);
  } catch (error) {
    console.log(error)
  }
});

app.get('/games-on-stream', (req, res) => {
  let rawdata = fs.readFileSync(gamesOnStreamData);
  let gamesOnStream = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;

  for (i = 0; i < gamesOnStream.evening.length; i++) {
    let team = allTeams.find(x => x.id === gamesOnStream.evening[i].blueteamId)
    gamesOnStream.evening[i].blueteamName = team.name
    gamesOnStream.evening[i].blueteamLogo = team.logo

    team = allTeams.find(x => x.id === gamesOnStream.evening[i].orangeteamId)
    gamesOnStream.evening[i].orangeteamName = team.name
    gamesOnStream.evening[i].orangeteamLogo = team.logo
  }

  if (!gamesOnStream) return res.sendStatus(500);
  return res.json(gamesOnStream);
});

app.put('/games-on-stream', (req, res) => {
  console.log(req.body)
  let gamesOnStream = req.body;
  if (!gamesOnStream) return res.sendStatus(401);
  fs.writeFile(gamesOnStreamData, JSON.stringify(gamesOnStream), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('Games on stream updated');
  });
  return res.sendStatus(200);
});

app.get('/playoffs', (req, res) => {
  let rawdata = fs.readFileSync(playoffsData);
  let playoffs = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;

  if (playoffs.m11Team1Id) {
    let m11Team1 = playoffs.m11Team1Id ? allTeams.find(x => x.id === playoffs.m11Team1Id) : null;
    playoffs.m11Team1name = m11Team1.name
    playoffs.m11Team1logo = m11Team1.logo
  }
  if (playoffs.m11Team2Id) {
    let m11Team2 = playoffs.m11Team2Id ? allTeams.find(x => x.id === playoffs.m11Team2Id) : null;
    playoffs.m11Team2name = m11Team2.name
    playoffs.m11Team2logo = m11Team2.logo
  }

  if (playoffs.m12Team1Id) {
    let m12Team1 = playoffs.m12Team1Id ? allTeams.find(x => x.id === playoffs.m12Team1Id) : null;
    playoffs.m12Team1name = m12Team1.name
    playoffs.m12Team1logo = m12Team1.logo
  }
  if (playoffs.m12Team2Id) {
    let m12Team2 = playoffs.m12Team2Id ? allTeams.find(x => x.id === playoffs.m12Team2Id) : null;
    playoffs.m12Team2name = m12Team2.name
    playoffs.m12Team2logo = m12Team2.logo
  }

  if (playoffs.semi1Team1Id) {
    let semi1Team1 = playoffs.semi1Team1Id ? allTeams.find(x => x.id === playoffs.semi1Team1Id) : null;
    playoffs.semi1Team1name = semi1Team1.name
    playoffs.semi1Team1logo = semi1Team1.logo
  }
  if (playoffs.semi1Team2Id) {
    let semi1Team2 = playoffs.semi1Team2Id ? allTeams.find(x => x.id === playoffs.semi1Team2Id) : null;
    playoffs.semi1Team2name = semi1Team2.name
    playoffs.semi1Team2logo = semi1Team2.logo
  }

  if (playoffs.semi2Team1Id) {
    let semi2Team1 = playoffs.semi2Team1Id ? allTeams.find(x => x.id === playoffs.semi2Team1Id) : null;
    playoffs.semi2Team1name = semi2Team1.name
    playoffs.semi2Team1logo = semi2Team1.logo
  }
  if (playoffs.semi2Team2Id) {
    let semi2Team2 = playoffs.semi2Team2Id ? allTeams.find(x => x.id === playoffs.semi2Team2Id) : null;
    playoffs.semi2Team2name = semi2Team2.name
    playoffs.semi2Team2logo = semi2Team2.logo
  }

  if (playoffs.thirdTeam1Id) {
    let thirdTeam1 = playoffs.thirdTeam1Id ? allTeams.find(x => x.id === playoffs.thirdTeam1Id) : null;
    playoffs.thirdTeam1name = thirdTeam1.name
    playoffs.thirdTeam1logo = thirdTeam1.logo
  }
  if (playoffs.thirdTeam2Id) {
    let thirdTeam2 = playoffs.thirdTeam2Id ? allTeams.find(x => x.id === playoffs.thirdTeam2Id) : null;
    playoffs.thirdTeam2name = thirdTeam2.name
    playoffs.thirdTeam2logo = thirdTeam2.logo
  }

  if (playoffs.finalTeam1Id) {
    let finalTeam1 = playoffs.finalTeam1Id ? allTeams.find(x => x.id === playoffs.finalTeam1Id) : null;
    playoffs.finalTeam1name = finalTeam1.name
    playoffs.finalTeam1logo = finalTeam1.logo
  }
  if (playoffs.finalTeam2Id) {
    let finalTeam2 = playoffs.finalTeam2Id ? allTeams.find(x => x.id === playoffs.finalTeam2Id) : null;
    playoffs.finalTeam2name = finalTeam2.name
    playoffs.finalTeam2logo = finalTeam2.logo
  }

  if (!playoffs) return res.sendStatus(500);
  return res.json(playoffs);
});


app.put('/playoffs', (req, res) => {
  console.log(req.body)
  let playoffs = req.body;
  fs.writeFile(playoffsData, JSON.stringify(playoffs), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current game updated');
  });
  return res.sendStatus(200);
});

app.get('/double-elim', (req, res) => {
  let rawdata = fs.readFileSync(doubleElimData);
  let doubleElim = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;

  for (let i = 0; doubleElim.length > i; i++) {
    if (doubleElim[i]) {
      let Team1 = doubleElim[i].Team1Id ? allTeams.find(x => x.id === doubleElim[i].Team1Id) : null;
      doubleElim[i].Team1name = Team1.name
      doubleElim[i].Team1logo = Team1.logo
      let Team2 = doubleElim[i].Team2Id ? allTeams.find(x => x.id === doubleElim[i].Team2Id) : null;
      doubleElim[i].Team2name = Team2.name
      doubleElim[i].Team2logo = Team2.logo
    }
  }

  if (!doubleElim) return res.sendStatus(500);
  return res.json(doubleElim);
});

app.put('/double-elim', (req, res) => {
  console.log(req.body)
  let doubleElim = req.body;
  fs.writeFile(doubleElimData, JSON.stringify(doubleElim), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current game updated');
  });
  return res.sendStatus(200);
});

app.get('/tv-before-game', (req, res) => {
  let rawdata = fs.readFileSync(currentGameData);
  let currentGame = JSON.parse(rawdata);
  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team1 = allTeams.find(x => x.id === currentGame.teams[0].id);
  let team2 = allTeams.find(x => x.id === currentGame.teams[1].id);
  currentGame.teams[0].name = team1.name
  currentGame.teams[0].logo = team1.logo
  currentGame.teams[1].name = team2.name
  currentGame.teams[1].logo = team2.logo
  if (!currentGame || !currentGame.teams) return res.sendStatus(500);
  return res.json(currentGame);
});

app.put('/tv-before-game', (req, res) => {
  console.log(req.body)
  let currentGame = req.body;
  if (!currentGame || !currentGame.bestOf || currentGame.bestOf <= 0) return res.sendStatus(501);
  if (!currentGame || !currentGame.gameNr || currentGame.gameNr <= 0) return res.sendStatus(502);
  if (!currentGame || !currentGame.teams || currentGame.teams.length <= 1) return res.sendStatus(503);
  fs.writeFile(currentGameData, JSON.stringify(currentGame), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('current game updated');
  });
  return res.sendStatus(200);
});

app.put('/create-new-poll', (req, res) => {
  console.log(req.body)
  let pollInfo = req.body;
  if (!pollInfo || !pollInfo.team1hash || !pollInfo.team2hash || !pollInfo.team1Id || !pollInfo.team2Id) return res.sendStatus(501);
  twitchPoll.createNewPoll(pollInfo.team1Id, pollInfo.team1hash, pollInfo.team2Id, pollInfo.team2hash)
  return res.sendStatus(200);
});

app.get('/get-poll-statistics', (req, res) => {
  stats = twitchPoll.getStatistics()
  if (!stats) return res.sendStatus(404)

  rawdata = fs.readFileSync(allTeamsData);
  let allTeams = JSON.parse(rawdata).teams;
  let team1 = allTeams.find(x => x.id === stats.team1Id);
  let team2 = allTeams.find(x => x.id === stats.team2Id);
  stats.team1Name = team1.name
  stats.team1Logo = team1.logo
  stats.team1hash = team1.acro
  stats.team2Name = team2.name
  stats.team2Logo = team2.logo
  stats.team2hash = team2.acro

  return res.json(stats);
});

app.put('/start-poll', (req, res) => {
  twitchPoll.startPoll()
  return res.sendStatus(200);
});

app.put('/stop-poll', (req, res) => {
  twitchPoll.stopPoll()
  return res.sendStatus(200);
});

app.put('/show-poll', (req, res) => {
  twitchPoll.showPoll()
  return res.sendStatus(200);
});

app.put('/hide-poll', (req, res) => {
  twitchPoll.hidePoll()
  return res.sendStatus(200);
});

app.put('/show-poll-statistics', (req, res) => {
  twitchPoll.showStatistics()
  return res.sendStatus(200);
});

app.put('/hide-poll-statistics', (req, res) => {
  twitchPoll.hideStatistics()
  return res.sendStatus(200);
});

// Start the Express server
app.listen(3002, () => console.log('Server running on port 3002!'))