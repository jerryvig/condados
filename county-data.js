
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const json2csv = require('json2csv');

const state = 'NM'
const INPUT_FILE_NAME = `county_list_${state}.csv`;
const OUTPUT_FILE_NAME = `county_data_${state}.json`;
const CSV_OUTPUT = `county_data_${state}.csv`;

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

      const popDensity = $('#population-density');
      let popDensityLines = popDensity.text().split('\n');
      for (let line of popDensityLines) {
        if (line.startsWith('Population density')) {
          data.population_density = line.split(':')[1].trim().split(' ')[0];
        } else if (line.startsWith('Land area')) {
          data.land_area = line.split(':')[1].trim().split(' ')[0].trim();
        }
      }

      const medianAge = $('#median-age');
      let medianAgeLines = medianAge.text().split('\n');
      for (let line of medianAgeLines) {
        if (line.startsWith('Median resident age')) {
          data.median_age = line.split(':')[1].trim().split(' ')[0];
        }
      }

      const razas = $('#races');
      let razasLines = razas.text().split('\n');
      for (let line of razasLines) {
        if (line.startsWith('White Non-Hispanic Alone')) {
          data.white_pct = line.split('(')[1].split(')')[0];
        }
        if (line.startsWith('Black Non-Hispanic Alone')) {
          data.black_pct = line.split('(')[1].split(')')[0];
        }
        if (line.startsWith('Hispanic or Latino')) {
          data.hispanic_pct = line.split('(')[1].split(')')[0];
        }
        if (line.startsWith('Asian alone')) {
          data.asian_pct = line.split('(')[1].split(')')[0];
        }
        if (line.startsWith('American Indian and Alaska Native alone')) {
          data.native_american_pct = line.split('(')[1].split(')')[0];
        }
      }

      const students = $('#students');
      let studentLines = students.text().split('\n');
      for (let line of studentLines) {
        if (line.startsWith('People 25 years of age or older with a high school degree or higher')) {
          data.hs_diploma = line.split(':')[1].trim();
        }
        if (line.startsWith('People 25 years of age or older with a bachelor\'s degree or higher')) {
          data.bs_degree = line.split(':')[1].trim();
        }
      }

      const genders = $('#population-by-sex');
      let genderLines = genders.text().split('\n');
      for (let line of genderLines) {
        if (line.startsWith('Males')) {
          let parenParts = line.split('(');
          data.males = parenParts[0].split(':')[1].trim();
          data.females = parenParts[1].split(':')[1].trim();
        }
      }

      const householdPrices = $('#household-prices');
      let householdPricesLines = householdPrices.text().split('\n');
      for (let line of householdPricesLines) {
        if (line.endsWith('people')) {
          if (line.startsWith(county_name)) {
            data.household_size = line.split(':')[1].split(' ')[0];
          }
        }
      }

      const costOfLivingLines = $('#cost-of-living').text().split('\n');
      for (let line of costOfLivingLines) {
        if (line.includes('cost of living index')) {
          data.cost_of_living_index = line.split(':')[1].split(' ')[1];
          break;
        }
      }

      const povertyLines = $('#poverty').text().split('\n');
      for (let line of povertyLines) {
        if (line.startsWith('Percentage of residents living in poverty in')) {
          data.poverty = line.split(':')[1].trim();
          break;
        }
      }
  }).then(writeData.bind(null, data, doNextCounty));
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
    fs.appendFile(fd,
      JSON.stringify(data) + ',\n'
      , 'utf8', (err) => {
      fs.close(fd, (err) => {
        if (err) throw err;
        callback();
      });
      if (err) throw err;
    });
  })
};

const doNextCounty = () => {
  let nextCounty = counties.shift();
  if (nextCounty) {
    setTimeout(
      processCounty.bind(null, nextCounty.county_name, nextCounty.state), 1000)
  } else {
    fs.open(OUTPUT_FILE_NAME, 'a', (err, fd) => {
      if (err) throw err;
      fs.appendFile(fd, ']\n', 'utf8', (err) => {
        if (err) throw err;
        fs.close(fd, (err) => {
          if (err) throw err;
          fs.readFile(OUTPUT_FILE_NAME, 'utf8', (err, data) => {
            if (err) throw err;
            let jsonOutput = json2csv({data: eval(data)}) + '\n';
            fs.writeFile(CSV_OUTPUT, jsonOutput, 'utf8', (err, fd) => {
              if (err) throw err;
            });
          });
        });
      });
    });
  }
};

const checkOutputFileExits = () => {
  fs.exists(OUTPUT_FILE_NAME, (exists) => {
    if (exists) {
      fs.unlink(OUTPUT_FILE_NAME, (err) => {
        if (err) throw err;
        fs.open(OUTPUT_FILE_NAME, 'a', (err, fd) => {
          if (err) throw err;
          fs.appendFile(fd, '[\n', 'utf8', (err) => {
            if (err) throw err;
            doNextCounty();
          });
        });
      });
    } else {
      doNextCounty();
    }
  });
};

readCounties(checkOutputFileExits);
