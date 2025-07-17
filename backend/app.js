var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var crmRouter = require('./routes/crm');
var appointmentsRouter = require('./routes/appointments');
var locationRouter = require('./routes/location');
var routesRouter = require('./routes/routes');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://10.1.10.170:3002',
    'http://192.168.1.170:3002',
    'http://localhost:3001' // Added to allow frontend on port 3001
  ],
  credentials: true
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', crmRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/location', locationRouter);
app.use('/api/routes', routesRouter);

module.exports = app;
