/**
 * Created by bak on 14/07/2015.
 */
$(document).ready(function(){
    $('#content').hide()
    $('body').css('height',$(window).height());
})

var socket = io();
$('#chatBox').submit(function(){
    socket.emit('new mess',$('#m').val().trim())
    socket.emit('stop typing')
    $('#m').val('')
    return false;
});
// When user typing
$('#m').keypress(function(){
    socket.emit('typing')
})
//Get a new username
$('#usrName').submit(function(){
    socket.emit('add user',$('#usr').val().trim())
    $('#usrName').hide()
    $('#content').fadeIn('slow')
    return false;
})

// When database cannot connect
socket.on('failed database',function(){
    alert('Failed to connect to database. You can keep chatting but no chat log will be recorded.')
})
// When someone is typing
socket.on('typing',function(user){
    $('.typing').remove()
    $('#messages').append('<li class="typing"><span >'+user+'</span> is typing ...</li>')
})
// When someone stopped typing
socket.on('stop typing',function(){
    $('.typing').remove()
})
// When a new message is received
socket.on('new mess', function(msg){
    console.log(msg)
    // Include Emoticons
    function addEmo (obj,cb){
        obj.content = obj.content.replace('<','&lt;')
        obj.content = obj.content.replace('>','&gt;')
        obj.content = obj.content.replace('/','&sol;')
        for (var i in obj.emo){
            obj.content = obj.content.replace(i,'<img src="'+obj.emo[i]+'" alt="'+i+'">');break
        }
        cb(obj.content)
    }
    //
    $('#messages').append("<li><span class='name'>"+msg.user+"</span><span class='nextMess mess-content'></span>"+"</li>")
    addEmo(msg,function(data){
        $('.nextMess').append(data).removeClass('nextMess')
//                $('.mess-content').val().replace('')
    })
});