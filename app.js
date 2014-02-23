
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server)

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

current_environment = app.get('env');

app.get('/', routes.index);
app.get('/users', user.list);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Socket.io
// if('production' == app.get('env')){
  // io.configure(function () {
    // io.set("transports", ["xhr-polling"]);
    // io.set("polling duration", 10);
  // });
// }
var clients = {};
var width = 800;
var height = 600;
var m = 10;
var freq = 24;

io.sockets.on('connection', function(socket){
  console.log(socket.id);
  clients[socket.id] = {id: socket.id};

  socket.emit('init', {canvas: {width: width, height: height}, clients: clients});
  socket.broadcast.emit('client added', {id: socket.id});

  socket.on('disconnect', function(){
    delete clients[socket.id];
    io.sockets.emit('client deleted', {id: socket.id});
  });

  socket.on('set radius', function(data){
    clients[socket.id].r = data.r;
    socket.broadcast.emit('radius updated', {id: socket.id, r: data.r});
  });

  socket.on('set gravity', function(data){
    console.log(data);
    clients[socket.id].gx = data.gx;
    clients[socket.id].gy = data.gy;
    io.sockets.emit('gravity updated', {id:data.id, gx:data.gx, gy:data.gy});
  });

  socket.on('set message', function(data){
    clients[socket.id].message = data.message;
    socket.broadcast.emit('update message', {id:socket.id, message:data.message});
  });
});

