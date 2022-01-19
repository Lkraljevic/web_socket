//HTML Stuff
var callBtn = document.getElementById('call');
var localVideo = document.getElementById('local');
var remoteVideo = document.getElementById('remote');
var deviceSelector = document.getElementById('deviceSelector');


// Globals
var peerConnection = null;
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}


var connection = null; 
if(location.protocol == "http:") {
    connection = new WebSocket(`ws://${location.host}`);
} else if(location.protocol == "https:") {
    connection = new WebSocket(`wss://${location.host}`);
}



callBtn.onclick = ()=>{ 
    call() 
};



// WebRTC HELPER FUNCTIONS
const createLocalStream = async () => {
    const constraints = {
        "audio": true, 
        "video": {
            'deviceId': deviceSelector.value,
            'width': 1920,
            'height': 1080
        }
    }
    // var localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    var localStream = await navigator.mediaDevices.getUserMedia(constraints)

    // add localStream as localVideo source
    localVideo.srcObject = localStream;

    return localStream;
}
const createPeer = async () => {

    peerConnection = new RTCPeerConnection(configuration);

    // Add events
    peerConnection.onicecandidate = peerEventHandler_onicecandidate;
    peerConnection.onnegotiationneeded = peerEventHandler_onnegotiationneeded;
    peerConnection.ontrack = peerEventHandler_ontrack;
}
const listDevices = async ()=> {   
    var devices = await navigator.mediaDevices.enumerateDevices()
    devices = devices.filter(device => device.kind === "videoinput");
    
    for(var i = 0; i<devices.length; i++) {
        var opt = document.createElement('option');
        opt.value = devices[i].deviceId;
        opt.innerHTML = devices[i].label;
        deviceSelector.appendChild(opt)
    }
}
const createOffer = async() => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
}
const call = async() => {
    await createPeer();
    var localStream = await createLocalStream();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

// Peer Events Handlers
const peerEventHandler_onicecandidate = (e) => {
    console.log("peerEventHandler_onicecandidate");
    if(e.candidate) {
        connection.send(JSON.stringify({
            type:"ICE-CANDIDATE",
            payload: e.candidate
        }))
    }
}
const peerEventHandler_onnegotiationneeded = async () => {
    // Create OFFER and send it to SS
    console.log("peerEventHandler_onnegotiationneeded");
    const offer = await createOffer();
    connection.send(JSON.stringify({
        type:"OFFER",
        payload: offer
    }))

}
const peerEventHandler_ontrack = (e) => {
    // Add remote track
    console.log("peerEventHandler_ontrack")
    remoteVideo.srcObject = e.streams[0];   
}

// Websocket Events Handlers
const handle_answer = async (answer) => {
    const remoteDesc = new RTCSessionDescription(answer);
    await peerConnection.setRemoteDescription(remoteDesc)
}
const handle_offer = async (offer) => {
    await createPeer();
    const remoteDesc = new RTCSessionDescription(offer);
    await peerConnection.setRemoteDescription(remoteDesc);

    var localStream = await createLocalStream();
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    connection.send(JSON.stringify({
        type: "ANSWER",
        payload: answer
    }))
}
const handle_ice_candidates = async(candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    await peerConnection.addIceCandidate(iceCandidate)
}


// WebSocket 
connection.onopen = function (event) {
    console.log("connection.onopen", event)
    // alert("connection.onopen")
    listDevices();
};

connection.onmessage = function (event) {
    
    var data = JSON.parse(event.data);
    var {type, payload} = data
    switch(type) {
        case "OFFER":
            handle_offer(payload)
        break;
        case "ANSWER":
            handle_answer(payload)
        break;
        case "ICE-CANDIDATE":
            handle_ice_candidates(payload)
        break;
    }
}
