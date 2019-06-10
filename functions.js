var fs = require('fs');
var request = require('request');
var keys = require('./keys.js');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

const customSearchUrl = "https://www.googleapis.com/customsearch/v1";
const groupmeUrl = "https://api.groupme.com/v3/bots/post";
const groupmeImageUrl = "https://image.groupme.com/pictures";
const wolframURL = "http://api.wolframalpha.com/v2/query";

const searchType = {
    image: "image",
    search: "search"
};

const imgType = {
    gif: "gif",
    img: "img"
};

const messageType = {
    message: "message",
    image: "image"
};

function postMessageToGroupMe(text, type){
    var data = {
        bot_id: keys.botId
    }

    if(type === messageType.image){
        data.picture_url = text;
    }
    else{
        data.text = text
    }

    var options = {
        uri: groupmeUrl,
        method: 'POST',
        json: data
    };

    request(options, function (error, response, body) {
        console.log(response.statusCode);
    });
}

function imagePostProcess(results){
    var index = Math.floor(Math.random()*results.length);
    var url = results[index].link;
    var options = {
        method: 'GET',
        url: url,
        encoding: null
    };
    request(options, function(err, response, data) {
        if(response.statusCode == 200){
            var options = {
                url: groupmeImageUrl,
                method: 'POST',
                headers: {
                    'Content-Type': response.headers['content-type'],
                    'X-Access-Token': keys.groupMeToken
                },
                body: data
            };

            request(options, function(err, response, data) {
                if(response.statusCode == 200){
                    data = JSON.parse(data);
                    postMessageToGroupMe(data.payload.picture_url, messageType.image);
                }
            });
        }
        else{
            postMessageToGroupMe("I could not find a gif to match your request ", messageType.message);
        }
    });  
}

function askOracle(){
    let fortunes = [
    "It is certain", 
    "It is decidedly so", 
    "Without a doubt", 
    "Yes definitely", 
    "You may rely on it", 
    "As I see it, yes", 
    "Most likely", 
    "Outlook good", 
    "Yes", 
    "Signs point to yes", 
    "Reply hazy try again", 
    "Ask again later", 
    "Better not tell you now", 
    "Cannot predict now", 
    "Concentrate and ask again", 
    "Don't count on it", 
    "My reply is no", 
    "My sources say no", 
    "Outlook not so good", 
    "Very doubtful"];
    var index = Math.floor(Math.random()*fortunes.length);
    return fortunes[index];
}

function googleSearch(query, type, callback){
    query = query.replace(" ", "+");
    var data = {
        'key': keys.apiKey,
        'cx': keys.cx, 
        'q': query
    }
    if(type.type === searchType.image){
        data.searchType = "image";
        data.imgType = "photo";
        if(type.imgType === imgType.gif){
            data.fileType = imgType.gif;
            data.hq = "animated";
        }
    }
    request.get({url: customSearchUrl, qs: data}, callback);
}

function askWolframAlpha(query, callback){
    var data = {
        appid: keys.wolframId, 
        input: query, 
        format: "plaintext"
    };
    request.get({url: wolframURL, qs: data}, function(err, response, data) {
        var result = null;
        if(response.statusCode === 200){
            var doc = new dom().parseFromString(data);
            var nodes = xpath.select('/queryresult[@success="true"]/pod[@title="Result"]/subpod[@title=""]/plaintext', doc);
            if(nodes.length > 0 && nodes[0].hasOwnProperty('childNodes')){
                result = nodes[0].childNodes[0].data;    
            }
        }
        callback(result);
    });
}

function oracle(text, name){
    if (text.indexOf("/gif") === 0){
        text = text.replace("/gif", "").trim();
        googleSearch(text, {type: "image", imgType: imgType.gif}, function(err, response, data) {
            data = JSON.parse(data);
            if(response.statusCode === 200 && data.items.length > 0){
                imagePostProcess(data.items);
            }
            else{
                postMessageToGroupMe("I could not find a gif to match your request " + name, messageType.message);
            }
            
        });
    }
    else if(text.indexOf("/fortune") === 0){
        postMessageToGroupMe(askOracle());
    }
    else if(text.indexOf("/img") === 0 || text.indexOf("/image") === 0){
        text = text.replace("/img", "").trim();
        text = text.replace("/image", "").trim();
        googleSearch(text, {type: "image", imgType: imgType.img}, function(err, response, data) {
            data = JSON.parse(data);
            if(response.statusCode === 200 && data.items.length > 0){
                imagePostProcess(data.items);
            }
            else{
                postMessageToGroupMe("I could not find a gif to match your request " + name, messageType.message);
            }
            
        });
    }
    else if(text.indexOf("/question") === 0){
            text = text.replace("/question", "").trim();
            askWolframAlpha(text, function(result){
                if(result != null || result != undefined){
                    postMessageToGroupMe(result, messageType.message);
                }
                else
                {
                    googleSearch(text, {type: searchType.search}, function(err, response, data) {
                        data = JSON.parse(data);
                        if(response.statusCode === 200 && data.items.length > 0){
                            var url = data.items[0].link;
                            var snippet = data.items[0].snippet;
                            var result = snippet + "\n" + url;
                            postMessageToGroupMe(result, messageType.message);
                        }
                        else{
                            postMessageToGroupMe("I could not find the answer to that question ".name, messageType.message);
                        }
                        
                    });
                }
            });
    }
    else if(text.indexOf("help") === 0){
        fs.readFile("help.txt", function (err, data) {
            postMessageToGroupMe(data.toString(), messageType.message);
        }); 
    }

}