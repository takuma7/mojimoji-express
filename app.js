
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

host_for_client = app.get('env') == 'production' ? 'http://mojimoji.herokuapp.com/' : 'http://localhost';

app.get('/', routes.index);
app.get('/users', user.list);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Socket.io
var clients = {};
io.sockets.on('connection', function(socket){
  console.log(socket.id);
  clients[socket.id] = {};
  socket.broadcast.emit('user connected', {
    id: socket.id
  });
  socket.emit('setup', {clients:clients});
  socket.on('disconnect', function(){
    delete clients[socket.id];
    io.sockets.emit('user disconnected', {id: socket.id});
  });
  socket.on('move', function(data){
    clients[socket.id].x = data.x;
    clients[socket.id].y = data.y;
    clients[socket.id].vx = data.vx;
    clients[socket.id].vy = data.vy;
    socket.broadcast.emit('move', {
      id: socket.id,
      x: data.x,
      y: data.y,
      vx: data.vx,
      vy: data.vy});
  });
  socket.on('set text', function(data){
    console.log('set text: ' + data.text);
    clients[socket.id].text = data.text;
    socket.broadcast.emit('set text', {id:socket.id, text:data.text});
  });
});
