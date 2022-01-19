// HTML stuff
var remoteVideo = document.getElementById('remote');

// Globals
var peerConnection = null;
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}


var connection = null; 
if(location.protocol == "http:") {
    connection = new WebSocket(`ws://${location.host}`);
} else if(location.protocol == "https:") {
    connection = new WebSocket(`wss://${location.host}`);
}


const createPeer = async () => {
    peerConnection = new RTCPeerConnection(configuration);
    // Add events
    peerConnection.onicecandidate = peerEventHandler_onicecandidate;
    peerConnection.onnegotiationneeded = peerEventHandler_onnegotiationneeded;
    peerConnection.ontrack = peerEventHandler_ontrack;
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

    // See if this is called
    // const offer = await createOffer();
    // connection.send(JSON.stringify({
    //     type:"OFFER",
    //     payload: offer
    // }))
}
const peerEventHandler_ontrack = (e) => {
    // Add remote track
    console.log("peerEventHandler_ontrack")
    remoteVideo.srcObject = e.streams[0];   
    remoteVideo.requestFullscreen()
}


connection.onopen = function (event) {
    console.log("connection.onopen", event)
};
connection.onmessage = function (event) {
    
    var data = JSON.parse(event.data);
    var {type, payload} = data
    switch(type) {
        case "OFFER":
            handle_offer(payload)
        break;
        case "ICE-CANDIDATE":
            handle_ice_candidates(payload)
        break;
    }
}


const handle_ice_candidates = async(candidate) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    await peerConnection.addIceCandidate(iceCandidate)
}

const handle_offer = async (offer) => {
    await createPeer();
    const remoteDesc = new RTCSessionDescription(offer);
    await peerConnection.setRemoteDescription(remoteDesc);

    // var localStream = await createLocalStream();
    // localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    connection.send(JSON.stringify({
        type: "ANSWER",
        payload: answer
    }))
}