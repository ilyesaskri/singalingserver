// getting dom elements
var divRoomSelection = document.getElementById('roomSelection');
var divMeetingRoom = document.getElementById('meetingRoom');
var inputRoom = document.getElementById('room');
var inputName = document.getElementById('name');
var btnRegister = document.getElementById('register');

// variables
var roomName;
var userName;
var participants = {};

// Let's do this
var socket = io();

btnRegister.onclick = function () {
    roomName = inputRoom.value;
    userName = inputName.value;
    if (roomName === '' || userName === '') {
        alert('Room and Name are required!');
    } else {
        fetch('http://192.168.1.254:8081/validate/' + userName + '/' + roomName, {
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => response.text())
            .then(response => JSON.parse(response))
            .then(response => {
                if (response.isAuth) {
                    console.log("user authorized")
                    var message = {
                        event: 'joinRoom',
                        userName: userName,
                        roomName: roomName
                    }
                    sendMessage(message);
                    divRoomSelection.style = "display: none";
                    divMeetingRoom.style = "display: block";
                } else {
                    console.log("user not auth")
                    alert('You are not authorized to access this');

                }
            })
        // .then(text => console.log(text))

        // var message = {
        //     event: 'joinRoom',
        //     userName: userName,
        //     roomName: roomName
        // }
        // sendMessage(message);
        // divRoomSelection.style = "display: none";
        // divMeetingRoom.style = "display: block";
    }
}

// messages handlers
socket.on('message', message => {
    console.log('Message received: ' + message.event);

    switch (message.event) {
        case 'newParticipantArrived':
            receiveVideo(message.userid, message.username);
            break;
        case 'existingParticipants':
            onExistingParticipants(message.userid, message.existingUsers);
            break;
        case 'receiveVideoAnswer':
            onReceiveVideoAnswer(message.senderid, message.sdpAnswer);
            break;
        case 'candidate':
            addIceCandidate(message.userid, message.candidate);
            break;
    }
});

// handlers functions
function receiveVideo(userid, username) {
    var video = document.createElement('video');
    var div = document.createElement('div');
    div.className = "videoContainer";
    var name = document.createElement('div');
    video.id = userid;
    video.autoplay = true;
    name.appendChild(document.createTextNode(username));
    div.appendChild(video);
    div.appendChild(name);
    divMeetingRoom.appendChild(div);

    var user = {
        id: userid,
        username: username,
        videoo: video,
        rtcPeer: null //rtcPeer pour etablir une connexion WebRTC
    }

    participants[user.id] = user;
    //initialiser  l'instance rtcPeer
    var options = {
        remoteVideo: video,
        onicecandidate: onIceCandidate //appeler lorsqu'un ICEcandidate sera trouvé
    }
    /////
    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer);
        }
    );

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onExistingParticipants(userid, existingUsers) {// les utilisateurs existants vont communiquer avec un nouveau utilisateur
    var video = document.createElement('video');
    var div = document.createElement('div');
    div.className = "videoContainer";
    var name = document.createElement('div');
    video.id = userid;
    video.autoplay = true;
    name.appendChild(document.createTextNode(userName));
    div.appendChild(video);
    div.appendChild(name);
    divMeetingRoom.appendChild(div);

    var user = {
        id: userid,
        username: userName,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var constraints = {
        audio: true,
        video: {
            mandatory: {
                maxWidth: 320,
                maxFrameRate: 15,
                minFrameRate: 15
            }
        }
    };

    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: onIceCandidate
    }

    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer)
        }
    );

    existingUsers.forEach(function (element) {
        receiveVideo(element.id, element.name);
    });

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onReceiveVideoAnswer(senderid, sdpAnswer) {
    participants[senderid].rtcPeer.processAnswer(sdpAnswer);
}

function addIceCandidate(userid, candidate) {
    participants[userid].rtcPeer.addIceCandidate(candidate);
}

// utilities
function sendMessage(message) {
    console.log('sending ' + message.event + ' message to server');
    socket.emit('message', message);
}


async function fetchAuth(username, roomId) {
    let resp = {}
    let repppp = await fetch('http://localhost:8081/validate/' + username + '/' + roomId, {
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => resp = response)
        .then(response => response.text())
        .then(text => console.log(text))
        .then(text => { return text })

    console.log(("resssssssssssss"), repppp);
    return resp;
}