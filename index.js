console.log('Loading function');
var oracle = require('./functions.js');

/**
 * Oracle Chat bot
 */
exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    var botName ="@Oracle";
    var botNameLower ="@oracle";

    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? err.message : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    switch (event.httpMethod) {

        case 'POST':
            var data = JSON.parse(event.body);
            var names = data.name.trim().split(" ");
            if (data.text.indexOf(botName) == 0 || data.text.indexOf(botNameLower) == 0){
                    var text = data.text.replace(botName, "").trim();
                    text = text.replace(botNameLower, "").trim();
                    oracle(text, names[0]);
            }
            else
            {
                done(new Error("No post message sent"));
            }
            break;
        default:
            done(new Error(`Unsupported method "${event.httpMethod}"`));
    }
};

oracle("/stock msft /time intraday", "Basil");