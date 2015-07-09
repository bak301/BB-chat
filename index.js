/**
 * Created by bak on 09/07/2015.
 */
var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var userList=[];
var usrNumber = 0;

app.use(express.static(__dirname+'/html'))

io.on('connection', function (socket) {
    console.log('An user connected!: '+socket.id)
    socket.on('disconnect',function(){
        console.log('An user disconnected!: '+socket.id)
    })
    socket.on('add user',function(name){
        userList[usrNumber] = {
            "usrId":socket.id,
            "usrName": name
        };
        io.emit('new user',userList[usrNumber])
        usrNumber++;
        console.log("new user: "+name)
    })
    socket.on('new mess',function(mess){
        for (var i in userList){
            if (userList[i].usrId == socket.id){
                console.log('New mess from '+userList[i].usrName+': '+mess)
                io.emit('new mess','<span class="name">'+userList[i].usrName+'</span>'+": "+mess)
            }
        }
    })
})

server.listen(3001, function () {
    console.log('Listen on port 3001!')
})