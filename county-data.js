
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const json2csv = require('json2csv');


const OUTPUT_FILE_NAME = 'county_data.csv';

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
    writeData({county_name: county_name, state: state}, () => {
      doNextCounty();
    });
  });
};

var counties = [
  {county_name: 'Broward', state: 'FL'},
  {county_name: 'Fort Bend', state: 'TX'},
  {county_name: 'Travis', state: 'TX'},
  {county_name: 'Montgomergy', state: 'TX'},
  {county_name: 'Williamson', state: 'TX'},
  {county_name: 'Hays', state: 'TX'},
  {county_name: 'Santa Clara', state: 'CA'},
  {county_name: 'Bernalillo', state: 'NM'},
  {county_name: 'Santa Fe', state: 'NM'},
  {county_name: 'La Plata', state: 'CO'},
  {county_name: 'Los Angeles', state: 'CA'},
  {county_name: 'Miami-Dade', state: 'FL'},
];

const writeData = (data, callback) => {
  fs.open(OUTPUT_FILE_NAME, 'a', (err, fd) => {
    if (err) throw err;
    fs.appendFile(fd, JSON.stringify(data) + '\n', 'utf8', (err) => {
      fs.close(fd, (err) => {
        if (err) throw err;
        //callback here
        callback();
      });
      if (err) throw err;
    });
  })
};

const doNextCounty = () => {
  var nextCounty = counties.shift();
  if (nextCounty) {
    setTimeout(() => {
      processCounty(nextCounty.county_name, nextCounty.state);
    }, 500);
  }
};

fs.exists(OUTPUT_FILE_NAME, (exists) => {
  if (exists) {
    fs.unlink(OUTPUT_FILE_NAME, (err) => {
      doNextCounty();
    });
  } else {
    doNextCounty();
  }
});
