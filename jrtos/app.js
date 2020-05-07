/*
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var monk = require('monk');
var db = monk('localhost:27017/jrtos');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var administratorRouter = require('./routes/administrator');
var parentRouter = require('./routes/parent');
var teacherRouter = require('./routes/teacher');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req,res,next){
  req.db = db;
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/administrator', administratorRouter);
app.use('/parent', parentRouter);
app.use('/teacher', teacherRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

*/

/*  EXPRESS SETUP  */

const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(express.static(__dirname));

const bodyParser = require('body-parser');
const expressSession = require('express-session')({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSession);

const port = process.env.PORT || 3000;
//app.listen(port, () => console.log('App listening on port ' + port));
var server = http.listen(3000, () => {
    console.log('server is running on port', server.address().port);
});

/*  PASSPORT SETUP  */

const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

/* MONGOOSE SETUP */

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

mongoose.connect('mongodb://localhost/jrtos', { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;
const UserDetail = new Schema({
  username: String,
  password: String
});

var Message = mongoose.model('Message',{
    name : String,
    message : String,
    date : String,
})

Message.deleteMany({}, function (err) {
    if(err) console.log(err);
    console.log("Successful deletion");
});

UserDetail.plugin(passportLocalMongoose);
const UserDetails = mongoose.model('userInfo', UserDetail, 'userInfo');

// UserDetails.deleteMany({}, function (err) {
//     if(err) console.log(err);
//     console.log("Successful deletion");
// });

/* PASSPORT LOCAL AUTHENTICATION */

passport.use(UserDetails.createStrategy());

passport.serializeUser(UserDetails.serializeUser());
passport.deserializeUser(UserDetails.deserializeUser());

/* ROUTES */

const connectEnsureLogin = require('connect-ensure-login');

app.post('/login', (req, res, next) => {
  passport.authenticate('local',
      (err, user, info) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect('/login?info=' + info);
        }

        req.logIn(user, function(err) {
          if (err) {
            return next(err);
          }
          if (user.username=="Teacher")
              return res.redirect('/teacher');
          else if (user.username=="Parent")
              return res.redirect('/parent');
          else
              return res.redirect('/');
        });

      })(req, res, next);
});

app.get('/login',
    (req, res) => res.sendFile('views/homehtml/index.html',
        { root: __dirname })
);

app.get('/chat',
    (req, res) => res.sendFile('views/homehtml/chat.html',
        { root: __dirname })
);

app.get('/',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.sendFile('views/homehtml/private.html', {root: __dirname})
);

app.get('/teacher',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.sendFile('views/homehtml/teacher.html', {root: __dirname})
);

app.get('/parent',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.sendFile('views/homehtml/parent.html', {root: __dirname})
);

app.get('/studentportfolio',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.sendFile('views/homehtml/studentportfolio.html', {root: __dirname})
);

app.get('/private',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.sendFile('html/private.html', {root: __dirname})
);

app.get('/user',
    connectEnsureLogin.ensureLoggedIn(),
    (req, res) => res.send({user: req.user})
);

//REGISTER  USERS

/*
UserDetails.register({username:'Admin', active: false}, 'admin');
UserDetails.register({username:'Teacher', active: false}, 'teacher');
UserDetails.register({username:'Parent', active: false}, 'parent');
*/


app.get('/messages', (req, res) => {
    Message.find({},(err, messages)=> {
        res.send(messages);
    })
})

app.get('/messages/:user', (req, res) => {
    var user = req.params.user
    Message.find({name: user},(err, messages)=> {
        res.send(messages);
    })
})

app.post('/messages', async (req, res) => {
    try{
        var message = new Message(req.body);
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var mTime = date+' '+time;
        message.date = mTime.toString();
        var savedMessage = await message.save()
        console.log('saved');

        var censored = await Message.findOne({message:'badword'});
        if(censored)
            await Message.remove({_id: censored.id})
        else
            io.emit('message', req.body);
        res.sendStatus(200);
    }
    catch (error){
        res.sendStatus(500);
        return console.log('error',error);
    }
    finally{
        console.log('Message Posted')
    }

})

io.on('connection', () =>{
    console.log('a user is connected')
})



/*
var express = require('express'); //
var bodyParser = require('body-parser')//
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

app.use(express.static(__dirname));//
app.use(bodyParser.json());//
app.use(bodyParser.urlencoded({extended: false}))//?

var Message = mongoose.model('Message',{
    name : String,
    message : String,
    date : String,
})

Message.deleteMany({}, function (err) {
    if(err) console.log(err);
    console.log("Successful deletion");
});

var dbUrl = 'mongodb://localhost:27017/jrtos'

app.get('/messages', (req, res) => {
    Message.find({},(err, messages)=> {
        res.send(messages);
    })
})

app.get('/messages/:user', (req, res) => {
    var user = req.params.user
    Message.find({name: user},(err, messages)=> {
        res.send(messages);
    })
})

app.post('/messages', async (req, res) => {
    try{
        var message = new Message(req.body);
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var mTime = date+' '+time;
        message.date = mTime.toString();
        var savedMessage = await message.save()
        console.log('saved');

        var censored = await Message.findOne({message:'badword'});
        if(censored)
            await Message.remove({_id: censored.id})
        else
            io.emit('message', req.body);
        res.sendStatus(200);
    }
    catch (error){
        res.sendStatus(500);
        return console.log('error',error);
    }
    finally{
        console.log('Message Posted')
    }

})

io.on('connection', () =>{
    console.log('a user is connected')
})

mongoose.connect(dbUrl ,{useMongoClient : true} ,(err) => {
    console.log('mongodb connected',err);
})

var server = http.listen(3000, () => {
    console.log('server is running on port', server.address().port);
});

 */