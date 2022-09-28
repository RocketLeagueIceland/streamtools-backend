const tmi = require('tmi.js');
const fs = require('fs');


class TwitchPoll {
  constructor(team1Id, team1hash, team2Id, team2hash) {

    this.team1Id = team1Id;
    this.team1hash = team1hash;
    this.team2Id = team2Id;
    this.team2hash = team2hash;

    this.isStarted = false
    this.isCreated = false
    this.isShowing = false
    this.isShowingStatistics = false

    this.statistics = {
      "hash1": { 'initial_value': 0 },
      "hash2": { 'initial_value': 0 },
    }

    this.client = new tmi.Client({
      channels: ['rocketleagueiceland']
    });
  }

  getStatistics() {
    if (!this.isStarted && !this.isCreated) {
      return {
        isShowing: this.isShowing,
        isShowingStatistics: this.isShowingStatistics,

        team1Id: this.team1Id,
        team1hash: this.team1hash,
        team1Total: 0,
        team2Id: this.team2Id,
        team2hash: this.team2hash,
        team2Total: 0
      }
    }
    const team1Stat = Object.values(this.statistics.hash1).reduce((a, b) => a + b, 0);
    const team2Stat = Object.values(this.statistics.hash2).reduce((a, b) => a + b, 0);

    if (team1Stat == 0 && team2Stat == 0)
      return {
        isShowing: this.isShowing,
        isShowingStatistics: this.isShowingStatistics,

        team1Id: this.team1Id,
        team1hash: this.team1hash,
        team1Total: 0,
        team2Id: this.team2Id,
        team2hash: this.team2hash,
        team2Total: 0
      }

    let results = {
      isShowing: this.isShowing,
      isShowingStatistics: this.isShowingStatistics,  
      team1Id: this.team1Id,
      team1hash: this.team1hash,
      team1Total: team1Stat / (team1Stat + team2Stat),
      team2Id: this.team2Id,
      team2hash: this.team2hash,
      team2Total: team2Stat / (team1Stat + team2Stat)
    };
    return results
  }

  createNewPoll(team1Id, team1hash, team2Id, team2hash) {
    this.isShowingStatistics = false;
    this.team1Id = team1Id;
    this.team1hash = team1hash;
    this.team2Id = team2Id;
    this.team2hash = team2hash;

    this.statistics = {
      "hash1": { 'initial_value': 0 },
      "hash2": { 'initial_value': 0 },
    }
  }

  startPoll() {
    if (this.isStarted) {
      return;
    }
    this.client.connect()

    this.client.on('message', (channel, tags, message, self) => {

      if (message.toLowerCase() == this.team1hash.toLowerCase()) {
        this.statistics.hash1[tags['display-name']] = 1
        this.statistics.hash2[tags['display-name']] = 0
      }
      if (message.toLowerCase() == this.team2hash.toLowerCase()) {
        this.statistics.hash1[tags['display-name']] = 0
        this.statistics.hash2[tags['display-name']] = 1
      }

    });
    this.isStarted = true;
  }

  stopPoll() {
    if (!this.isStarted) {
      return;
    }
    this.client.disconnect()
    this.isStarted = false;
    let ts = new Date();
    fs.writeFile('twitch_polls/newest.json', JSON.stringify(this.statistics), (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;
    });
    let filename = 'twitch_polls/' + ts.toISOString().split('.')[0].replace(/:/g, '') + '.json';
    fs.writeFile(filename, JSON.stringify(this.statistics), (err) => {
      // throws an error, you could also catch it here
      if (err) throw err;
    });
  }

    showPoll() {
    this.isShowing = true;
  }

  hidePoll() {
    this.isShowing = false;
  }

  showStatistics() {
    this.isShowingStatistics = true
  }

  hideStatistics() {
    this.isShowingStatistics = false
  }
}

module.exports = TwitchPoll;