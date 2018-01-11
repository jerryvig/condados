
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const processCounty = (county_name, state) => {
  const url = 'http://www.city-data.com/county/' + county_name.replace(/ /g, '_') + '_County-' + state + '.html';
  fetch(url)
    .then((res) => {
      return res.text();
    }).then((body) => {

      const $ = cheerio.load(body);
      const fb = $('#foreign-born-population');
      let fbLines = fb.text().split('\n');

      for (let line of fbLines) {
        if (line.startsWith('Number of foreign born residents')) {
          let afterColon = line.split(':')[1].trim();
          console.log(afterColon.split(' ')[0]);
        }
        if (line.startsWith(county_name + ' County:')) {
          let afterColon = line.split(':')[1];
          let pct = afterColon.split('%')[0];
          console.log(pct + '%');
        }
      }
  }).then(() => {
    doNextCounty();
  });
};


var counties = [
  {county_name: 'Broward', state: 'FL'},
  {county_name: 'Fort Bend', state: 'TX'},
  {county_name: 'Santa Clara', state: 'CA'},
  {county_name: 'Bernalillo', state: 'NM'},
];

const doNextCounty = () => {
  var nextCounty = counties.shift();
  if (nextCounty) {
    setTimeout(() => {
      processCounty(nextCounty.county_name, nextCounty.state);
    }, 500);
  }
};

fs.exists('county_data.csv', (exists) => {
  if (exists) {
    fs.unlink('county_data.csv', (err) => {
      doNextCounty();
    });
  } else {
    doNextCounty();
  }
});
