'use strict';

const _ = require('lodash');

const teamCount = 72;
const breakCount = 16;
const roundCount = 8;
const numberOfRuns = 1000;

function generateTeam() {
  return {
    skill: Math.random() * 7,
    variance: 3 + 2 * Math.random(),
    playedWith: [],
    score: 0,
    wins: 0,
    index: null,
  };
}

function generateTeams(count) {
  var teams = [];
  for (var i = 0; i < count; i++) {
    teams.push(generateTeam());
  }
  teams.sort(function (a, b) {
    return b.skill - a.skill;
  });
  for (var i = 0; i < count; i++) {
    teams[i].index = i;
  }
  return _.shuffle(teams);
}

function simulateScore(team) {
  return team.skill + (Math.random() * 2 - 1) * team.variance;
}

function simulateMatch(team1, team2) {
  var score1 = simulateScore(team1);
  var score2 = simulateScore(team2);
  team1.score += score1;
  team2.score += score2;
  team1.playedWith.push(team2.index);
  team2.playedWith.push(team1.index);
  if (score1 > score2) {
    team1.wins++;
  } else {
    team2.wins++;
  }
}

function sortTeams(teams) {
  teams.sort(function (a, b) {
    if (a.wins === b.wins) {
      return b.score - a.score;
    }
    return b.wins - a.wins;
  });
}

function conflicting(team1, team2) {
  for (var i = 0, n = team2.playedWith.length; i < n; i++) {
    if (team2.playedWith[i] === team1.index) {
      return true;
    }
  }
  return false;
}

const playHighHigh = meetTwice => teams => {
  sortTeams(teams);
  var n = teams.length;
  var picked = [];
  for (var i = 0; i < n; i++) {
    picked.push(false);
  }

  for (var i = 0; i < n/2; i++) {
    for (var j = 0; j < n; j++) {
      if (!picked[j]) {
        var team1 = teams[j];
        picked[j] = true;
        for (var k = j+1; k < n; k++) {
          if (!picked[k] && (meetTwice || !conflicting(team1, teams[k]))) {
            picked[k] = true;
            simulateMatch(team1, teams[k]);
          }
        }

      }
    }
  }
}

const playHighLow = meetTwice => teams => {
  sortTeams(teams);

  // Code adapted from Tabs and automatically converted from Cofeescript

  var nbv; //2-3 char variable names. I was a horrible person
  var j;
  var bu;
  var bp;
  var vbn;
  var tb;
  var ta;
  var fl;
  var rid;
  var index;
  var minByes;

  const brackets = {};
  const bracketsArray = [];

  teams.forEach((team, i) => {
    team.rank = i;
    team.paired = false;
    var nbal = team.wins;
    let bracket = brackets[nbal];

    if (!bracket) {
      bracket = brackets[nbal] = {
        teams: [],
        ballots: nbal
      };
      bracketsArray.push(bracket);
    }
    bracket.teams.push(team);
  });

  let nextBracket;
  const pull = (bracket, count, avoidedSide) => {
    bracket.teams.sort(function(a, b) {
      return b.rank - a.rank;
    });

    bracket.teams = _.filter(bracket.teams, function(a) {
      if (count > 0) {
        count--;
        nextBracket.teams.push(a);
        return false;
      }
      return true;
    });
  };

  bracketsArray.sort(function(a, b) {
    return b.ballots - a.ballots;
  });

  vbn = bracketsArray.length;

  bracketsArray.forEach((bracket, i) => {
    var bn = bracket.teams.length;

    if (!bn) { return; }

    nextBracket = bracketsArray[i + 1];

    if (nextBracket != null) {
      if (bn & 1) {
        pull(bracket, 1);
      }

      j = i + 1;

      while (nextBracket != null && nextBracket.length === 0) {
        nextBracket = bracketsArray[++j];
      }

      if (nextBracket != null) {
        bn = bracket.teams.length;
        nbv = nextBracket.teams;

        // if (bn < opts.matchesPerBracket * 2) {
        //   bracket.teams.forEach(function(o) {
        //     return nbv.push(o);
        //   });
        //
        //   bracket.teams.length = 0;
        // }
      }
    }

    bracket.teams.sort(function(a, b) {
      return a.rank - b.rank;
    });

    bracket.teams.forEach(team => {
      if (team.paired) { return; }

      for (let otherTeam of bracket.teams) {
        if (!otherTeam.paired && (meetTwice || !conflicting(team, otherTeam))) {
          team.paired = true;
          otherTeam.paired = true;
          simulateMatch(team, otherTeam);
          return;
        }
      }

      for (let otherTeam of bracket.teams) {
        if (!otherTeam.paired) {
          team.paired = true;
          otherTeam.paired = true;
          simulateMatch(team, otherTeam);
          return;
        }
      }
    });
  });
}

function playTournament(strategies) {
  const teams = generateTeams(teamCount);
  strategies.forEach(strategy => {
    strategy(teams);
  });
  sortTeams(teams);
  return teams;
}

function simulateTournament(strategies) {
  const teams = playTournament(strategies);
  const breaking = _.take(teams, breakCount);

  const rogueTeams = breaking.reduce((acc, team) =>
    team.index > breakCount ? acc + 1 : acc
  , 0);

  let inversions = 0;
  for (let i = 0; i < breakCount; i++) {
    for (let j = i + 1; j < breakCount; j++) {
      if (breaking[i].index > breaking[j].index) {
        inversions++;
      }
    }
  }

  return { breaking, rogueTeams, inversions };
}

