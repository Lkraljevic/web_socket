'use strict';

const express = require('express');
const path = require('path');
const { createServer } = require('http');

const WebSocket = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, '/public')));

const server = createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function (ws) {
  
  ws.on('message', function message(message) {  
        
    var data = JSON.parse(message)
    var {type, payload} = data
    
    console.log("message", type)  
    wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) { 
            client.send(JSON.stringify(data));
        }
    })
});

  ws.on('close', function () {
  });
});

server.listen(8080, function () {
  console.log('Listening on http://0.0.0.0:8080');
});
