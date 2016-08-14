'use strict';

const _ = require('lodash');

const teamCount = 72;
const breakCount = 16;
const numberOfRuns = 1000;

function generateTeam() {
  return {
    skill: Math.random() * 20,
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

  console.log(`${rogueTeams} / ${breakCount} (${Math.round(100*rogueTeams/breakCount)}%) Underdogs in break`);
  console.log(`${inversions} (${Math.round(100 * inversions / (breakCount * (breakCount - 1) * 0.5))}%) Inversions in break order (unsortedness)`);

  if (breaking) {
    breaking.forEach((team, i) => {
      console.log(`${i + 1}. Team ${team.index}`);
    });
  }
}

function averageStats(stats) {
  let inversions = 0;
  let rogueTeams = 0;
  stats.forEach(stat => {
    inversions += stat.inversions;
    rogueTeams += stat.rogueTeams;
  });
  inversions /= stats.length;
  rogueTeams /= stats.length;
  return { inversions, rogueTeams }
}

function evaluateStrategies(name, strategies) {
  console.log(`### ${name}`);
  console.log('');

  console.log(`Average stats for ${numberOfRuns} runs:`);
  printStats(
    averageStats(
      _.times(numberOfRuns, () => simulateTournament(strategies))
    )
  );

  console.log('Random sample:')
  printStats(simulateTournament(strategies));

  console.log('-------------------------\n');
}

evaluateStrategies('8x High-High - teams cannot meet twice', _.times(8, () => playHighHigh(false)));
evaluateStrategies('8x High-High - teams can meet twice', _.times(8, () => playHighHigh(true)));

evaluateStrategies('6x High-High + High-Low + High-High - teams cannot meet twice', [
  ..._.times(8, () => playHighHigh(false)),
  playHighLow(false),
  playHighHigh(false)
]);

evaluateStrategies('6x High-High + High-Low + High-High - teams can meet twice', [
  ..._.times(8, () => playHighHigh(true)),
  playHighLow(false),
  playHighHigh(false)
]);

evaluateStrategies('6x High-High + 2x High-Low - teams cannot meet twice', [
  ..._.times(8, () => playHighHigh(false)),
  ..._.times(2, () => playHighLow(false))
]);

evaluateStrategies('6x High-High + 2x High-Low teams can meet twice', [
  ..._.times(8, () => playHighHigh(true)),
  ..._.times(2, () => playHighLow(true))
]);