function printStats(stats) {
  const rogueTeams = stats.rogueTeams;
  const breaking = stats.breaking;
  const inversions = stats.inversions;
  const inversionsDev = stats.inversionsDev;
  const rogueTeamsDev = stats.rogueTeamsDev;

  const roguePercent = 100 * rogueTeams / breakCount;
  const inversionsPercent = 100 * inversions / (breakCount * (breakCount - 1) * 0.5);

  if (process.env.PRINT_CSV) {
    process.stdout.write(`,${rogueTeams},${roguePercent}`);
    if (rogueTeamsDev) { process.stdout.write(`,${rogueTeamsDev}`); }
    process.stdout.write(`,${inversions},${inversionsPercent}`);
    if (inversionsDev) { process.stdout.write(`,${inversionsDev}`); }
  } else {
    console.log(`${rogueTeams} / ${breakCount} (${Math.round(roguePercent)}%) Underdogs in break`);
    if (rogueTeamsDev) { console.log(`${rogueTeamsDev} Underdogs standard deviation`); }
    console.log(`${inversions} (${Math.round(inversionsPercent)}%) Inversions in break order (unsortedness)`);
    if (inversionsDev) { console.log(`${inversionsDev} Inversions standard deviation`); }

    if (breaking) {
      breaking.forEach((team, i) => {
        console.log(`${i + 1}. Team ${team.index}`);
      });
    }
  }
}

function averageStats(stats) {
  let inversions = 0;
  let rogueTeams = 0;
  let inversionsDev = 0;
  let rogueTeamsDev = 0;

  stats.forEach(stat => {
    inversions += stat.inversions;
    rogueTeams += stat.rogueTeams;
  });
  inversions /= stats.length;
  rogueTeams /= stats.length;

  stats.forEach(stat => {
    inversionsDev += Math.pow(stat.inversions - inversions, 2)
    rogueTeamsDev += Math.pow(stat.rogueTeams - rogueTeams, 2)
  });

  inversionsDev = Math.sqrt(inversionsDev / stats.length);
  rogueTeamsDev = Math.sqrt(rogueTeamsDev / stats.length);

  return { inversions, inversionsDev, rogueTeams, rogueTeamsDev }
}

function evaluateStrategies(name, strategies) {
  if (process.env.PRINT_CSV) {
    process.stdout.write(name);
  } else {
    console.log(`### ${name}`);
    console.log('');
    console.log(`Average stats for ${numberOfRuns} runs:`);
  }

  printStats(
    averageStats(
      _.times(numberOfRuns, () => simulateTournament(strategies))
    )
  );

  // console.log('Random sample:')
  // printStats(simulateTournament(strategies));

  if (process.env.PRINT_CSV) {
    process.stdout.write(`\n`);
  } else {
    console.log('-------------------------\n');
  }
}

if (process.env.PRINT_CSV) {
  // const strategyHeader = 'Strategy';
  const strategyHeader = 'Meet twice,' + _.times(roundCount, i => `R${i + 1}`).join(',');
  console.log(`${strategyHeader},Underdogs,Underdogs %,Underdogs StdDev,Inversions,Inversions %,Inversions StdDev`);
}

function evaluateAllStrategies(name, strategies, canMeet) {
  if (strategies.length === roundCount) {
    evaluateStrategies(name, strategies);
    return;
  }
  evaluateAllStrategies(name + ',HH', [...strategies, playHighHigh(canMeet)], canMeet);
  evaluateAllStrategies(name + ',HL', [...strategies, playHighLow(canMeet)], canMeet);
}

evaluateAllStrategies('Yes,RND', [playHighHigh(true)], true);
evaluateAllStrategies('No,RND', [playHighHigh(false)], false);

// evaluateStrategies('8HH - teams cannot meet twice', _.times(8, () => playHighHigh(false)));
// evaluateStrategies('8HH - teams can meet twice', _.times(8, () => playHighHigh(true)));
//
// evaluateStrategies('6HH + HL + HH - teams cannot meet twice', [
//   ..._.times(6, () => playHighHigh(false)),
//   playHighLow(false),
//   playHighHigh(false)
// ]);
//
// evaluateStrategies('6HH + HL + HH - teams can meet twice', [
//   ..._.times(6, () => playHighHigh(true)),
//   playHighLow(true),
//   playHighHigh(true)
// ]);
//
// evaluateStrategies('6HH + 2HL - teams cannot meet twice', [
//   ..._.times(6, () => playHighHigh(false)),
//   ..._.times(2, () => playHighLow(false))
// ]);
//
// evaluateStrategies('6HH + 2HL teams can meet twice', [
//   ..._.times(6, () => playHighHigh(true)),
//   ..._.times(2, () => playHighLow(true))
// ]);
//
// evaluateStrategies('6HH + 2HL - teams cannot meet twice', [
//   ..._.times(6, () => playHighHigh(false)),
//   ..._.times(2, () => playHighLow(false))
// ]);
//
// evaluateStrategies('6HH + 2HL - teams can meet twice', [
//   ..._.times(6, () => playHighHigh(true)),
//   ..._.times(2, () => playHighLow(true))
// ]);
//
// evaluateStrategies('5HH + 2HL + HH - teams cannot meet twice', [
//   ..._.times(6, () => playHighHigh(false)),
//   ..._.times(2, () => playHighLow(false))
// ]);
//
// evaluateStrategies('5HH + 2HL + HH - teams can meet twice', [
//   ..._.times(6, () => playHighHigh(true)),
//   ..._.times(2, () => playHighLow(true))
// ]);
