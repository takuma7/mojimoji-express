
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
var freq = 24;
var attackDuration = 3000; //[ms]
var chargeDuration = 3000; //[ms]
var shieldDuration = 3000; //[ms]

var endCharging = function(client){
  if(client.chargingTime >= chargeDuration){
    client.isAttackable = true;
    client.isCharging = false;
    client.chargingTime = 0;
  }else{
    client.isCharging = false;
  }
}

var endShielding = function(client){
  client.isShielding = false;
  client.shieldingTime = 0;
}

io.sockets.on('connection', function(socket){
  console.log(socket.id);
  clients[socket.id].id = socket.id;
  clients[socket.id] = {id: socket.id};
  clients[socket.id].r = 50;
  clients[socket.id].maxR = 50;
  clients[socket.id].minR = 10;
  clients[socket.id].name = 'player' + clients.length;

  clients[socket.id].isAttacking = false;
  clients[socket.id].attackCenterX = 0;
  clients[socket.id].attackCenterY = 0;
  clients[socket.id].attackR = 0;

  clients[socket.id].isCharging = false;
  clients[socket.id].chargingTime = 0;
  clients[socket.id].isAttackable = false;

  clients[socket.id].isShielding = false;
  clients[socket.id].shieldingTime = 0;

  clients[socket.id].hp = 100;

  // initialize
  socket.emit('init', {canvas: {width: width, height: height}, clients: clients});
  socket.broadcast.emit('client added', {id: socket.id, client: clients[socket.id]});

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
    // io.sockets.emit('gravity updated', {id:data.id, gx:data.gx, gy:data.gy});
  });

  socket.on('set name', function(data){
    clients[socket.id].name = data.name;
    socket.broadcast.emit('name updated', {id:socket.id, name:data.name});
  });

  // charging
  socket.on('start charging', function(data){
    if(clients[socket.id].isAttacking || clients[socket.id].isShielding) return;
    clients[socket.id].isCharging = true;
  });
  socket.on('end charging', function(data){
    endCharging(clients[socket.id]);
  });

  // shielding
  socket.on('start shielding', function(data){
    if(clients[socket.id].isCharging) return;
    clients[socket.id].isShielding = true;
  });

  socket.on('end shielding', function(data){
    endShielding(clients[socket.id]);
  });

  socket.on('attack', function(data){
    if(clients[socket.id].isAttackable){
      clients[socket.id].isAttacking = true;
    }
  });
});

var m = 10;
var friction = -0.9;

setInterval(function(){
  for(var id in clients){
    // manage position
    if( !clients[id].gx || !clients[id].gy || !clients[id].r) continue;
    if( !clients[id].x ){
      clients[id].x = width/2;
      clients[id].y = height/2;
    }
    if( !clients[id].vx ){
      clients[id].vx = 0;
      clients[id].vy = 0;
    }
    var gx = clients[id].gx;
    var gy = clients[id].gy;
    var vx = clients[id].vx;
    var vy = clients[id].vy;
    var x  = clients[id].x;
    var y  = clients[id].y;
    var r  = clients[id].r;

    vx += gx;
    vy -= gy;
    x  += vx;
    y  += vy;

    if( x + r > width ){
      x = width - r;
      vx *= friction;
    }
    if( x - r < 0 ){
      x = r;
      vx *= friction;
    }
    if( y + r > height){
      y = height - r;
      vy *= friction;
    }
    if( y - r < 0){
      y = r;
      vy *= friction;
    }

    clients[id].vx = vx;
    clients[id].vy = vy;
    clients[id].x  = x;
    clients[id].y  = y;

    // manage charge
    if(clients[id].isCharging){
      clients[id].chargingTime += 1000/freq;
      if(clients[id].chargingTime >= chargingDuration){
        endCharging(clients[id]);
      }
    }
    // manage shield
    if(clients[id].isShielding){
      clients[id].shieldingTime += 1000/freq;
      if(clients[id].shieldingTime >= shiedDuration){
        endShielding(clients[id]);
      }
    }
    // manage attack
    if(clients[id].isAttacking && clients[id].isAttackable){
      clients[id].isAttackable = false;
      clients[id].attackCenterX = x;
      clients[id].attackCenterY = y;
      clients[id].attackR = 0;
    }
    if(clients[id].isAttacking && !clients[id].isAttackable){
      clients[id].attackR += 1000.0/clients[id].r;
      clients[id].attackingTime += 1000/freq;
      if(clients[id].attackR >= attackDuration){
        clients[id].isAttacking = false;
        clients[id].isAttackable = false;
        clients[id].attackR = 0;
      }else{
        for(var otherId in clients){
          if(id == otherId) continue;
          if( !clients[id].gx || !clients[id].gy || !clients[id].r) continue;
          var dx = clients[id].attackX - clients[otherId].x;
          var dy = clients[id].attackY - clients[otherId].y;
          var dist = dx*dx + dy*dy;
          var dnear = clients[id].attackR - clients[otherId].r;
          dnear *= dnear;
          var dfar = clients[id].attackR + clients[otherId].r;
          dfar *= dfar;
          if( dist > dnear && dist < dfar && !clients[otherId].isShielding){
            clients[otherId].hp -= 1;
            clients[otherId].r = clients[otherId].minR + (clients[otherId].maxR - clients[otherId].minR)*clients[otherId].hp/100
          }
        }
      }
    }
  }
  io.sockets.emit('update', {clients: clients});
}, 1000/freq);
