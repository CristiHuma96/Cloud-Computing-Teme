var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var index = require('./routes/index');
var users = require('./routes/users');
var fs = require('fs');
var ping = require('ping');
var hosts = ['api.github.com', 'l2.io', 'api.ip2country.info', 'holidayapi.com'];
var jsonfile = require('jsonfile');
var countries = '';
var clienti = 0;
jsonfile.readFile(path.join(__dirname,'public/documents/countries.json'), function(err, obj) {
    countries = obj;
});

var app = express();

let accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger(':date[web] :method :url :status :response-time', {stream: accessLogStream}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);


setInterval(function() {
    accessLogStream.write('\n\n------------------------------CHECKING APIS------------------------------\n')
    hosts.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        msg = new Date().toUTCString() + ' ';
        msg += isAlive ? 'host ' + host + ' is alive\n' : 'host ' + host + ' is dead\n';
        accessLogStream.write(msg);
    });
});
    let msg = new Date().toUTCString() + ' ';
    msg += 'Number of clients = ' + clienti + '\n';
    accessLogStream.write(msg)
},
    60000);

app.post('/holidays', function (req, res) {
    clienti += 1;
    let current_IP = req.connection.remoteAddress;
    let userName = req.body.userName;
    let options = '';
    if(userName !== 'cristihuma96') {
         options = {
            url: `https://api.github.com/users/${userName}/repos`,
            headers: {
                'User-Agent': 'Cristi Huma'
            }
        };
    }
    else {
        options = {
            url: `https://api.github.com/user/repos`,
            headers: {
                'User-Agent': 'Cristi Huma',
                'Authorization': 'token d5f38f8942cb417206443fe71e5a691cc8b9567b'
            }
        };
    }

    //get the creation dates of the repos
    let repos_creation_dates = [];
    let current_country = '';
    let url = options['url'];
    request(options, function (err, response, body) {
        log_response(url,response.statusCode);
        if (err) {
            res.render('index', {weather: null, error: 'Error, please try again'});
        } else {
            let repos = JSON.parse(body);
            let length = repos.length;
            for (var i = 0; i < length; i++) {
                creation_date = repos[i]['created_at'].substring(0, 7);
                repo_name = repos[i]['name'];
                if (!repos_creation_dates.includes(creation_date))
                    repos_creation_dates.push([creation_date + ' -> ' + repo_name])
            }
            // get the current IP
            url = 'https://l2.io/ip';
            request(url, function (err, response, body) {
                log_response(url,response.statusCode);
                if (err) {
                    res.render('index', {weather: null, error: 'Error, please try again'});
                } else {
                    if(current_IP === '::1')
                        current_IP = body;
                    //get the country based on IP
                    url = 'https://api.ip2country.info/ip?' + current_IP;
                    request(url, function (err, response, body) {
                        log_response(url,response.statusCode);
                        if (err) {
                            res.render('index', {weather: null, error: 'Error, please try again'});
                        } else {
                            current_country = JSON.parse(body);
                            res.render('holidays', {creation_dates: repos_creation_dates,
                                country: current_country,all_countries: countries});
                        }
                    });
                }
            });

        }
    });
});

app.post('/jackpot', function (req, res) {
    let picked_date = req.body.creation_date;
    let countryCode = req.body.country.substring(0,2);
    let year = picked_date.substring(0,4);
    let month = picked_date.substring(5,7);
    let url = 'https://holidayapi.com/v1/holidays?key=7510c176-fe63-46c2-b3cf-2952053c6e30&country='
        + countryCode + '&year=' + year +'&month=' + month;
    request(url, function (err, response, body) {
        public_url = 'https://holidayapi.com/v1/holidays?key=X&country='
        + countryCode + '&year=' + year +'&month=' + month;
        log_response(public_url,response.statusCode);
        if (err) {
            res.render('index', {weather: null, error: 'Error, please try again'});
        } else {
            let holidays = JSON.parse(body);
            holidays = holidays['holidays'];
            let title ='';
            if (typeof holidays !== 'undefined' && holidays.length > 0 && response.statusCode === '200')
                title = 'JACKPOT';
            else
                title = 'No holidays found!';
            res.render('jackpot', {Title: title, holidays: holidays});
        }
    });
});

function log_response(url, status) {
    data_log = new Date().toUTCString() + ' ';
    data_log += 'GET' + ' ';
    data_log += url + ' ';
    data_log += status + '\n';
    accessLogStream.write(data_log)
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
