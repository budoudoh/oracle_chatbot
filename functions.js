var fs = require('fs');
var request = require('request');
var keys = require('./keys.js');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;

const customSearchUrl = "https://www.googleapis.com/customsearch/v1";
const groupmeUrl = "https://api.groupme.com/v3/bots/post";
const groupmeImageUrl = "https://image.groupme.com/pictures";
const wolframURL = "http://api.wolframalpha.com/v2/query";
const alphavantageURL = "https://www.alphavantage.co/query";
const chartingURL = "https://charting.nasdaq.com/ext/charts.dll";


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
    };

    if(type === messageType.image){
        data.picture_url = text;
    }
    else{
        data.text = text;
    }

    var options = {
        uri: groupmeUrl,
        method: 'POST',
        json: data
    };

    request(options, function (error, response, body) {
        if(response.statusCode <= 204){
            console.log(response.statusCode);
        }
        else{
            console.log(`Message post request failed with code ${response.statusCode} and message ${error}`);
        }

    });
}

function imagePostProcess(url){
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
                else{
                    console.log(`Image post request failed with code ${response.statusCode} and message ${err}`);
                    postMessageToGroupMe("I could not fetch the image to match your request.", messageType.message);
                }
            });
        }
        else{
            console.log(`Image fetch request failed with code ${response.statusCode} and message ${err}`);
            postMessageToGroupMe("I could not fetch the image to match your request.", messageType.message);
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
    };
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
        else{
            console.log(`Wolfram Alpha request failed with code ${response.statusCode} and message ${err}`);
        }
        callback(result);
    });
}

function getStockQuote(symbol, callback){
    var data = {
        'function': "GLOBAL_QUOTE",
        'symbol': symbol, 
        'apikey': keys.alphavantage
    }
    request.get({url: alphavantageURL, qs: data}, callback);
}

function createQuoteMessage(stock){
    var direction = "↑";
    if(parseFloat(stock['09. change']) < 0){
        direction = "↓";
    }
    return `${stock['01. symbol']} price: \$${parseFloat(stock['05. price']).toFixed(2)} change: ${parseFloat(stock['09. change']).toFixed(2)} ${direction} ${stock['10. change percent']}`;
}
module.exports = exports = function (text, name){
    if (text.indexOf("/gif") === 0){
        text = text.replace("/gif", "").trim();
        googleSearch(text, {type: "image", imgType: imgType.gif}, function(err, response, data) {
            data = JSON.parse(data);
            if(response.statusCode === 200 && data.items.length > 0){
                var results = data.items;
                var index = Math.floor(Math.random()*results.length);
                var url = results[index].link;
                imagePostProcess(url);
            }
            else{
                console.log(`Gif fetch request failed with code ${response.statusCode} and message ${err}`);
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
                var results = data.items;
                var index = Math.floor(Math.random()*results.length);
                var url = results[index].link;
                imagePostProcess(url);
            }
            else{
                console.log(`Image fetch request failed with code ${response.statusCode} and message ${err}`);
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
                            console.log(`Google Search request failed with code ${response.statusCode} and message ${err}`);
                            postMessageToGroupMe("I could not find the answer to that question ".name, messageType.message);
                        }
                        
                    });
                }
            });
    }
    else if(text.indexOf("/stock") === 0){
        text = text.replace("/stock", "").trim();
        var queries = text.split("/time");
        var symbol = queries[0].trim();
        getStockQuote(symbol, function(err, response, data) {
            data = JSON.parse(data);
            if(response.statusCode === 200 && data.hasOwnProperty("Global Quote")){
                var quote  = createQuoteMessage(data["Global Quote"]);
                postMessageToGroupMe(quote);
                if(queries.length == 2){
                    var time = queries[1].trim();
                    var imageToken = "";
                    if(time === "intraday"){
                        imageToken = `2-1-17-0-0-009001631-03NA000000${symbol.toUpperCase()}&WD=635-HT=395-`;
                    }
                    else{
                        time = time.split(" ");
                        if(time.length == 2){
                            if(time[1].toLowerCase() === "day" || time[1].toLowerCase() === "days"){
                                imageToken = `2-1-14-0-0-7${time[0]}-03NA000000${symbol.toUpperCase()}-&SF:1|5-BG=FFFFFF-BT=0-HT=395-`;
                            }
                            else if(time[1].toLowerCase() === "month" || time[1].toLowerCase() === "months"){                        
                                imageToken = `2-1-14-0-0-5${time[0]}-03NA000000${symbol.toUpperCase()}-&SF:1|5-BG=FFFFFF-BT=0-HT=395-`;
                            }
                            else if(time[1].toLowerCase() === "year" || time[1].toLowerCase() === "years"){                        
                                imageToken = `2-1-14-0-0-5${parseInt(time[0])*12}-03NA000000${symbol.toUpperCase()}-&SF:1|5-BG=FFFFFF-BT=0-HT=395-`;
                            }
                        }   
                    }
                    imagePostProcess(`${chartingURL}?${imageToken}`);
                }
            }
            else{
                console.log(`Stock quote request failed with code ${response.statusCode} and message ${err}`);
                postMessageToGroupMe("I could not find a quote to match your stock symbol" + name, messageType.message);
            }
            
        });
    }
    else if(text.indexOf("help") === 0){
        fs.readFile("help.txt", function (err, data) {
            if (err) 
                console.log(`Help file couldn't be opened: ${err}`);
            else
                postMessageToGroupMe(data.toString(), messageType.message);
        }); 
    }

}