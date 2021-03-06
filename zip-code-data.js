
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs');
const json2csv = require('json2csv');

const INPUT_FILE_NAME = 'zip_code_list.csv';
const OUTPUT_FILE_NAME = 'zip_code_data.json';
const CSV_OUTPUT = 'zip_code_data.csv';
const THROTTLE_PERIOD = 1200;

const processZipCode = (zip_code) => {
  const url = 'http://www.city-data.com/zips/' + zip_code + '.html';
  let data = {
    zip_code: zip_code,
  };

  console.log('Fetching zip code', zip_code);
  fetch(url)
    .then((res) => {
      return res.text();
    }).then((body) => {
      const $ = cheerio.load(body);

      let lines = $('#body').text().split('\n');

      //population
      for (let line of lines) {
        if (line.includes('Estimated zip code population in 2016:')) {
          let parts = line.split(':');
          data.population = parts[parts.length-1].trim();
          break;
        }
      }
      //foreign born population.
      for (let line of lines) {
        if (line.includes('Foreign born population:')) {
          data.foreign_born_pct = line.split('(')[1].split(')')[0];
          data.foreign_born = line.split(':')[1].split('(')[0].trim();
          break;
        }
      }

      //median household income
      for (let line of lines) {
        if (line.includes('Estimated median household income in 2016:')) {
          data.median_household_income = line.split(':')[2]
            .replace('Texas','')
            .replace('California', '')
            .replace('Nevada', '')
            .replace('New Mexico', '')
            .replace('Colorado', '')
            .replace('North Carolina', '')
            .replace('Washington', '')
            .replace('Oregon', '')
            .replace('Florida', '');
          break;
        }
      }

      //median house or condo value
      for (let line of lines) {
        if (line.includes('Estimated median house or condo value in 2016')) {
          data.median_home_price = line.split(':')[1].trim();
          break;
        }
      }

      //population density
      for (let line of lines) {
        if (line.includes('Population density:')) {
          data.population_density = line.split(':')[1].split(' ')[1];
          break;
        }
      }

      //land area
      for (let line of lines) {
        if (line.includes('Land area:')) {
          data.land_area = line.split(':')[1].split(' ')[1].trim();
          break;
        }
      }

      //median age
      for (let line of lines) {
        if (line.includes('Median resident age:This zip code:')) {
          data.median_age = line.split(':')[2].split(' ')[0];
          break;
        }
      }

      //white
      for (let line of lines) {
        if (line.includes('White population')) {
          data.white = line.replace('White population', '');
          break;
        }
      }

      //black
      for (let line of lines) {
        if (line.includes('Black population')) {
          data.black = line.replace('Black population', '');
          break;
        }
      }

      //hispanic or latino
      for (let line of lines) {
        if (line.includes('Hispanic or Latino population')) {
          data.hispanic = line.replace('Hispanic or Latino population', '');
          break;
        }
      }

      //asian
      for (let line of lines) {
        if (line.includes('Asian population')) {
          data.asian = line.replace('Asian population', '');
          break;
        }
      }

      //native american
      for (let line of lines) {
        if (line.includes('American Indian population')) {
          data.native_american = line.replace('American Indian population', '');
          break;
        }
      }

      //male/female
      for (let line of lines) {
        if (line.startsWith('Males')) {
          data.male_pct = line.split('(')[1].split(')')[0].trim();
          data.female_pct = line.split('(')[2].split(')')[0].trim();
          break;
        }
      }

      //cost of living index
      for (let line of lines) {
        if (line.includes('cost of living index in zip code')) {
          data.cost_of_living_index = line.split(':')[1].split(' ')[1];
          break;
        }
      }

      //poverty
      for (let i=0; i<lines.length; i++) {
        let line = lines[i];
        if (line.includes('Residents with income below the poverty level in 2016:')) {
          data.poverty = lines[i+1].split(':')[1].replace('Whole state', '');
        }
      }

      //bachelors
      for (let line of lines) {
        if (line.includes('Bachelor\'s degree or higher:')) {
          data.bachelors_degree = line.split(':')[2].split('%')[0].trim() + '%';
          break;
        }
      }

      //graduate
      for (let line of lines) {
        if (line.includes('Graduate or professional degree:')) {
          data.graduate_degree = line.split(':')[3].split('%')[0].trim() + '%';
          break;
        }
      }

      //hs diploma
      for (let line of lines) {
        if (line.includes('High school or higher:')) {
          data.hs_diploma = line.split(':')[1].split('%')[0].trim() + '%';
          break;
        }
      }

      //mean time to work
      for (let line of lines) {
        if (line.includes('Mean travel time to work')) {
          if (line && line.split(':').length > 5) {
            data.mean_travel_to_work = line.split(':')[5].split(' ')[1];
          }
          break;
        }
      }

      //average household size
      for (let line of lines) {
        if (line.includes('Average household size:')) {
          data.household_size = line.split(':')[2].split(' ')[0];
          break;
        }
      }

      // commuter data
      for (let line of lines) {
        if (line.includes('Drove a car alone')) {
          data.transport_auto_alone = line.split('%')[0].split(' ').pop().replace(zip_code, '') + '%';
        } else if (line.includes('Bus or trolley bus')) {
          data.transport_bus_trolley = line.split('%')[0] + '%';
        } else if (line.includes('Carpooled')) {
          data.transport_carpool = line.split('%')[0] + '%';
        }
      }
  }).then(writeData.bind(null, data, doNextZipCode));
};

let zipCodes = [];

const readZipCodes = (callback) => {
  fs.readFile(INPUT_FILE_NAME, 'utf8', (err, data) => {
    if (err) throw err;
    let lines = data.split('\n');
    lines.forEach((line) => {
      if (line.length > 0) {
        zipCodes.push({
          zip_code: line.trim(),
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

const doNextZipCode = () => {
  let nextZipCode = zipCodes.shift();
  if (nextZipCode) {
    setTimeout(
      processZipCode.bind(null, nextZipCode.zip_code), THROTTLE_PERIOD)
  } else {
    fs.open(OUTPUT_FILE_NAME, 'a', (err, fd) => {
      if (err) throw err;
      fs.appendFile(fd, ']\n', 'utf8', (err) => {
        if (err) throw err;
        fs.close(fd, (err) => {
          if (err) throw err;
          fs.readFile(OUTPUT_FILE_NAME, 'utf8', (err, data) => {
            if (err) throw err;
            let jsonOutput = json2csv({
              data: eval(data)
            }) + '\n';
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
            doNextZipCode();
          });
        });
      });
    } else {
      doNextZipCode();
    }
  });
};

readZipCodes(checkOutputFileExits);
