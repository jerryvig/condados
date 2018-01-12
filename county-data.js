
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const json2csv = require('json2csv');

const INPUT_FILE_NAME = 'county_list_NV.csv';
const OUTPUT_FILE_NAME = 'county_data_NV.csv';

const processCounty = (county_name, state) => {
  const url = 'http://www.city-data.com/county/' + county_name.replace(/ /g, '_') + '_County-' + state + '.html';
  let data = {
    county_name: county_name,
    state: state,
  };

  console.log('Fetching %s, %s', county_name, state);
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
          data.foreign_born = afterColon.split(' ')[0];
        }
        if (line.startsWith(county_name + ' County:')) {
          let afterColon = line.split(':')[1];
          let pct = afterColon.split('%')[0];
          data.foreign_born_pct = pct + '%';
        }
      }

      const household = $('#household-prices');
      let householdLines = household.text().split('\n');

      for (let line of householdLines) {
        if (line.startsWith('Estimated median household income')) {
          let afterColon = line.split(':')[1].trim();
          data.median_household_income = afterColon.split(' ')[0];
        }

        if (line.startsWith('Estimated median house or condo value')) {
          let afterColon = line.split(':')[1].trim();
          data.median_home_price = afterColon.split(' ')[0];
        }
      }

      const population = $('#population');
      let popLines = population.text().split('\n');
      for (let line of popLines) {
        if (line.startsWith('County population in')) {
          data.population = line.split(':')[1].trim().split(' ')[0];
        }
      }
  }).then(() => {
    writeData(data, () => {
      doNextCounty();
    });
  });
};

let counties = [];

const readCounties = (callback) => {
  fs.readFile(INPUT_FILE_NAME, 'utf8', (err, data) => {
    if (err) throw err;
    let lines = data.split('\n');
    lines.forEach((line) => {
      let parts = line.split(',');
      if (parts.length > 1) {
        counties.push({
          county_name: parts[0],
          state: parts[1],
        });
      }
    });
    callback();
  });
};

const writeData = (data, callback) => {
  fs.open(OUTPUT_FILE_NAME, 'a', (err, fd) => {
    if (err) throw err;
    fs.appendFile(fd, json2csv({
      data: data,
      hasCSVColumnTitle: false
    }) + '\n', 'utf8', (err) => {
      fs.close(fd, (err) => {
        if (err) throw err;
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
    }, 1000);
  }
};

const checkOutputFileExits = () => {
  fs.exists(OUTPUT_FILE_NAME, (exists) => {
    if (exists) {
      fs.unlink(OUTPUT_FILE_NAME, (err) => {
        doNextCounty();
      });
    } else {
      doNextCounty();
    }
  });
};

readCounties(checkOutputFileExits);
